'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveSelection, ingestTable } = require('./ingest');

const FAKE_METADATA = {
  id: ['Country', 'Year'],
  dimension: {
    Country: { category: { index: { SE: 0, DE: 1, NO: 2 } } },
    Year: { category: { index: { 2023: 0, 2024: 1 } } }
  }
};

test('resolveSelection expands "*" to every real code from metadata', () => {
  const resolved = resolveSelection(FAKE_METADATA, { Country: '*', Year: ['2024'] });
  assert.deepEqual(resolved.Country, ['SE', 'DE', 'NO']);
  assert.deepEqual(resolved.Year, ['2024']);
});

test('resolveSelection passes explicit code arrays through unchanged', () => {
  const resolved = resolveSelection(FAKE_METADATA, { Country: ['SE'], Year: ['2023', '2024'] });
  assert.deepEqual(resolved.Country, ['SE']);
  assert.deepEqual(resolved.Year, ['2023', '2024']);
});

test('resolveSelection throws if a mandatory dimension has no selection (mirrors SCB\'s own 400 behaviour)', () => {
  assert.throws(() => resolveSelection(FAKE_METADATA, { Country: '*' }), /missing selection for mandatory dimension "Year"/);
});

// Runs the full ingest pipeline against the committed TAB3195 fixture, with
// no live network call (fixture mode forces every fetch to read from disk).
test('ingestTable replays a real fixture end to end and produces parsed rows', async (t) => {
  const original = process.env.SWEDEN_TRADE_USE_FIXTURE;
  process.env.SWEDEN_TRADE_USE_FIXTURE = '1';
  t.after(() => {
    if (original === undefined) delete process.env.SWEDEN_TRADE_USE_FIXTURE;
    else process.env.SWEDEN_TRADE_USE_FIXTURE = original;
  });

  const result = await ingestTable(
    'TAB3195',
    { Handelspartner: '*', ContentsCode: '*', Tid: ['2024'] },
    { metadataFixture: 'tab3195-metadata.json', chunkFixtures: ['tab3195-2024-raw.json'] }
  );

  assert.equal(result.chunkCount, 1);
  assert.ok(result.rows.length > 0);
  const totRow = result.rows.find((r) => r.Handelspartner === 'TOT' && r.ContentsCode === 'HA0201J8');
  assert.equal(totRow.value, 2007233421);
  assert.equal(result.labels.Handelspartner.DE, 'Germany');
});
