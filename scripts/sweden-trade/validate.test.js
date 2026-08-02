'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDataset, assertValid } = require('./validate');

// A hand-built, internally-consistent dataset satisfying every rule in
// validate.js -- used as the baseline for both a "this passes clean" test
// and a series of "mutate one field, expect one error" tests below.
function buildValidDataset() {
  return {
    meta: {
      source: 'Statistics Sweden (SCB)',
      sourceUrl: 'https://www.scb.se/en/services/open-data-api/pxwebapi/',
      tables: ['TAB3195', 'TAB3197', 'TAB5390'],
      generatedAt: '2026-08-02T10:00:00.000Z',
      latestYear: 2024,
      yearsCovered: [2022, 2023, 2024]
    },
    hero: { year: 2024, totalImportsSek: 1000000, totalExportsSek: 1100000, tradeBalanceSek: 100000 },
    topGoodsCategories: [
      { code: '7', label: 'Machinery', importValueSek: 600000, share: 0.6 },
      { code: '5', label: 'Chemicals', importValueSek: 300000, share: 0.3 },
      { code: '0', label: 'Food', importValueSek: 100000, share: 0.1 }
    ],
    topPartners: [
      { code: 'DE', label: 'Germany', importValueSek: 300000, exportValueSek: 200000, share: 0.3, lat: 52.52, lon: 13.405 },
      { code: 'NL', label: 'Netherlands', importValueSek: 250000, exportValueSek: 150000, share: 0.25, lat: 52.37, lon: 4.9 },
      { code: 'NO', label: 'Norway', importValueSek: 200000, exportValueSek: 190000, share: 0.2, lat: 59.91, lon: 10.75 },
      { code: 'DK', label: 'Denmark', importValueSek: 100000, exportValueSek: 90000, share: 0.1, lat: 55.68, lon: 12.57 },
      { code: 'FI', label: 'Finland', importValueSek: 50000, exportValueSek: 60000, share: 0.05, lat: 60.17, lon: 24.94 }
    ],
    concentration: { top5PartnerImportShare: 0.9, top10PartnerImportShare: 0.9, hhiPartners: 2050, top5GoodsImportShare: 0.9 },
    balance: {
      years: [2022, 2023, 2024],
      importsSek: [900000, 950000, 1000000],
      exportsSek: [980000, 1050000, 1100000],
      balanceSek: [80000, 100000, 100000]
    },
    trend: {
      years: [2023, 2024],
      importGrowthPct: [(950000 - 900000) / 900000, (1000000 - 950000) / 950000],
      exportGrowthPct: [(1050000 - 980000) / 980000, (1100000 - 1050000) / 1050000]
    }
  };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

test('a well-formed, internally-consistent dataset passes with zero errors', () => {
  const { errors, warnings } = validateDataset(buildValidDataset());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('assertValid throws a single Error listing every problem when the dataset is invalid', () => {
  const data = clone(buildValidDataset());
  data.hero.totalImportsSek = -5;
  assert.throws(() => assertValid(data), /failed validation/);
});

test('rejects a negative hero.totalImportsSek', () => {
  const data = clone(buildValidDataset());
  data.hero.totalImportsSek = -1;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('hero.totalImportsSek')));
});

test('rejects a tradeBalanceSek that does not equal exports - imports', () => {
  const data = clone(buildValidDataset());
  data.hero.tradeBalanceSek = 999999;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('hero.tradeBalanceSek')));
});

test('rejects a negative topPartners importValueSek', () => {
  const data = clone(buildValidDataset());
  data.topPartners[0].importValueSek = -100;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('importValueSek')));
});

test('rejects topPartners not sorted descending', () => {
  const data = clone(buildValidDataset());
  [data.topPartners[0], data.topPartners[1]] = [data.topPartners[1], data.topPartners[0]];
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('not sorted descending')));
});

test('rejects an out-of-range latitude', () => {
  const data = clone(buildValidDataset());
  data.topPartners[0].lat = 200;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('.lat')));
});

test('rejects a share outside [0, 1]', () => {
  const data = clone(buildValidDataset());
  data.topPartners[0].share = 1.5;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('.share')));
});

test('rejects concentration.hhiPartners outside [0, 10000]', () => {
  const data = clone(buildValidDataset());
  data.concentration.hhiPartners = 15000;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('hhiPartners')));
});

test('rejects concentration shares inconsistent with topPartners (self-consistency check)', () => {
  const data = clone(buildValidDataset());
  data.concentration.top5PartnerImportShare = 0.5; // doesn't match the sum of the 5 partner shares (0.9)
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('inconsistent with topPartners shares')));
});

test('warns (does not error) when concentration.top5GoodsImportShare is null', () => {
  const data = clone(buildValidDataset());
  data.concentration.top5GoodsImportShare = null;
  const { errors, warnings } = validateDataset(data);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('top5GoodsImportShare is null')));
});

test('rejects balance.years that are not strictly ascending', () => {
  const data = clone(buildValidDataset());
  data.balance.years = [2022, 2024, 2023];
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('not strictly ascending')));
});

test('rejects balance.balanceSek that does not equal exports - imports', () => {
  const data = clone(buildValidDataset());
  data.balance.balanceSek[2] = 12345;
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('does not equal exportsSek - importsSek')));
});

test('rejects a trend.years length that is not balance.years.length - 1', () => {
  const data = clone(buildValidDataset());
  data.trend.years.push(2025);
  data.trend.importGrowthPct.push(0.01);
  data.trend.exportGrowthPct.push(0.01);
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('exactly one fewer entry')));
});

test('warns (does not error) on an implausible >500% YoY swing', () => {
  const data = clone(buildValidDataset());
  data.trend.importGrowthPct[1] = 6.0; // 600%
  const { errors, warnings } = validateDataset(data);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('implausible')));
});

test('rejects meta.yearsCovered that does not match balance.years', () => {
  const data = clone(buildValidDataset());
  data.meta.yearsCovered = [2023, 2024];
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('meta.yearsCovered must match balance.years')));
});

test('hard-fails (not just warns) when a cross-table total is wildly off, e.g. a unit-conversion bug', () => {
  const data = clone(buildValidDataset());
  data.balance.importsSek[2] = data.hero.totalImportsSek * 1000; // simulate a forgotten/duplicated unit conversion
  const { errors } = validateDataset(data);
  assert.ok(errors.some((e) => e.includes('diverges') && e.includes('check table/unit')));
});

test('soft-warns (not errors) on the known, small TAB3197-vs-TAB3195 confidential-data gap', () => {
  const data = clone(buildValidDataset());
  // Shrink the goods total by ~4%, mirroring the real, expected, documented gap.
  data.topGoodsCategories[2].importValueSek = 60000;
  data.topGoodsCategories[2].share = 0.06;
  const { errors, warnings } = validateDataset(data);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('confidential data')));
});
