'use strict';

// Decodes a JSON-stat 2.0 dataset (the format SCB's PxWebApi v2 returns --
// dimension categories + a flat row-major `value` array, not flat records)
// into an array of plain row objects: one row per data cell, one key per
// dimension (holding that cell's category code for that dimension) plus a
// `value` key. See https://json-stat.org/format/ for the spec this follows.
function parseJsonStat(dataset) {
  const dimensionIds = dataset.id;
  const sizes = dataset.size;

  // Row-major strides: the last dimension varies fastest, matching how
  // JSON-stat's flat `value` array is laid out.
  const strides = new Array(dimensionIds.length);
  strides[dimensionIds.length - 1] = 1;
  for (let i = dimensionIds.length - 2; i >= 0; i--) {
    strides[i] = strides[i + 1] * sizes[i + 1];
  }

  // category.index maps a dimension's category code -> its position; invert
  // it once per dimension so decoding is a direct array lookup per cell.
  const codesByDimension = dimensionIds.map((dimId) => {
    const index = dataset.dimension[dimId].category.index;
    const codes = new Array(sizes[dimensionIds.indexOf(dimId)]);
    for (const [code, position] of Object.entries(index)) {
      codes[position] = code;
    }
    return codes;
  });

  const totalCells = dataset.value.length;
  const rows = new Array(totalCells);

  for (let flatIndex = 0; flatIndex < totalCells; flatIndex++) {
    const row = { value: dataset.value[flatIndex] };
    let remainder = flatIndex;
    for (let dim = 0; dim < dimensionIds.length; dim++) {
      const position = Math.floor(remainder / strides[dim]) % sizes[dim];
      row[dimensionIds[dim]] = codesByDimension[dim][position];
    }
    rows[flatIndex] = row;
  }

  return rows;
}

// Convenience: dimension label/unit lookups a caller needs to make sense of
// raw category codes (e.g. ContentsCode "HA0201J8" -> "Imports of goods...").
function dimensionLabels(dataset, dimensionId) {
  return dataset.dimension[dimensionId].category.label || {};
}

module.exports = { parseJsonStat, dimensionLabels };
