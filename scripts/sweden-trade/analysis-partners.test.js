'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseJsonStat, dimensionLabels } = require('./jsonStatParser');
const { topPartnersByImportValue, partnerConcentration, findTotalImports } = require('./analysis/partners');
const coords = require('./coords');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'tab3195-2024-raw.json');
const IMPORT_CODE = 'HA0201J8';
const EXPORT_CODE = 'HA0201J9';

function loadRows() {
  const dataset = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { rows: parseJsonStat(dataset), labels: dimensionLabels(dataset, 'Handelspartner') };
}

test('findTotalImports reads the real TOT row from the fixture', () => {
  const { rows } = loadRows();
  assert.equal(findTotalImports(rows, IMPORT_CODE), 2007233421);
});

test('topPartnersByImportValue reproduces the already-verified 2024 top 10', () => {
  const { rows, labels } = loadRows();
  const top = topPartnersByImportValue(rows, { importContentsCode: IMPORT_CODE, exportContentsCode: EXPORT_CODE, labels, coords, n: 10 });

  assert.equal(top.length, 10);
  assert.deepEqual(top.map((p) => p.code), ['DE', 'NL', 'NO', 'DK', 'CN', 'FI', 'BE', 'PL', 'GB', 'US']);

  assert.equal(top[0].label, 'Germany');
  assert.equal(top[0].importValueSek, 322527320);
  assert.equal(top[0].exportValueSek, 211056386);
  assert.ok(Math.abs(top[0].share - 0.1607) < 0.0001);
  assert.equal(top[0].lat, 52.52);
  assert.equal(top[0].lon, 13.405);

  // China's export row is present and non-null in the real fixture (SEK
  // 76,215,988 thousand) -- note this corrects a null placeholder that had
  // been in the pre-Stage-2 content/sweden-trade-data.json; that null did
  // not match the underlying TAB3195 data.
  const china = top.find((p) => p.code === 'CN');
  assert.equal(china.exportValueSek, 76215988);
});

test('topPartnersByImportValue is sorted strictly descending by import value', () => {
  const { rows, labels } = loadRows();
  const top = topPartnersByImportValue(rows, { importContentsCode: IMPORT_CODE, exportContentsCode: EXPORT_CODE, labels, coords, n: 10 });
  for (let i = 1; i < top.length; i++) {
    assert.ok(top[i].importValueSek <= top[i - 1].importValueSek);
  }
});

test('topPartnersByImportValue throws rather than inventing coordinates for an unconfigured partner', () => {
  const { rows, labels } = loadRows();
  assert.throws(
    () => topPartnersByImportValue(rows, { importContentsCode: IMPORT_CODE, exportContentsCode: EXPORT_CODE, labels, coords: {}, n: 1 }),
    /no coordinates configured/
  );
});

test('partnerConcentration reproduces the already-verified 2024 concentration figures', () => {
  const { rows } = loadRows();
  const c = partnerConcentration(rows, { importContentsCode: IMPORT_CODE });
  assert.ok(Math.abs(c.top5PartnerImportShare - 0.4908) < 0.0001);
  assert.ok(Math.abs(c.top10PartnerImportShare - 0.7067) < 0.0001);
  assert.ok(Math.abs(c.hhiPartners - 689.3) < 0.1);
});
