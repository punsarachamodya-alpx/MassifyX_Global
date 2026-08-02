'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseJsonStat, dimensionLabels } = require('./jsonStatParser');
const { topGoodsCategoriesByImportValue, top5GoodsImportShare } = require('./analysis/goods');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'tab3197-2024-raw.json');
const IMPORT_CODE = 'HA0201CE';

function loadRows() {
  const dataset = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { rows: parseJsonStat(dataset), labels: dimensionLabels(dataset, 'VarugruppSITCrev3') };
}

test('topGoodsCategoriesByImportValue ranks machinery and transport equipment first for 2024', () => {
  const { rows, labels } = loadRows();
  const top = topGoodsCategoriesByImportValue(rows, { importContentsCode: IMPORT_CODE, labels, n: 10 });

  assert.equal(top.length, 10);
  assert.equal(top[0].code, '7');
  assert.equal(top[0].label, 'Machinery and transport equipment');
  assert.equal(top[0].importValueSek, 740225499);
  assert.ok(Math.abs(top[0].share - 0.3848) < 0.0001);
});

test('topGoodsCategoriesByImportValue is sorted strictly descending', () => {
  const { rows, labels } = loadRows();
  const top = topGoodsCategoriesByImportValue(rows, { importContentsCode: IMPORT_CODE, labels, n: 10 });
  for (let i = 1; i < top.length; i++) {
    assert.ok(top[i].importValueSek <= top[i - 1].importValueSek);
  }
});

test('shares across all 10 exhaustive SITC sections sum to ~1', () => {
  const { rows, labels } = loadRows();
  const top = topGoodsCategoriesByImportValue(rows, { importContentsCode: IMPORT_CODE, labels, n: 10 });
  const sumShares = top.reduce((s, g) => s + g.share, 0);
  assert.ok(Math.abs(sumShares - 1) < 1e-9);
});

test('top5GoodsImportShare is the fraction the top 5 sections represent of all 10', () => {
  const { rows } = loadRows();
  const share5 = top5GoodsImportShare(rows, { importContentsCode: IMPORT_CODE, n: 5 });
  assert.ok(share5 > 0 && share5 < 1);
  // Machinery(7) + Chemicals(5) + Manufactured goods(6) + misc.
  // manufactured(8) + Mineral fuels(3) are the real top 5 by value.
  assert.ok(share5 > 0.8, `expected the top 5 of 10 exhaustive sections to dominate, got ${share5}`);
});
