'use strict';

// Generic per-key lockout with a global circuit breaker layered on top.
// Per-key (per-IP) lockout alone is defeated by rotating the source IP --
// each new IP gets its own fresh attempt budget, so a shared secret
// (ADMIN_PASSWORD, WARROOM_ACCESS_CODE) can otherwise be brute-forced at
// effectively unlimited throughput by an attacker with access to many
// IPs. The global breaker counts failures across ALL keys in a rolling
// window and, once that crosses its own (much higher) threshold, locks
// out every caller for a cooldown period regardless of which IP they're
// on. This trades "legitimate users also blocked during the cooldown"
// for "bounded brute-force throughput" -- an acceptable tradeoff for a
// single shared secret with no per-user accounts to selectively lock
// instead.
//
// In-memory by design, same tradeoff as the per-key lockout: a restart
// clearing state is acceptable here, and it keeps the dependency surface
// at zero.
// Below-threshold entries (an IP that failed once or twice and never came
// back) would otherwise sit in `perKey` forever -- only entries that
// actually reach lockout and then expire get cleaned up on read. A sweep
// every SWEEP_INTERVAL calls evicts anything untouched for longer than the
// lockout window, bounding long-run memory growth from many distinct IPs.
const SWEEP_INTERVAL_CALLS = 500;
const STALE_AFTER_MS = 60 * 60 * 1000; // 1h -- generous relative to any lockout window here

function createLockout({ perKeyThreshold, perKeyLockoutMs, globalThreshold, globalWindowMs, globalCooldownMs }) {
  const perKey = new Map();
  let globalFailureTimestamps = [];
  let globalLockoutUntil = 0;
  let callsSinceSweep = 0;

  function sweepStaleEntries() {
    const now = Date.now();
    for (const [key, record] of perKey) {
      if (record.count < perKeyThreshold && now - record.lastFailureAt > STALE_AFTER_MS) {
        perKey.delete(key);
      }
    }
  }

  function perKeyLockoutRemaining(key) {
    const record = perKey.get(key);
    if (!record) return 0;
    if (record.count < perKeyThreshold) return 0;
    const remaining = record.until - Date.now();
    if (remaining <= 0) {
      perKey.delete(key);
      return 0;
    }
    return remaining;
  }

  function globalLockoutRemaining() {
    const remaining = globalLockoutUntil - Date.now();
    if (remaining <= 0) {
      globalLockoutUntil = 0;
      return 0;
    }
    return remaining;
  }

  function lockoutFor(key) {
    return Math.max(perKeyLockoutRemaining(key), globalLockoutRemaining());
  }

  function recordFailure(key) {
    const now = Date.now();
    const record = perKey.get(key) || { count: 0, until: 0 };
    record.count += 1;
    record.lastFailureAt = now;
    if (record.count >= perKeyThreshold) record.until = now + perKeyLockoutMs;
    perKey.set(key, record);

    globalFailureTimestamps.push(now);
    globalFailureTimestamps = globalFailureTimestamps.filter((t) => now - t < globalWindowMs);
    if (globalFailureTimestamps.length >= globalThreshold) {
      globalLockoutUntil = now + globalCooldownMs;
      globalFailureTimestamps = [];
    }

    callsSinceSweep += 1;
    if (callsSinceSweep >= SWEEP_INTERVAL_CALLS) {
      callsSinceSweep = 0;
      sweepStaleEntries();
    }
  }

  function clearFailures(key) {
    perKey.delete(key);
  }

  return { lockoutFor, recordFailure, clearFailures, LOCKOUT_THRESHOLD: perKeyThreshold };
}

module.exports = { createLockout };
