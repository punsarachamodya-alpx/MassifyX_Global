'use strict';

// The shared contract test (DESIGN.md §8): the same assertion logic and a
// copy of the same fixture live in massifyx-intelligence's
// lib/api/contractRules.js + test/fixtures/api-contract-sample.json. If
// either side's contract changes, both copies need updating together.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { assertValidDisruptionEvent } = require('../lib/misContract');

const fixtureEvents = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'mis-api-contract-sample.json'), 'utf8'),
);

test('the recorded MIS fixture satisfies the API contract', () => {
  for (const event of fixtureEvents) {
    assert.doesNotThrow(() => assertValidDisruptionEvent(event));
  }
});

test('rejects a severity outside 1-5', () => {
  assert.throws(
    () => assertValidDisruptionEvent({ ...fixtureEvents[0], severity: 6 }),
    /severity must be an integer 1-5/,
  );
  assert.throws(
    () => assertValidDisruptionEvent({ ...fixtureEvents[0], severity: 0 }),
    /severity must be an integer 1-5/,
  );
});

test('rejects a category outside the fixed enum', () => {
  assert.throws(
    () => assertValidDisruptionEvent({ ...fixtureEvents[0], category: 'sports' }),
    /not in the fixed enum/,
  );
});

test('rejects missing or non-finite lat/lon', () => {
  assert.throws(
    () => assertValidDisruptionEvent({ ...fixtureEvents[0], lat: undefined }),
    /lat\/lon must both be present and finite/,
  );
});

test('rejects a missing id', () => {
  assert.throws(
    () => assertValidDisruptionEvent({ ...fixtureEvents[0], id: '' }),
    /id must be a non-empty stable string/,
  );
});
