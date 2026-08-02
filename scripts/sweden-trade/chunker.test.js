'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planChunks, cellCount, pickChunkDimension, splitIntoGroups } = require('./chunker');

test('cellCount multiplies the length of every dimension', () => {
  assert.equal(cellCount({ A: ['1', '2'], B: ['x', 'y', 'z'] }), 6);
  assert.equal(cellCount({ A: ['1'] }), 1);
});

test('planChunks returns a single chunk when already under the cap', () => {
  const dimensionCodes = { Country: ['SE', 'DE'], Year: ['2023', '2024'] };
  const chunks = planChunks({ dimensionCodes, cellCap: 150000 });
  assert.equal(chunks.length, 1);
  assert.deepEqual(chunks[0], dimensionCodes);
});

test('planChunks splits the largest dimension by default when over the cap', () => {
  const dimensionCodes = {
    Country: ['SE', 'DE'], // 2
    Year: ['2020', '2021', '2022', '2023', '2024'] // 5 -- the largest dimension
  };
  // cap=6 -> other dims (Country) = 2 cells/code of Year, so groupSize = floor(6/2) = 3
  const chunks = planChunks({ dimensionCodes, cellCap: 6 });
  assert.equal(chunks.length, 2); // groups of 3 and 2 years
  assert.deepEqual(chunks[0].Year, ['2020', '2021', '2022']);
  assert.deepEqual(chunks[1].Year, ['2023', '2024']);
  // Country is untouched in every chunk
  for (const chunk of chunks) assert.deepEqual(chunk.Country, ['SE', 'DE']);
  // Every chunk stays within the cap and the union covers the original set
  for (const chunk of chunks) assert.ok(cellCount(chunk) <= 6);
  const allYears = chunks.flatMap((c) => c.Year);
  assert.deepEqual(allYears, dimensionCodes.Year);
});

test('planChunks honours preferredChunkDim over the largest-dimension default', () => {
  const dimensionCodes = { Country: ['SE', 'DE', 'FR', 'NO'], Year: ['2023', '2024'] };
  const chunks = planChunks({ dimensionCodes, cellCap: 4, preferredChunkDim: 'Country' });
  for (const chunk of chunks) assert.deepEqual(chunk.Year, ['2023', '2024']);
  const allCountries = chunks.flatMap((c) => c.Country);
  assert.deepEqual(allCountries, dimensionCodes.Country);
});

test('planChunks throws if cellCap is not a positive number', () => {
  assert.throws(() => planChunks({ dimensionCodes: { A: ['1'] }, cellCap: 0 }), /positive number/);
  assert.throws(() => planChunks({ dimensionCodes: { A: ['1'] }, cellCap: -5 }), /positive number/);
});

test('planChunks throws rather than emitting an over-cap chunk when other dimensions alone exceed the cap', () => {
  const dimensionCodes = { Country: Array.from({ length: 300 }, (_, i) => `C${i}`), Year: ['2023', '2024', '2025'] };
  // Country alone (300) * one Year already exceeds a cap of 100
  assert.throws(
    () => planChunks({ dimensionCodes, cellCap: 100, preferredChunkDim: 'Year' }),
    /restrict another dimension first/
  );
});

test('planChunks throws for an unknown preferredChunkDim', () => {
  assert.throws(() => planChunks({ dimensionCodes: { A: ['1', '2'] }, cellCap: 1, preferredChunkDim: 'B' }), /not in dimensionCodes/);
});

test('pickChunkDimension picks the dimension with the most codes', () => {
  assert.equal(pickChunkDimension({ A: ['1', '2'], B: ['1', '2', '3'] }), 'B');
});

test('splitIntoGroups preserves order and covers every element', () => {
  const groups = splitIntoGroups(['a', 'b', 'c', 'd', 'e'], 2);
  assert.deepEqual(groups, [['a', 'b'], ['c', 'd'], ['e']]);
});

test('planChunks realistic case: TAB3197 restricted to TOT partner needs no chunking', () => {
  // Mirrors the real production selection: 1 partner x 10 SITC sections x 2
  // content codes x 1 year = 20 cells, nowhere near the 150k cap.
  const dimensionCodes = {
    Handelspartner: ['TOT'],
    VarugruppSITCrev3: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    ContentsCode: ['HA0201CE', 'HA0201CG'],
    Tid: ['2024']
  };
  const chunks = planChunks({ dimensionCodes, cellCap: 150000 });
  assert.equal(chunks.length, 1);
});
