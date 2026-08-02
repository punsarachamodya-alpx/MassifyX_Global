'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const store = require('./lib/store');
const mailer = require('./lib/mailer');
const misClient = require('./lib/misClient');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
// The MassifyX Intelligence Service (MIS) — a separate, independently
// deployed microservice. Unset in dev by default: /live degrades cleanly
// with no MIS_BASE_URL configured, same as it would if MIS were down.
const MIS_BASE_URL = process.env.MIS_BASE_URL || '';

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
              return new URL(url).origin;
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

app.use(compression());
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
    vessels
  });
});

// Same-origin proxy so the browser never learns MIS's real address — the
// client-side map polls this instead of MIS directly.
app.get('/live/data', async (req, res) => {
  const events = await misClient.getDisruptions(MIS_BASE_URL);
  const vessels = await misClient.getVessels(MIS_BASE_URL);
  res.set('Cache-Control', 'no-store');
  res.json({ available: events !== null, events: events || [], vessels });
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

app.get('/contact', (req, res) => renderContact(res));

app.post('/contact', async (req, res) => {
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

  // Always logged as a fallback audit trail, whether or not email delivery
  // succeeds — a submission should never vanish without a trace.
  console.log('[contact] submission:', JSON.stringify(values));

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

if (require.main === module) {
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[boot] ADMIN_PASSWORD is not set — /admin logins will be refused.');
  } else if (process.env.ADMIN_PASSWORD.length < 12) {
    console.warn('[boot] ADMIN_PASSWORD is shorter than 12 characters.');
  }
  if (!process.env.SESSION_SECRET) {
    console.warn('[boot] SESSION_SECRET is not set — admin sessions reset on restart.');
  }
  app.listen(PORT, () => {
    console.log(`MassifyX Global listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
