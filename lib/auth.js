'use strict';

const crypto = require('crypto');
const { createLockout } = require('./lockout');

const LOCKOUT_THRESHOLD = 6;
const LOCKOUT_MS = 15 * 60 * 1000;

// See lib/lockout.js's docstring: this global breaker is what stops a
// rotating-IP attacker from getting a fresh 6-attempt budget on every new
// IP. 20 failures across ALL IPs within 10 minutes (a threshold no normal
// mistyped-password volume should ever reach) triggers the same 15-minute
// cooldown as the per-IP lockout, site-wide.
const lockout = createLockout({
  perKeyThreshold: LOCKOUT_THRESHOLD,
  perKeyLockoutMs: LOCKOUT_MS,
  globalThreshold: 20,
  globalWindowMs: 10 * 60 * 1000,
  globalCooldownMs: LOCKOUT_MS,
});

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest();
}

// Hash both sides before comparing so differing input length can't leak via an
// early return inside timingSafeEqual.
function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

function isConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

const { lockoutFor, recordFailure, clearFailures } = lockout;

// Without ADMIN_PASSWORD set, every login attempt is refused. No default, by design.
function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  return safeEqual(candidate, expected);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  const next_ = encodeURIComponent(req.originalUrl || '/admin');
  return res.redirect(`/admin/login?next=${next_}`);
}

function csrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  const expected = req.session && req.session.csrfToken;
  const supplied = req.body && req.body._csrf;
  if (!expected || typeof supplied !== 'string' || !safeEqual(supplied, expected)) {
    return res.status(403).send('Invalid or missing CSRF token. Go back and try again.');
  }
  return next();
}

// For multipart routes only (currently just /admin/upload): the token can't
// live in req.body, because multer is the only thing that parses a
// multipart body, and it must not run until *after* CSRF is verified —
// otherwise a forged cross-site request gets to write its file to disk
// before the 403 is ever produced. Reads from the X-CSRF-Token header (set
// by the fetch-based image-field uploader) or the ?_csrf= query param (set
// by the plain <form> bulk-upload panel, which as a real page navigation
// has no way to set a custom header). Same session-bound, constant-time
// comparison as verifyCsrf.
function verifyCsrfPreBody(req, res, next) {
  const expected = req.session && req.session.csrfToken;
  const supplied = req.get('X-CSRF-Token') || (typeof req.query._csrf === 'string' ? req.query._csrf : null);
  if (!expected || typeof supplied !== 'string' || !safeEqual(supplied, expected)) {
    return res.status(403).send('Invalid or missing CSRF token. Go back and try again.');
  }
  return next();
}

module.exports = {
  isConfigured,
  checkPassword,
  requireAuth,
  csrfToken,
  verifyCsrf,
  verifyCsrfPreBody,
  lockoutFor,
  recordFailure,
  clearFailures,
  LOCKOUT_THRESHOLD
};
