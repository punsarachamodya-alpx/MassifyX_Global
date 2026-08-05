'use strict';

// Splits a multi-dimensional SCB table query into one or more requests that
// each stay under the API's per-query cell cap (~150,000 -- see
// docs/internal/SWEDEN_TRADE_BUILD_INSTRUCTIONS.md Appendix). Pure and
// network-free so it's fully unit-testable: given the codes actually being
// requested per dimension, decide whether a single call suffices and, if
// not, which dimension to split and how.
//
// `dimensionCodes` is a map of dimension id -> array of category codes
// requested for that dimension, already resolved from '*' to the table's
// real codes via its metadata (see scbClient.js / ingest.js). This module
// never talks to SCB and never expands '*' itself -- it only does the
// arithmetic.

function cellCount(dimensionCodes) {
  return Object.values(dimensionCodes).reduce((product, codes) => product * codes.length, 1);
}

// Picks which dimension to split when a query is over the cap: by default,
// the one with the most codes, since splitting the largest dimension needs
// the fewest chunks. A caller can force a specific dimension via
// `preferredChunkDim` (e.g. always chunk by year, so each chunk is a clean,
// auditable period).
function pickChunkDimension(dimensionCodes, preferredChunkDim) {
  if (preferredChunkDim) {
    if (!dimensionCodes[preferredChunkDim]) {
      throw new Error(`pickChunkDimension: "${preferredChunkDim}" is not in dimensionCodes`);
    }
    return preferredChunkDim;
  }
  let best = null;
  for (const dimId of Object.keys(dimensionCodes)) {
    if (!best || dimensionCodes[dimId].length > dimensionCodes[best].length) best = dimId;
  }
  return best;
}

// Splits `codes` into groups of at most `groupSize`, preserving order.
function splitIntoGroups(codes, groupSize) {
  const groups = [];
  for (let i = 0; i < codes.length; i += groupSize) {
    groups.push(codes.slice(i, i + groupSize));
  }
  return groups;
}

// Returns an array of chunk selections (each a full dimensionCodes-shaped
// map) that together cover the original selection, each within `cellCap`.
// Throws rather than silently returning an over-cap chunk if the selection
// can't be brought under the cap by splitting a single dimension.
function planChunks({ dimensionCodes, cellCap, preferredChunkDim }) {
  if (!cellCap || cellCap <= 0) throw new Error('planChunks: cellCap must be a positive number');

  const total = cellCount(dimensionCodes);
  if (total <= cellCap) return [dimensionCodes];

  const chunkDim = pickChunkDimension(dimensionCodes, preferredChunkDim);
  const otherDims = Object.fromEntries(Object.entries(dimensionCodes).filter(([id]) => id !== chunkDim));
  const otherCellCount = cellCount(otherDims);

  if (otherCellCount > cellCap) {
    throw new Error(
      `planChunks: dimensions other than "${chunkDim}" alone need ${otherCellCount} cells, ` +
      `already over cellCap=${cellCap} for even a single code of "${chunkDim}" -- restrict another dimension first`
    );
  }

  const groupSize = Math.max(1, Math.floor(cellCap / otherCellCount));
  const groups = splitIntoGroups(dimensionCodes[chunkDim], groupSize);
  return groups.map((group) => ({ ...dimensionCodes, [chunkDim]: group }));
}

module.exports = { planChunks, cellCount, pickChunkDimension, splitIntoGroups };
