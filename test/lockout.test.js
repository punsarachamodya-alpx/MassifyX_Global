'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createLockout } = require('../lib/lockout');

test('per-key lockout trips after perKeyThreshold failures on the same key', () => {
  const lockout = createLockout({
    perKeyThreshold: 3,
    perKeyLockoutMs: 1000,
    globalThreshold: 1000, // effectively disabled for this test
    globalWindowMs: 1000,
    globalCooldownMs: 1000,
  });

  assert.equal(lockout.lockoutFor('ip-a'), 0);
  lockout.recordFailure('ip-a');
  lockout.recordFailure('ip-a');
  assert.equal(lockout.lockoutFor('ip-a'), 0); // below threshold
  lockout.recordFailure('ip-a');
  assert.ok(lockout.lockoutFor('ip-a') > 0);

  lockout.clearFailures('ip-a');
  assert.equal(lockout.lockoutFor('ip-a'), 0);
});

test('a rotating attacker never trips the per-key lockout, but does trip the global breaker', () => {
  const lockout = createLockout({
    perKeyThreshold: 6,
    perKeyLockoutMs: 1000,
    globalThreshold: 5,
    globalWindowMs: 60_000,
    globalCooldownMs: 1000,
  });

  // Five different IPs, one failure each -- no single IP ever reaches the
  // per-key threshold of 6, but the global breaker counts all of them.
  for (let i = 0; i < 5; i++) {
    const ip = `rotating-ip-${i}`;
    assert.equal(lockout.lockoutFor(ip), 0, `ip ${i} should not be individually locked out yet`);
    lockout.recordFailure(ip);
  }

  // A brand-new, never-before-seen IP is now also locked out -- proof this
  // is the global breaker, not a per-key one.
  assert.ok(lockout.lockoutFor('never-seen-before') > 0);
});

test('the global breaker stays untripped below its threshold', () => {
  const lockout = createLockout({
    perKeyThreshold: 100, // effectively disabled for this test
    perKeyLockoutMs: 1000,
    globalThreshold: 3,
    globalWindowMs: 60_000,
    globalCooldownMs: 500,
  });

  lockout.recordFailure('ip-1');
  lockout.recordFailure('ip-2');
  assert.equal(lockout.lockoutFor('fresh-ip'), 0); // only 2 of 3 needed so far
});
