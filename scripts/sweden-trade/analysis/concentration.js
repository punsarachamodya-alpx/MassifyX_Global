'use strict';

// Generic concentration math, shared across partner and goods analyses.
// Pure, dependency-free, trivial to unit test.

function share(part, total) {
  if (total === 0) return 0;
  return part / total;
}

// Herfindahl-Hirschman Index on a 0-10000 scale: sum of each entity's
// percentage share squared. `values` are raw amounts (not pre-computed
// shares); the function does the share math itself against `total`.
function herfindahlHirschmanIndex(values, total) {
  if (total === 0) return 0;
  return values.reduce((sum, value) => {
    const pct = (value / total) * 100;
    return sum + pct * pct;
  }, 0);
}

module.exports = { share, herfindahlHirschmanIndex };
