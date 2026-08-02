'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDataUrl, readFixture, useFixtures } = require('./scbClient');

test('buildDataUrl includes an explicit valuecodes entry for every dimension', () => {
  const url = buildDataUrl('TAB3195', { Handelspartner: ['DE', 'NO'], ContentsCode: ['HA0201J8'], Tid: ['2024'] });
  assert.match(url, /^https:\/\/statistikdatabasen\.scb\.se\/api\/v2\/tables\/TAB3195\/data\?/);
  assert.match(url, /outputFormat=json-stat2/);
  // Matches the proven-working literal-bracket convention from
  // spike-scb-fetch.js (verified against live SCB data) -- not percent-
  // encoded, SCB's API accepts it as-is.
  assert.match(url, /valuecodes\[Handelspartner]=DE,NO/);
  assert.match(url, /valuecodes\[ContentsCode]=HA0201J8/);
  assert.match(url, /valuecodes\[Tid]=2024/);
});

test('buildDataUrl never falls back to a bare "*" -- every code must be explicit', () => {
  const url = buildDataUrl('TAB5390', { ImportExport: ['ITOT', 'ETOT', 'HANDELSB'], ContentsCode: ['HA0201A1'], Tid: ['1998', '1999'] });
  assert.doesNotMatch(url, /=\*/);
});

test('readFixture loads and parses a real committed fixture', () => {
  const fixture = readFixture('tab3195-2024-raw.json');
  assert.equal(fixture.class, 'dataset');
  assert.ok(Array.isArray(fixture.value));
});

test('useFixtures reflects the SWEDEN_TRADE_USE_FIXTURE env var', () => {
  const original = process.env.SWEDEN_TRADE_USE_FIXTURE;
  try {
    delete process.env.SWEDEN_TRADE_USE_FIXTURE;
    assert.equal(useFixtures(), false);
    process.env.SWEDEN_TRADE_USE_FIXTURE = '1';
    assert.equal(useFixtures(), true);
  } finally {
    if (original === undefined) delete process.env.SWEDEN_TRADE_USE_FIXTURE;
    else process.env.SWEDEN_TRADE_USE_FIXTURE = original;
  }
});
