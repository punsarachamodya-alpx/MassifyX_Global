'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseJsonStat } = require('./jsonStatParser');
const { buildBalanceSeries, buildTrendSeries, SEK_MILLION_TO_THOUSAND } = require('./analysis/balance');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'tab5390-1998-2024-raw.json');
const CONTENTS_CODE = 'HA0201A1';

function loadRows() {
  const dataset = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return parseJsonStat(dataset);
}

test('buildBalanceSeries covers 1998-2024 with no gaps, ascending', () => {
  const rows = loadRows();
  const balance = buildBalanceSeries(rows, { contentsCode: CONTENTS_CODE });
  assert.equal(balance.years.length, 27);
  assert.equal(balance.years[0], 1998);
  assert.equal(balance.years[balance.years.length - 1], 2024);
  for (let i = 1; i < balance.years.length; i++) {
    assert.equal(balance.years[i], balance.years[i - 1] + 1);
  }
});

test('buildBalanceSeries converts SEK million (TAB5390\'s native unit) to SEK thousand', () => {
  const rows = loadRows();
  const balance = buildBalanceSeries(rows, { contentsCode: CONTENTS_CODE });
  const idx2024 = balance.years.indexOf(2024);
  assert.equal(balance.importsSek[idx2024], 2007400 * SEK_MILLION_TO_THOUSAND);
  assert.equal(balance.exportsSek[idx2024], 2063000 * SEK_MILLION_TO_THOUSAND);
});

test('buildBalanceSeries.balanceSek always equals exportsSek - importsSek', () => {
  const rows = loadRows();
  const balance = buildBalanceSeries(rows, { contentsCode: CONTENTS_CODE });
  for (let i = 0; i < balance.years.length; i++) {
    assert.equal(balance.balanceSek[i], balance.exportsSek[i] - balance.importsSek[i]);
  }
});

test('buildBalanceSeries 2024 shows Sweden ran a trade surplus (matches the already-verified hero figure)', () => {
  const rows = loadRows();
  const balance = buildBalanceSeries(rows, { contentsCode: CONTENTS_CODE });
  const idx2024 = balance.years.indexOf(2024);
  assert.ok(balance.balanceSek[idx2024] > 0, 'expected a 2024 surplus');
});

test('buildTrendSeries omits the first year (no prior-year comparison) rather than fabricating a 0', () => {
  const rows = loadRows();
  const balance = buildBalanceSeries(rows, { contentsCode: CONTENTS_CODE });
  const trend = buildTrendSeries(balance);
  assert.equal(trend.years.length, balance.years.length - 1);
  assert.equal(trend.years[0], 1999);
  assert.ok(!trend.years.includes(1998));
});

test('buildTrendSeries computes (thisYear - lastYear) / lastYear for 2024 vs 2023', () => {
  const rows = loadRows();
  const balance = buildBalanceSeries(rows, { contentsCode: CONTENTS_CODE });
  const trend = buildTrendSeries(balance);
  const idx2024 = trend.years.indexOf(2024);
  assert.ok(Math.abs(trend.importGrowthPct[idx2024] - (2007400 - 2050300) / 2050300) < 1e-9);
  assert.ok(Math.abs(trend.exportGrowthPct[idx2024] - (2063000 - 2096200) / 2096200) < 1e-9);
});
