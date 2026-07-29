'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const auth = require('../lib/auth');
const store = require('../lib/store');
const schema = require('../lib/schema');
const paths = require('../lib/paths');
const mailer = require('../lib/mailer');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'img', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_FOR_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

// Filenames are never trusted from the client — every upload is renamed to random hex.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + (EXT_FOR_MIME[file.mimetype] || '.bin'))
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype))
});

// Keep the whole panel out of search indexes.
router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.locals.layout = 'admin/layout';
  res.locals.sections = schema.sections;
  next();
});

// ------------------------------------------------------------------- login

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', {
    title: 'Sign in',
    error: null,
    configured: auth.isConfigured(),
    next: typeof req.query.next === 'string' ? req.query.next : '/admin'
  });
});

router.post('/login', (req, res) => {
  const nextUrl =
    typeof req.body.next === 'string' && req.body.next.startsWith('/admin')
      ? req.body.next
      : '/admin';

  const render = (error) =>
    res.status(401).render('admin/login', {
      title: 'Sign in',
      error,
      configured: auth.isConfigured(),
      next: nextUrl
    });

  const lockMs = auth.lockoutFor(req.ip);
  if (lockMs > 0) {
    return render(`Too many attempts. Try again in ${Math.ceil(lockMs / 60000)} minutes.`);
  }

  if (!auth.checkPassword(req.body.password)) {
    auth.recordFailure(req.ip);
    return render(
      auth.isConfigured()
        ? 'Incorrect password.'
        : 'Admin access is not configured on this server.'
    );
  }

  auth.clearFailures(req.ip);
  // Regenerate on success to prevent session fixation.
  req.session.regenerate((err) => {
    if (err) return render('Could not start a session. Try again.');
    req.session.isAdmin = true;
    res.redirect(nextUrl);
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Everything below requires a session.
router.use(auth.requireAuth);
router.use((req, res, next) => {
  res.locals.csrfToken = auth.csrfToken(req);
  next();
});

// --------------------------------------------------------------- dashboard

// Computed from live content, not a hard-coded list, so it can't go stale.
function checklist() {
  const contact = store.getSection('contact');
  const whoWeAre = store.getSection('who-we-are');
  const legal = store.getSection('legal');
  const founder = whoWeAre.founder || {};
  const items = [
    {
      label: 'Contact form delivery wired to a real inbox',
      // Computed from the live SMTP environment, not a checkbox someone could
      // tick without actually configuring anything — see lib/mailer.js.
      done: mailer.isConfigured(),
      where: '/admin/edit/contact'
    },
    {
      label: 'Booking link added',
      done: Boolean(contact.bookingEmbedUrl),
      where: '/admin/edit/contact'
    },
    {
      label: 'Founder headshot uploaded',
      done: Boolean(founder.photo),
      where: '/admin/edit/who-we-are'
    },
    {
      label: 'Founder LinkedIn URL set',
      done: Boolean(founder.linkedin),
      where: '/admin/edit/who-we-are'
    },
    {
      label: 'Founder story rewritten (draft notice cleared)',
      done: !founder.draftNotice,
      where: '/admin/edit/who-we-are'
    },
    {
      label: 'Team LinkedIn URLs set',
      done: (whoWeAre.team?.members || []).every((m) => Boolean(m.linkedin)),
      where: '/admin/edit/who-we-are'
    }
  ];
  for (const doc of legal.all) {
    items.push({
      label: `${doc.title} reviewed by counsel`,
      done: Boolean(doc.counselReviewed),
      where: '/admin/edit/legal'
    });
  }
  return items;
}

router.get('/', (req, res) => {
  const overrides = store.readOverrides();
  res.render('admin/dashboard', {
    title: 'Dashboard',
    checklist: checklist(),
    edited: Object.keys(overrides),
    backupCount: store.listBackups().length,
    flash: req.query.done || null
  });
});

// ------------------------------------------------------------------ editor

// Walks the schema and pulls only declared paths out of the POST body. The schema
// is the write allow-list: nothing not declared here can ever be written.
function collect(fields, body, prefix, current) {
  const out = {};
  for (const field of fields) {
    const dotted = prefix ? `${prefix}.${field.path}` : field.path;
    const key = `f:${dotted}`;

    if (field.type === 'repeater') {
      const indices = new Set();
      const needle = `f:${dotted}.`;
      for (const k of Object.keys(body)) {
        if (!k.startsWith(needle)) continue;
        const m = k.slice(needle.length).match(/^(\d+)\./);
        if (m) indices.add(Number(m[1]));
      }
      const rows = [];
      for (const i of [...indices].sort((a, b) => a - b)) {
        if (body[`f:${dotted}.${i}.__deleted`] === '1') continue;
        const existing = (paths.getPath(current, field.path) || [])[i] || {};
        rows.push(collect(field.fields, body, `${dotted}.${i}`, existing));
      }
      paths.setPath(out, field.path, rows);
      continue;
    }

    if (field.type === 'boolean') {
      paths.setPath(out, field.path, body[key] === 'on' || body[key] === '1');
      continue;
    }

    const raw = typeof body[key] === 'string' ? body[key] : '';
    if (field.type === 'list') paths.setPath(out, field.path, paths.linesToArray(raw));
    else if (field.type === 'paras') paths.setPath(out, field.path, paths.textToParas(raw));
    else paths.setPath(out, field.path, raw);
  }
  return out;
}

router.get('/edit/:section', (req, res, next) => {
  const section = schema.bySectionKey(req.params.section);
  if (!section) return next();
  res.render('admin/edit', {
    title: section.label,
    section,
    data: store.getSection(section.key),
    paths,
    saved: req.query.saved === '1'
  });
});

router.post('/edit/:section', auth.verifyCsrf, (req, res, next) => {
  const section = schema.bySectionKey(req.params.section);
  if (!section) return next();
  const current = store.getSection(section.key);
  const override = collect(section.fields, req.body, '', current);
  store.saveSection(section.key, override);
  res.redirect(`/admin/edit/${section.key}?saved=1`);
});

router.post('/reset/:section', auth.verifyCsrf, (req, res, next) => {
  const section = schema.bySectionKey(req.params.section);
  if (!section) return next();
  store.resetSection(section.key);
  res.redirect(`/admin/edit/${section.key}?saved=1`);
});

// ----------------------------------------------------- backups / export

router.get('/backups', (req, res) => {
  res.render('admin/backups', {
    title: 'Backups',
    backups: store.listBackups(),
    flash: req.query.done || null
  });
});

router.post('/backups/restore', auth.verifyCsrf, (req, res) => {
  try {
    store.restoreBackup(String(req.body.name || ''));
    res.redirect('/admin/backups?done=restored');
  } catch (err) {
    res.status(400).render('admin/message', {
      title: 'Restore failed',
      heading: 'Restore failed',
      message: err.message
    });
  }
});

router.get('/export', (req, res) => {
  res.set('Content-Disposition', 'attachment; filename="massifyx-content.json"');
  res.type('application/json').send(JSON.stringify(store.readOverrides(), null, 2));
});

// ------------------------------------------------------------------ upload

// multer must run before the CSRF check: it's the only thing that parses a
// multipart body, and the "_csrf" field lives inside that body. Checking CSRF
// first (as a normal route-level middleware would) always sees an empty
// req.body and rejects every upload.
// The image-field file pickers (views/admin/_field.ejs) POST here via fetch and
// expect JSON back; the standalone bulk-upload panel on the Site page is a plain
// form post and expects the HTML result page. Both hit the same endpoint —
// wantsJson decides which response a given request gets.
router.post('/upload', (req, res, next) => {
  upload.array('images', 4)(req, res, (err) => {
    if (err) {
      const wantsJson = req.xhr || (req.get('Accept') || '').includes('application/json');
      if (wantsJson) return res.status(400).json({ error: err.message, files: [] });
      return res.status(400).render('admin/message', {
        title: 'Upload failed',
        heading: 'Upload failed',
        message: err.message
      });
    }
    next();
  });
}, auth.verifyCsrf, (req, res) => {
  const files = (req.files || []).map((f) => `/img/uploads/${f.filename}`);
  const wantsJson = req.xhr || (req.get('Accept') || '').includes('application/json');

  if (wantsJson) {
    return res.json({
      files,
      error: files.length ? null : 'Only JPG, PNG, and WebP files under 4 MB are accepted.'
    });
  }

  res.render('admin/message', {
    title: 'Uploaded',
    heading: files.length ? 'Upload complete' : 'Nothing uploaded',
    message: files.length
      ? 'Copy a path below into the matching image field.'
      : 'Only JPG, PNG, and WebP files under 4 MB are accepted.',
    files
  });
});

module.exports = router;
