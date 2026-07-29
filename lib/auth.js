'use strict';

const crypto = require('crypto');

const LOCKOUT_THRESHOLD = 6;
const LOCKOUT_MS = 15 * 60 * 1000;

// Keyed by req.ip. In-memory by design — a restart clearing lockouts is acceptable
// for a single-admin panel, and it keeps the dependency surface at zero.
const attempts = new Map();

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

function lockoutFor(ip) {
  const record = attempts.get(ip);
  if (!record) return 0;
  if (record.count < LOCKOUT_THRESHOLD) return 0;
  const remaining = record.until - Date.now();
  if (remaining <= 0) {
    attempts.delete(ip);
    return 0;
  }
  return remaining;
}

function recordFailure(ip) {
  const record = attempts.get(ip) || { count: 0, until: 0 };
  record.count += 1;
  if (record.count >= LOCKOUT_THRESHOLD) record.until = Date.now() + LOCKOUT_MS;
  attempts.set(ip, record);
}

function clearFailures(ip) {
  attempts.delete(ip);
}

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

module.exports = {
  isConfigured,
  checkPassword,
  requireAuth,
  csrfToken,
  verifyCsrf,
  lockoutFor,
  recordFailure,
  clearFailures,
  LOCKOUT_THRESHOLD
};
