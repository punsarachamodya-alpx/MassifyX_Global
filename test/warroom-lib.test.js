'use strict';

// Pure unit tests for the two small War Room library modules -- no HTTP,
// no network. HTTP-level gating/degrade behavior is covered separately in
// test/warroom.test.js and test/warroom-unset.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');

const warroomContract = require('../lib/warroomContract');
const warroomAuth = require('../lib/warroomAuth');

test('buildInvestigationPayload accepts a fully-formed body', () => {
  const payload = warroomContract.buildInvestigationPayload({
    incidentId: 'evt_1',
    title: 'Suez Canal transit restricted',
    location: 'Suez, Egypt',
    category: 'geopolitical',
    severity: 5,
    summary: 'Suez Canal transit was restricted following a security incident.',
    lat: 30.5852,
    lon: 32.2654,
    eventDate: '2026-08-01T00:00:00Z'
  });
  assert.deepEqual(payload, {
    incidentId: 'evt_1',
    title: 'Suez Canal transit restricted',
    location: 'Suez, Egypt',
    category: 'geopolitical',
    severity: 5,
    summary: 'Suez Canal transit was restricted following a security incident.',
    lat: 30.5852,
    lon: 32.2654,
    eventDate: '2026-08-01T00:00:00Z'
  });
});

test('buildInvestigationPayload drops fields not in the allow-list', () => {
  const payload = warroomContract.buildInvestigationPayload({
    incidentId: 'evt_1',
    title: 'Title',
    location: 'Loc',
    summary: 'Summary',
    severity: 3,
    lat: 1,
    lon: 2,
    somethingUnexpected: 'should-not-be-forwarded'
  });
  assert.equal(Object.keys(payload).includes('somethingUnexpected'), false);
});

test('buildInvestigationPayload rejects a missing required field', () => {
  assert.equal(
    warroomContract.buildInvestigationPayload({
      title: 'Title',
      location: 'Loc',
      summary: 'Summary',
      severity: 3,
      lat: 1,
      lon: 2
    }),
    null
  );
});

test('buildInvestigationPayload rejects severity outside 1-5', () => {
  const base = { incidentId: 'e', title: 't', location: 'l', summary: 's', lat: 1, lon: 2 };
  assert.equal(warroomContract.buildInvestigationPayload({ ...base, severity: 0 }), null);
  assert.equal(warroomContract.buildInvestigationPayload({ ...base, severity: 6 }), null);
  assert.equal(warroomContract.buildInvestigationPayload({ ...base, severity: 3.5 }), null);
});

test('buildInvestigationPayload rejects non-finite lat/lon', () => {
  const base = { incidentId: 'e', title: 't', location: 'l', summary: 's', severity: 3 };
  assert.equal(warroomContract.buildInvestigationPayload({ ...base, lat: 'nope', lon: 2 }), null);
  assert.equal(warroomContract.buildInvestigationPayload({ ...base, lat: 1, lon: Infinity }), null);
});

test('buildInvestigationPayload rejects a non-object body', () => {
  assert.equal(warroomContract.buildInvestigationPayload(null), null);
  assert.equal(warroomContract.buildInvestigationPayload('not an object'), null);
  assert.equal(warroomContract.buildInvestigationPayload(undefined), null);
});

test('isValidJobId accepts War Room-shaped ids and rejects path-unsafe input', () => {
  assert.equal(warroomContract.isValidJobId('wrj_a1b2c3'), true);
  assert.equal(warroomContract.isValidJobId('../../etc/passwd'), false);
  assert.equal(warroomContract.isValidJobId(''), false);
  assert.equal(warroomContract.isValidJobId('has spaces'), false);
  assert.equal(warroomContract.isValidJobId(42), false);
});

// ------------------------------------------------------------ warroomAuth

test('checkCode refuses every attempt when WARROOM_ACCESS_CODE is unset', () => {
  const original = process.env.WARROOM_ACCESS_CODE;
  delete process.env.WARROOM_ACCESS_CODE;
  try {
    assert.equal(warroomAuth.isConfigured(), false);
    assert.equal(warroomAuth.checkCode('anything'), false);
  } finally {
    if (original !== undefined) process.env.WARROOM_ACCESS_CODE = original;
  }
});

test('checkCode accepts the exact configured code and rejects everything else', () => {
  const original = process.env.WARROOM_ACCESS_CODE;
  process.env.WARROOM_ACCESS_CODE = 'correct-horse-battery-staple';
  try {
    assert.equal(warroomAuth.isConfigured(), true);
    assert.equal(warroomAuth.checkCode('correct-horse-battery-staple'), true);
    assert.equal(warroomAuth.checkCode('wrong-code'), false);
    assert.equal(warroomAuth.checkCode(''), false);
    assert.equal(warroomAuth.checkCode(undefined), false);
    assert.equal(warroomAuth.checkCode(null), false);
  } finally {
    if (original !== undefined) process.env.WARROOM_ACCESS_CODE = original;
    else delete process.env.WARROOM_ACCESS_CODE;
  }
});

test('recordFailure locks out an IP after LOCKOUT_THRESHOLD failures, clearFailures lifts it', () => {
  const ip = `test-ip-${Date.now()}-${Math.random()}`; // unique per run, no cross-test bleed
  assert.equal(warroomAuth.lockoutFor(ip), 0);

  for (let i = 0; i < warroomAuth.LOCKOUT_THRESHOLD; i++) warroomAuth.recordFailure(ip);
  assert.ok(warroomAuth.lockoutFor(ip) > 0);

  warroomAuth.clearFailures(ip);
  assert.equal(warroomAuth.lockoutFor(ip), 0);
});
