'use strict';

// Gates the site's War Room proxy routes (server.js) behind a single shared
// access code -- deliberately the smallest thing that works (see
// docs/internal/WARROOM_BUILD_PLAN.md §10): no user accounts, no per-user
// credentials, just WARROOM_ACCESS_CODE compared the same way ADMIN_PASSWORD
// already is in lib/auth.js (SHA-256 + timingSafeEqual, never logged, never
// sent to the client). Kept as its own small module rather than folded into
// lib/auth.js: this gates a session flag for a marketing feature, not admin
// login, and the two should stay free to diverge (e.g. no CSRF/lockout
// coupling to the admin session lifecycle).

const crypto = require('crypto');
const { createLockout } = require('./lockout');

const LOCKOUT_THRESHOLD = 6;
const LOCKOUT_MS = 15 * 60 * 1000;

// See lib/lockout.js's docstring and lib/auth.js's identical setup: bounds
// a rotating-IP attacker's total brute-force throughput against
// WARROOM_ACCESS_CODE, not just their throughput from any one IP.
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

// Hash both sides before comparing so differing input length can't leak via
// an early return inside timingSafeEqual.
function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

function isConfigured() {
  return Boolean(process.env.WARROOM_ACCESS_CODE);
}

// Without WARROOM_ACCESS_CODE set, every unlock attempt is refused. No
// default, by design -- same posture as ADMIN_PASSWORD.
function checkCode(candidate) {
  const expected = process.env.WARROOM_ACCESS_CODE;
  if (!expected) return false;
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  return safeEqual(candidate, expected);
}

const { lockoutFor, recordFailure, clearFailures } = lockout;

module.exports = {
  isConfigured,
  checkCode,
  lockoutFor,
  recordFailure,
  clearFailures,
  LOCKOUT_THRESHOLD
};
