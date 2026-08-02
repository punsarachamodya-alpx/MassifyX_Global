'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseJsonStat, dimensionLabels } = require('./jsonStatParser');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'tab3195-2024-raw.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

test('parseJsonStat decodes every cell in the flat value array', () => {
  const dataset = loadFixture();
  const rows = parseJsonStat(dataset);
  assert.equal(rows.length, dataset.value.length);
});

test('parseJsonStat attaches the correct dimension codes per row (row-major decode)', () => {
  const dataset = loadFixture();
  const rows = parseJsonStat(dataset);
  const totImportRow = rows.find((r) => r.Handelspartner === 'TOT' && r.ContentsCode === 'HA0201J8');
  assert.ok(totImportRow, 'expected a TOT / HA0201J8 row');
  assert.equal(totImportRow.value, 2007233421);
  assert.equal(totImportRow.Tid, '2024');

  const germanyExportRow = rows.find((r) => r.Handelspartner === 'DE' && r.ContentsCode === 'HA0201J9');
  assert.ok(germanyExportRow, 'expected a DE / HA0201J9 row');
  assert.equal(germanyExportRow.value, 211056386);
});

test('parseJsonStat never mutates the input dataset', () => {
  const dataset = loadFixture();
  const before = JSON.stringify(dataset);
  parseJsonStat(dataset);
  assert.equal(JSON.stringify(dataset), before);
});

test('dimensionLabels returns the code->label map for a dimension', () => {
  const dataset = loadFixture();
  const labels = dimensionLabels(dataset, 'ContentsCode');
  assert.equal(labels.HA0201J8, 'Imports of goods from countries of consignment, total values, SEK thousand');
});

test('parseJsonStat decodes a small synthetic 2x3 dataset correctly (row-major order)', () => {
  const dataset = {
    id: ['Country', 'Year'],
    size: [2, 3],
    dimension: {
      Country: { category: { index: { SE: 0, DE: 1 } } },
      Year: { category: { index: { 2022: 0, 2023: 1, 2024: 2 } } }
    },
    value: [1, 2, 3, 4, 5, 6]
  };
  const rows = parseJsonStat(dataset);
  assert.deepEqual(rows, [
    { value: 1, Country: 'SE', Year: '2022' },
    { value: 2, Country: 'SE', Year: '2023' },
    { value: 3, Country: 'SE', Year: '2024' },
    { value: 4, Country: 'DE', Year: '2022' },
    { value: 5, Country: 'DE', Year: '2023' },
    { value: 6, Country: 'DE', Year: '2024' }
  ]);
});
