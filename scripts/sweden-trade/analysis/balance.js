'use strict';

// Trade-balance time series from TAB5390 rows (Imports/Exports/Net Trade
// totals, one row per year per ImportExport code).

const SEK_MILLION_TO_THOUSAND = 1000;

// TAB5390 reports in SEK million; every other figure in the output file
// (TAB3195/TAB3197-derived) is SEK thousand, so we convert here once, x1000
// exactly (lossless), to keep the whole file in one consistent unit. This
// is a unit conversion of a table's own reported number, not a rescale or
// estimate of it.
function buildBalanceSeries(rows, { importCode = 'ITOT', exportCode = 'ETOT', contentsCode }) {
  const byYear = new Map();
  for (const row of rows) {
    if (row.ContentsCode !== contentsCode) continue;
    if (row.ImportExport !== importCode && row.ImportExport !== exportCode) continue;
    if (!byYear.has(row.Tid)) byYear.set(row.Tid, {});
    const entry = byYear.get(row.Tid);
    if (row.ImportExport === importCode) entry.importsSek = row.value * SEK_MILLION_TO_THOUSAND;
    if (row.ImportExport === exportCode) entry.exportsSek = row.value * SEK_MILLION_TO_THOUSAND;
  }

  const years = [...byYear.keys()].sort((a, b) => Number(a) - Number(b));
  const importsSek = [];
  const exportsSek = [];
  const balanceSek = [];

  for (const year of years) {
    const entry = byYear.get(year);
    if (entry.importsSek == null || entry.exportsSek == null) {
      throw new Error(`buildBalanceSeries: year ${year} is missing an imports or exports value`);
    }
    importsSek.push(entry.importsSek);
    exportsSek.push(entry.exportsSek);
    balanceSek.push(entry.exportsSek - entry.importsSek);
  }

  return { years: years.map(Number), importsSek, exportsSek, balanceSek };
}

// Year-over-year % change: (thisYear - lastYear) / lastYear, per
// SWEDEN_TRADE_SCHEMA.md. The first year has no prior-year comparison so
// it's omitted entirely, never backfilled with a fabricated 0.
function buildTrendSeries(balance) {
  const years = [];
  const importGrowthPct = [];
  const exportGrowthPct = [];

  for (let i = 1; i < balance.years.length; i++) {
    const prevImports = balance.importsSek[i - 1];
    const prevExports = balance.exportsSek[i - 1];
    years.push(balance.years[i]);
    importGrowthPct.push((balance.importsSek[i] - prevImports) / prevImports);
    exportGrowthPct.push((balance.exportsSek[i] - prevExports) / prevExports);
  }

  return { years, importGrowthPct, exportGrowthPct };
}

module.exports = { buildBalanceSeries, buildTrendSeries, SEK_MILLION_TO_THOUSAND };
