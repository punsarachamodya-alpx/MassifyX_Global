'use strict';

// Stage 1 data spike (see docs/internal/SWEDEN_TRADE_BUILD_INSTRUCTIONS.md
// §9): prove the SCB PxWebApi v2 -> JSON-stat -> rows path works end to end
// against one real table, with no key/auth. Not the production ingest job --
// that's Stage 2. Run: node scripts/sweden-trade/spike-scb-fetch.js
const fs = require('fs');
const path = require('path');
const { parseJsonStat, dimensionLabels } = require('./jsonStatParser');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'tab3195-2024-raw.json');
const SCB_DATA_URL =
  'https://statistikdatabasen.scb.se/api/v2/tables/TAB3195/data' +
  '?lang=en&outputFormat=json-stat2' +
  '&valuecodes[Handelspartner]=*&valuecodes[ContentsCode]=*&valuecodes[Tid]=2024';

async function fetchOrLoadFixture() {
  if (process.env.SWEDEN_TRADE_USE_FIXTURE === '1') {
    return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  }
  const res = await fetch(SCB_DATA_URL);
  if (!res.ok) throw new Error(`SCB request failed: ${res.status} ${res.statusText}`);
  const dataset = await res.json();
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(dataset));
  return dataset;
}

async function main() {
  const dataset = await fetchOrLoadFixture();
  const rows = parseJsonStat(dataset);
  const metricLabels = dimensionLabels(dataset, 'ContentsCode');
  const countryLabels = dimensionLabels(dataset, 'Handelspartner');

  console.log(`Parsed ${rows.length} cells (expected ${dataset.value.length}).`);
  console.log('Metrics:', metricLabels);

  // TOT is the "all partners" aggregate row -- excluded so the ranking is
  // real individual countries, not the total masquerading as one.
  const importRows = rows.filter((r) => r.ContentsCode === 'HA0201J8' && r.Handelspartner !== 'TOT' && r.value != null);
  importRows.sort((a, b) => b.value - a.value);

  console.log('\nTop 10 import partners by value, Sweden 2024 (SEK thousand):');
  importRows.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. ${countryLabels[r.Handelspartner] || r.Handelspartner}: ${r.value.toLocaleString()}`);
  });

  const totRow = rows.find((r) => r.ContentsCode === 'HA0201J8' && r.Handelspartner === 'TOT');
  const summedImports = importRows.reduce((sum, r) => sum + r.value, 0);
  console.log(`\nReconciliation check: sum of partner imports = ${summedImports.toLocaleString()}, reported total = ${totRow.value.toLocaleString()}`);
}

main().catch((err) => {
  console.error('Spike failed:', err.message);
  process.exitCode = 1;
});
