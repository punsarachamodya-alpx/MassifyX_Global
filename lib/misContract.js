'use strict';

// Duplicated intentionally from massifyx-intelligence's
// lib/api/contractRules.js (DESIGN.md §8: the contract test runs in both
// repos against a recorded fixture so the site and MIS cannot silently
// drift). If MIS's contract changes, this file and
// test/fixtures/mis-api-contract-sample.json need updating too.
const CATEGORY_ENUM = [
  'weather',
  'geopolitical',
  'labor',
  'logistics',
  'regulatory',
  'supplier',
  'other',
];

function assertValidDisruptionEvent(event) {
  const errors = [];

  if (!Number.isInteger(event.severity) || event.severity < 1 || event.severity > 5) {
    errors.push(`severity must be an integer 1-5, got ${event.severity}`);
  }
  if (!CATEGORY_ENUM.includes(event.category)) {
    errors.push(`category "${event.category}" is not in the fixed enum`);
  }
  if (!Number.isFinite(event.lat) || !Number.isFinite(event.lon)) {
    errors.push('lat/lon must both be present and finite');
  }
  if (typeof event.id !== 'string' || event.id.length === 0) {
    errors.push('id must be a non-empty stable string');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid disruption event: ${errors.join('; ')}`);
  }
}

module.exports = { assertValidDisruptionEvent, CATEGORY_ENUM };
