'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const store = require('./lib/store');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

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
        imgSrc: ["'self'", 'data:'],
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

app.post('/contact', (req, res) => {
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

  if (!page.deliveryConfigured) {
    // TODO(founder): wire SMTP or a CRM webhook. Logged rather than dropped until then.
    console.log('[contact] submission (delivery not configured):', JSON.stringify(values));
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
