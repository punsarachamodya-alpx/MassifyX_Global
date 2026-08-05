'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const store = require('./lib/store');
const mailer = require('./lib/mailer');
const misClient = require('./lib/misClient');
const warroomAuth = require('./lib/warroomAuth');
const warroomClient = require('./lib/warroomClient');
const warroomContract = require('./lib/warroomContract');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
// The MassifyX Intelligence Service (MIS) — a separate, independently
// deployed microservice. Unset in dev by default: /live degrades cleanly
// with no MIS_BASE_URL configured, same as it would if MIS were down.
const MIS_BASE_URL = process.env.MIS_BASE_URL || '';
// The War Room investigation service — a third, separate microservice (see
// docs/internal/WARROOM_BUILD_PLAN.md). Same posture as MIS_BASE_URL: unset
// or unreachable is not an error, the "Investigate" action just degrades to
// an "unavailable" state. Its real address is never sent to the browser.
const WARROOM_BASE_URL = process.env.WARROOM_BASE_URL || '';
// Shared secret War Room now requires (X-API-Key) on both its endpoints.
// Unset here just means every call degrades to "unavailable" exactly like
// an unset WARROOM_BASE_URL already does — no separate failure mode to add.
const WARROOM_API_KEY = process.env.WARROOM_API_KEY || '';

// Correct secure-cookie and req.ip behaviour behind a reverse proxy.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);

// ---------------------------------------------------------------- middleware

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // per-element accent styles only
        scriptSrc: ["'self'"], // no inline scripts anywhere
        // /live's map (public/js/live.js) loads CARTO's free dark-matter
        // basemap directly client-side: a style.json plus vector tiles,
        // glyphs, and a sprite, all served from *.basemaps.cartocdn.com.
        // This is a deliberate, minimal, named-origin exception (same
        // per-request-widening pattern as the booking-embed frameSrc below)
        // -- not a blanket relaxation.
        imgSrc: ["'self'", 'data:', 'https://basemaps.cartocdn.com', 'https://*.basemaps.cartocdn.com'],
        connectSrc: ["'self'", 'https://basemaps.cartocdn.com', 'https://*.basemaps.cartocdn.com'],
        // Evaluated per request against the live bookingEmbedUrl, so adding a
        // Calendly link in the admin panel widens the policy with no restart.
        // Helmet requires the function wrapped in an array — a bare function throws at boot.
        frameSrc: [
          () => {
            const url = store.getSection('contact').bookingEmbedUrl;
            if (!url) return "'none'";
            try {
              const parsed = new URL(url);
              // URL() parses javascript:/data:/etc without throwing --
              // .origin on those is the literal string "null", not the
              // quoted CSP keyword 'none'/'null', so an unchecked parse
              // here would hand a non-https value straight into the
              // directive. Only a real https origin is ever allowed.
              return parsed.protocol === 'https:' ? parsed.origin : "'none'";
            } catch {
              return "'none'";
            }
          }
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    // No cross-origin embeds are served; the default COEP adds nothing here.
    crossOriginEmbedderPolicy: false
  })
);

// Helmet no longer sets this by default; nothing on this site uses any of
// these browser features, so deny them outright.
app.use((req, res, next) => {
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  next();
});

app.use(compression());

// Public, unauthenticated, cost/abuse-relevant endpoints -- the two admin/
// warroom-unlock lockouts (lib/auth.js, lib/warroomAuth.js) already cover
// their own login routes; these three have no such gating of their own.
// standardHeaders/legacyHeaders match MIS's own rate limiter config
// (lib/api/createApp.js) for consistency across the ecosystem.
function makeRateLimiter(max, windowMs) {
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
}
const contactLimiter = makeRateLimiter(10, 60_000); // form submissions are inherently low-frequency
const liveDataLimiter = makeRateLimiter(60, 60_000); // polled periodically by the map UI
const investigateLimiter = makeRateLimiter(10, 60_000); // each call can trigger real LLM/search spend downstream

// ------------------------------------------------- canonical host redirect
//
// A safety net, not the primary mechanism: the reverse proxy should be doing
// this (see deploy/nginx.conf). But the proxy config lives outside this repo
// and can't be verified from here, so the app enforces the canonical origin
// too. If the proxy already redirects, a non-canonical request never reaches
// Node and this is dead weight — which is the intended outcome.
//
// Still a single hop either way: this jumps straight to the final origin
// rather than fixing scheme and host in separate steps.
const CANONICAL_ORIGIN = (() => {
  // Only from an explicitly set BASE_URL. Falling back to the default in
  // content/site.js would make a plain `node server.js` on a laptop start
  // 301ing to the production domain.
  if (!process.env.BASE_URL) return null;
  try {
    return new URL(process.env.BASE_URL);
  } catch {
    console.warn('[boot] BASE_URL is not a valid URL — canonical redirect disabled.');
    return null;
  }
})();

app.use((req, res, next) => {
  if (!isProd || !CANONICAL_ORIGIN) return next();

  const host = req.headers.host;
  if (!host) return next();

  const hostWrong = host.toLowerCase() !== CANONICAL_ORIGIN.host.toLowerCase();

  // Scheme is only corrected when the proxy actually tells us the original
  // scheme. Without the header we cannot know it, and assuming http would
  // redirect to https forever once the proxy forwards over http internally.
  const forwarded = req.headers['x-forwarded-proto'];
  const schemeWrong = forwarded
    ? forwarded.split(',')[0].trim().toLowerCase() !== CANONICAL_ORIGIN.protocol.slice(0, -1)
    : false;

  if (!hostWrong && !schemeWrong) return next();
  return res.redirect(301, CANONICAL_ORIGIN.origin + req.originalUrl);
});

app.use(express.urlencoded({ extended: false }));

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: isProd ? '7d' : 0
  })
);

app.use(
  session({
    name: 'mxg.sid',
    secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

// Every view gets site + nav + appearance without each route having to pass them.
app.use((req, res, next) => {
  res.locals.site = store.getSection('site');
  res.locals.nav = store.getSection('nav');
  res.locals.appearance = store.getSection('appearance');
  res.locals.currentPath = req.path;
  res.locals.canonical = store.getSection('site').baseUrl + req.originalUrl.split('?')[0];
  next();
});

app.use('/admin', adminRouter);

// -------------------------------------------------------------- public pages

const PUBLIC_ROUTES = [
  '/',
  '/what-we-do',
  '/industries',
  '/how-we-work',
  '/who-we-are',
  '/contact',
  '/privacy',
  '/cookies',
  '/terms'
];

app.get('/', (req, res) => {
  const home = store.getSection('home');
  res.render('home', {
    page: home,
    industries: store.getSection('industries'),
    meta: home.meta
  });
});

app.get('/what-we-do', (req, res) => {
  const page = store.getSection('what-we-do');
  res.render('what-we-do', { page, meta: page.meta });
});

app.get('/industries', (req, res) => {
  const page = store.getSection('industries');
  res.render('industries', { page, meta: page.meta });
});

app.get('/how-we-work', (req, res) => {
  const page = store.getSection('how-we-work');
  res.render('how-we-work', { page, meta: page.meta });
});

app.get('/who-we-are', (req, res) => {
  const page = store.getSection('who-we-are');
  res.render('who-we-are', { page, meta: page.meta });
});

// ------------------------------------------------------------ live monitor

// Deliberately not in PUBLIC_ROUTES / sitemap.xml — this is an experimental
// feature (DESIGN.md), kept off the homepage and out of primary nav, reachable
// only by direct link for now.
app.get('/live', async (req, res) => {
  const health = await misClient.getHealth(MIS_BASE_URL);
  const events = health ? await misClient.getDisruptions(MIS_BASE_URL) : null;
  // Vessels are a separate, optional layer — MIS itself may have no
  // AISSTREAM_API_KEY configured, which is not a degraded state, just an
  // empty list. Only fetched once MIS is confirmed healthy either way.
  const vessels = health ? await misClient.getVessels(MIS_BASE_URL) : [];

  // MIS being unset, down, slow, or returning garbage all collapse to the
  // same degraded state — /live must render 200 regardless.
  res.render('live', {
    meta: {
      title: `Live Disruption Monitor — ${res.locals.site.publicName}`,
      description: 'A live view of global supply chain disruptions, monitored and classified in real time.'
    },
    misAvailable: Boolean(health && events),
    events: events || [],
    vessels,
    // War Room gating (docs/internal/WARROOM_BUILD_PLAN.md §10): a shared
    // access code unlocks the "Investigate" action for this browser session
    // only. Unset/false by default -- anonymous visitors always see the
    // locked teaser state.
    warroomUnlocked: Boolean(req.session && req.session.warroomUnlocked),
    warroomBookingEmbedUrl: store.getSection('contact').bookingEmbedUrl || ''
  });
});

// Same-origin proxy so the browser never learns MIS's real address — the
// client-side map polls this instead of MIS directly.
app.get('/live/data', liveDataLimiter, async (req, res) => {
  const events = await misClient.getDisruptions(MIS_BASE_URL);
  const vessels = await misClient.getVessels(MIS_BASE_URL);
  res.set('Cache-Control', 'no-store');
  res.json({ available: events !== null, events: events || [], vessels });
});

// --------------------------------------------------------------- war room

// Unlocks War Room for this browser session. Mirrors /admin/login's shape
// exactly (lib/warroomAuth.js mirrors lib/auth.js): timing-safe compare,
// per-IP lockout after repeated failures, session flag on success. No CSRF
// token here -- unlike /admin, this isn't behind an authenticated session
// already, and the lockout + timing-safe compare are the actual defenses
// against guessing a single shared code, same as MIS/admin's own posture.
app.post('/live/unlock', express.json({ limit: '1kb' }), (req, res) => {
  const lockMs = warroomAuth.lockoutFor(req.ip);
  if (lockMs > 0) {
    return res.status(429).json({
      ok: false,
      error: `Too many attempts. Try again in ${Math.ceil(lockMs / 60000)} minutes.`
    });
  }

  const body = req.body || {};
  if (!warroomAuth.checkCode(body.code)) {
    warroomAuth.recordFailure(req.ip);
    return res.status(401).json({
      ok: false,
      error: warroomAuth.isConfigured()
        ? 'Incorrect access code.'
        : 'War Room access is not configured on this server.'
    });
  }

  warroomAuth.clearFailures(req.ip);
  // Regenerate on success to prevent session fixation, same as
  // /admin/login (lib/auth.js's docstring on routes/admin.js's login route).
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ ok: false, error: 'Could not start a session. Try again.' });
    req.session.warroomUnlocked = true;
    res.json({ ok: true });
  });
});

function requireWarroomUnlock(req, res, next) {
  if (req.session && req.session.warroomUnlocked) return next();
  res.status(403).json({ available: false, locked: true });
}

// Same-origin proxy so the browser never learns War Room's real address —
// mirrors the /live/data pattern exactly. Gated: only unlocked sessions may
// kick off a job at all, which also keeps cost exposure bounded to
// approved users (WARROOM_BUILD_PLAN.md §6/§10).
app.post(
  '/live/investigate',
  investigateLimiter,
  express.json({ limit: '10kb' }),
  requireWarroomUnlock,
  async (req, res) => {
    const payload = warroomContract.buildInvestigationPayload(req.body);
    res.set('Cache-Control', 'no-store');
    if (!payload) {
      return res.status(400).json({ available: false, error: 'Missing or invalid incident fields.' });
    }

    const result = await warroomClient.createInvestigation(WARROOM_BASE_URL, payload, { apiKey: WARROOM_API_KEY });
    if (!result.available) return res.json({ available: false });
    if (result.rateLimited) return res.status(429).json({ available: true, rateLimited: true });
    if (result.invalid) {
      return res.status(400).json({ available: true, error: 'War Room rejected the request.' });
    }
    res.status(202).json({
      available: true,
      jobId: result.jobId,
      status: result.status,
      cachedFrom: result.cachedFrom
    });
  }
);

app.get('/live/investigate/:jobId', requireWarroomUnlock, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!warroomContract.isValidJobId(req.params.jobId)) {
    return res.status(400).json({ available: false, error: 'Invalid job id.' });
  }
  const result = await warroomClient.getInvestigation(WARROOM_BASE_URL, req.params.jobId, { apiKey: WARROOM_API_KEY });
  res.json(result);
});

// ---------------------------------------------------- sweden trade story

// Part 2 of the "Intelligence" umbrella (part 1 is /live above) — see
// docs/internal/SWEDEN_TRADE_BUILD_INSTRUCTIONS.md. Renders entirely from
// the committed, pre-baked content/sweden-trade-data.json; the live site has
// zero runtime dependency on SCB (§3 of that doc — the data updates monthly,
// so a static file is strictly better than a live call here). The file is
// owned/refreshed by a separate offline job; this route only ever reads it.
// Deliberately not in PUBLIC_ROUTES / sitemap.xml yet — same first-launch
// precedent as /live above.
const SWEDEN_TRADE_DATA_PATH = path.join(__dirname, 'content', 'sweden-trade-data.json');

app.get('/insights/sweden-trade', (req, res) => {
  let tradeData = null;
  try {
    tradeData = JSON.parse(fs.readFileSync(SWEDEN_TRADE_DATA_PATH, 'utf8'));
  } catch (err) {
    // Committed static file should always parse; fail closed to the page's
    // own "unavailable" state (views/story.ejs) rather than a 500.
    tradeData = null;
  }

  res.render('story', {
    meta: {
      title: `Sweden Trade Intelligence — ${res.locals.site.publicName}`,
      description:
        "A scroll-driven look at what Sweden imports, who from, and what that concentration means — the same analytical rigor MassifyX applies to a single company's supplier base."
    },
    data: tradeData
  });
});

// ------------------------------------------------------------- contact form

const MAX_FIELD_LENGTH = 4000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function renderContact(res, opts = {}) {
  const page = store.getSection('contact');
  res.render('contact', {
    page,
    meta: page.meta,
    errors: opts.errors || {},
    values: opts.values || {},
    submitted: Boolean(opts.submitted)
  });
}

// ?topic=warroom prefills the message field so a War Room "Request access"
// submission is identifiable in the inbox/logs without any new form field,
// schema change, or contact-infrastructure work (WARROOM_BUILD_PLAN.md §10:
// reuse the existing /contact flow as-is). Purely a prefill default — the
// visitor can still edit or clear it before sending.
const CONTACT_TOPIC_PREFILLS = {
  warroom: 'I’d like access to the War Room incident investigation feature.'
};

app.get('/contact', (req, res) => {
  const topic = typeof req.query.topic === 'string' ? req.query.topic : '';
  const prefill = CONTACT_TOPIC_PREFILLS[topic];
  renderContact(res, prefill ? { values: { message: prefill } } : {});
});

app.post('/contact', contactLimiter, async (req, res) => {
  const page = store.getSection('contact');
  const body = req.body || {};

  // Honeypot: if a bot fills the hidden field, accept silently with the success
  // message so it gets no signal that anything was rejected.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return renderContact(res, { submitted: true });
  }

  const errors = {};
  const values = {};

  for (const field of page.fields) {
    const raw = typeof body[field.name] === 'string' ? body[field.name].trim() : '';
    values[field.name] = raw;

    if (raw.length > MAX_FIELD_LENGTH) {
      errors[field.name] = `Please keep this under ${MAX_FIELD_LENGTH} characters.`;
      continue;
    }
    if (field.required && !raw) {
      errors[field.name] = `${field.label} is required.`;
      continue;
    }
    if (field.type === 'email' && raw && !EMAIL_RE.test(raw)) {
      errors[field.name] = 'Please enter a valid email address.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('contact', {
      page,
      meta: page.meta,
      errors,
      values,
      submitted: false
    });
  }

  // Fallback audit trail so a submission never vanishes without a trace if
  // email delivery fails below — but this is a stdout/journald log line,
  // not the system of record the published Privacy Policy's 24-month
  // retention/deletion promise describes, and this app has no way to
  // enforce log rotation on whatever host it runs on. Deliberately logs
  // only what's needed to recover and reply to a lead (name, email,
  // company, a truncated message preview) rather than every field
  // verbatim and unbounded — the full message is still delivered intact
  // to CONTACT_TO_EMAIL when SMTP is configured. Whoever operates this
  // deployment is responsible for configuring the host's log retention to
  // actually match the published policy; this narrows what a longer-than-
  // intended retention would expose, it does not replace that configuration.
  console.log('[contact] submission:', JSON.stringify({
    name: values.name,
    email: values.email,
    company: values.company || null,
    messagePreview: values.message ? values.message.slice(0, 140) : '',
    submittedAt: new Date().toISOString()
  }));

  if (mailer.isConfigured()) {
    try {
      await mailer.sendContactNotification(values);
    } catch (err) {
      // The visitor's message was already logged above and their form still
      // succeeds — an SMTP outage on our end shouldn't become their problem.
      console.error('[contact] notification email failed:', err.message);
    }
  } else {
    console.warn('[contact] SMTP not configured (SMTP_HOST unset) — notification email not sent.');
  }

  return renderContact(res, { submitted: true });
});

// -------------------------------------------------------------- legal pages

for (const doc of store.getSection('legal').all) {
  app.get(`/${doc.slug}`, (req, res) => {
    const legal = store.getSection('legal');
    const current = legal.all.find((d) => d.slug === doc.slug) || doc;
    res.render('legal', {
      page: current,
      meta: {
        title: `${current.title} — ${res.locals.site.publicName}`,
        description: current.intro
      }
    });
  });
}

// --------------------------------------------------------- robots & sitemap

app.get('/robots.txt', (req, res) => {
  const base = store.getSection('site').baseUrl;
  res.type('text/plain').send(
    ['User-agent: *', 'Disallow: /admin', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const base = store.getSection('site').baseUrl;
  const urls = PUBLIC_ROUTES.map(
    (r) => `  <url><loc>${base}${r === '/' ? '/' : r}</loc></url>`
  ).join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
});

// ------------------------------------------------------------- error pages

app.use((req, res) => {
  res.status(404).render('404', {
    meta: { title: 'Page not found — MassifyX Global', description: '' }
  });
});

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).render('500', {
    meta: { title: 'Something went wrong — MassifyX Global', description: '' }
  });
});

// ------------------------------------------------------------------- listen

// A configured-but-weak shared secret is worse than an unconfigured one:
// unconfigured fails closed (every login refused, by design — see
// lib/auth.js/lib/warroomAuth.js), but a short secret is live and
// brute-forceable, especially against a per-IP-only lockout that a
// rotating-IP attacker can trivially reset (see lib/auth.js's
// recordFailure/lockoutFor docstrings for the mitigating global lockout
// added alongside this). Refusing to boot on a weak-but-set secret turns a
// silent production footgun into an immediate, loud deploy failure.
const MIN_ADMIN_PASSWORD_LENGTH = 12;
const MIN_WARROOM_ACCESS_CODE_LENGTH = 8;

if (require.main === module) {
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[boot] ADMIN_PASSWORD is not set — /admin logins will be refused.');
  } else if (process.env.ADMIN_PASSWORD.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `[boot] ADMIN_PASSWORD is shorter than ${MIN_ADMIN_PASSWORD_LENGTH} characters — refusing to start with a weak admin credential. Generate a longer one (see deploy/README.md).`
    );
  }
  if (!process.env.SESSION_SECRET) {
    console.warn('[boot] SESSION_SECRET is not set — admin sessions reset on restart.');
  }
  if (!process.env.WARROOM_ACCESS_CODE) {
    console.warn('[boot] WARROOM_ACCESS_CODE is not set — /live/unlock will refuse every attempt.');
  } else if (process.env.WARROOM_ACCESS_CODE.length < MIN_WARROOM_ACCESS_CODE_LENGTH) {
    throw new Error(
      `[boot] WARROOM_ACCESS_CODE is shorter than ${MIN_WARROOM_ACCESS_CODE_LENGTH} characters — refusing to start with a weak access code.`
    );
  }
  app.listen(PORT, () => {
    console.log(`MassifyX Global listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
