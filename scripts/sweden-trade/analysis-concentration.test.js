'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { share, herfindahlHirschmanIndex } = require('./analysis/concentration');

test('share divides part by total', () => {
  assert.equal(share(50, 200), 0.25);
});

test('share returns 0 rather than dividing by zero', () => {
  assert.equal(share(50, 0), 0);
});

test('herfindahlHirschmanIndex is 10000 for a single-entity monopoly', () => {
  assert.equal(herfindahlHirschmanIndex([100], 100), 10000);
});

test('herfindahlHirschmanIndex splits evenly across N equal entities as 10000/N', () => {
  const values = [25, 25, 25, 25];
  const hhi = herfindahlHirschmanIndex(values, 100);
  assert.equal(hhi, 2500); // 4 x 25^2 = 4 x 625 = 2500 = 10000/4
});

test('herfindahlHirschmanIndex returns 0 for a zero total', () => {
  assert.equal(herfindahlHirschmanIndex([1, 2, 3], 0), 0);
});
