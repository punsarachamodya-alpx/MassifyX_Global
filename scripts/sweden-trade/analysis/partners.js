'use strict';

// Partner rankings and concentration from TAB3195 rows (trading partner x
// import/export value, one year). "TOT" is the all-partners aggregate row
// SCB includes -- excluded from rankings so it never masquerades as a real
// country, but used as the reconciliation total.

const { share, herfindahlHirschmanIndex } = require('./concentration');

const TOTAL_PARTNER_CODE = 'TOT';

function findTotalImports(rows, importContentsCode) {
  const totRow = rows.find((r) => r.Handelspartner === TOTAL_PARTNER_CODE && r.ContentsCode === importContentsCode);
  if (!totRow) throw new Error('findTotalImports: no TOT row found for the given import ContentsCode');
  return totRow.value;
}

// Import value per real (non-aggregate) partner, keyed by ISO country code.
function extractImportValuesByPartner(rows, importContentsCode) {
  const byCountry = new Map();
  for (const row of rows) {
    if (row.Handelspartner === TOTAL_PARTNER_CODE) continue;
    if (row.ContentsCode !== importContentsCode) continue;
    if (row.value == null) continue;
    byCountry.set(row.Handelspartner, row.value);
  }
  return byCountry;
}

// Import + export value per real partner, keyed by ISO country code.
function extractPartnerValues(rows, { importContentsCode, exportContentsCode }) {
  const byCountry = new Map();
  for (const row of rows) {
    if (row.Handelspartner === TOTAL_PARTNER_CODE) continue;
    if (row.ContentsCode !== importContentsCode && row.ContentsCode !== exportContentsCode) continue;
    if (!byCountry.has(row.Handelspartner)) {
      byCountry.set(row.Handelspartner, { importValueSek: null, exportValueSek: null });
    }
    const entry = byCountry.get(row.Handelspartner);
    if (row.ContentsCode === importContentsCode) entry.importValueSek = row.value;
    if (row.ContentsCode === exportContentsCode) entry.exportValueSek = row.value;
  }
  return byCountry;
}

// Top-N partners by import value, with the label + coordinate lookups the
// schema requires. Throws rather than inventing a lat/lon if a top-N
// partner has no configured coordinates.
function topPartnersByImportValue(rows, { importContentsCode, exportContentsCode, labels, coords, n = 10 }) {
  const totalImports = findTotalImports(rows, importContentsCode);
  const byCountry = extractPartnerValues(rows, { importContentsCode, exportContentsCode });

  const ranked = [...byCountry.entries()]
    .filter(([, v]) => v.importValueSek != null)
    .sort((a, b) => b[1].importValueSek - a[1].importValueSek)
    .slice(0, n);

  return ranked.map(([code, v]) => {
    const coord = coords[code];
    if (!coord) {
      throw new Error(
        `topPartnersByImportValue: no coordinates configured for partner "${code}" ` +
        `(${labels[code] || 'unknown label'}) -- add it to coords.js, never invent one`
      );
    }
    return {
      code,
      // SCB's own label text, trimmed of incidental whitespace (e.g. "Kingdom
      // of the Netherlands " has a trailing space in the source) -- this is
      // formatting hygiene on a real label, never a rewording of it.
      label: (labels[code] || code).trim(),
      importValueSek: v.importValueSek,
      exportValueSek: v.exportValueSek,
      share: share(v.importValueSek, totalImports),
      lat: coord.lat,
      lon: coord.lon
    };
  });
}

// Concentration over ALL real partners (not just the top N), per
// SWEDEN_TRADE_SCHEMA.md.
function partnerConcentration(rows, { importContentsCode, top5N = 5, top10N = 10 }) {
  const totalImports = findTotalImports(rows, importContentsCode);
  const importValues = [...extractImportValuesByPartner(rows, importContentsCode).values()];
  const sorted = [...importValues].sort((a, b) => b - a);

  const top5Sum = sorted.slice(0, top5N).reduce((sum, v) => sum + v, 0);
  const top10Sum = sorted.slice(0, top10N).reduce((sum, v) => sum + v, 0);

  return {
    top5PartnerImportShare: share(top5Sum, totalImports),
    top10PartnerImportShare: share(top10Sum, totalImports),
    hhiPartners: herfindahlHirschmanIndex(importValues, totalImports)
  };
}

module.exports = {
  TOTAL_PARTNER_CODE,
  findTotalImports,
  extractImportValuesByPartner,
  extractPartnerValues,
  topPartnersByImportValue,
  partnerConcentration
};
