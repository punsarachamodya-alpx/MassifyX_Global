'use strict';

// Offline analysis job (see docs/internal/SWEDEN_TRADE_BUILD_INSTRUCTIONS.md
// §4, §9 Stage 2): ingest -> parse -> analyse -> validate -> atomic-write
// content/sweden-trade-data.json. Run with `npm run data:sweden-trade`, or
// `SWEDEN_TRADE_USE_FIXTURE=1 npm run data:sweden-trade` to replay from the
// committed fixtures instead of calling SCB (deterministic, network-free).
//
// The live site has zero runtime dependency on SCB -- this script is the
// only thing that ever talks to it, and its only output is the static file
// the story page reads.

const fs = require('fs');
const path = require('path');

const { ingestTable } = require('./ingest');
const { topPartnersByImportValue, partnerConcentration } = require('./analysis/partners');
const { topGoodsCategoriesByImportValue, top5GoodsImportShare } = require('./analysis/goods');
const { buildBalanceSeries, buildTrendSeries } = require('./analysis/balance');
const { assertValid } = require('./validate');
const coords = require('./coords');

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'content', 'sweden-trade-data.json');

// Kept fixed rather than re-derived from "now" so a re-run always reproduces
// the same, already-audited 2024 figures until this is deliberately rolled
// forward to a newer completed year.
const LATEST_YEAR = 2024;
const FIRST_YEAR = 1998; // earliest year TAB3195 (partner breakdown) covers

const TAB3195 = {
  id: 'TAB3195',
  importContentsCode: 'HA0201J8',
  exportContentsCode: 'HA0201J9',
  metadataFixture: 'tab3195-metadata.json',
  chunkFixtures: ['tab3195-2024-raw.json']
};

const TAB3197 = {
  id: 'TAB3197',
  importContentsCode: 'HA0201CE',
  exportContentsCode: 'HA0201CG',
  metadataFixture: 'tab3197-metadata.json',
  chunkFixtures: ['tab3197-2024-raw.json']
};

const TAB5390 = {
  id: 'TAB5390',
  contentsCode: 'HA0201A1',
  metadataFixture: 'tab5390-metadata.json',
  chunkFixtures: ['tab5390-1998-2024-raw.json']
};

function yearRange(first, last) {
  const years = [];
  for (let y = first; y <= last; y++) years.push(String(y));
  return years;
}

async function ingestPartners() {
  return ingestTable(
    TAB3195.id,
    { Handelspartner: '*', ContentsCode: '*', Tid: [String(LATEST_YEAR)] },
    { metadataFixture: TAB3195.metadataFixture, chunkFixtures: TAB3195.chunkFixtures }
  );
}

async function ingestGoods() {
  return ingestTable(
    TAB3197.id,
    {
      Handelspartner: ['TOT'],
      VarugruppSITCrev3: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      ContentsCode: [TAB3197.importContentsCode, TAB3197.exportContentsCode],
      Tid: [String(LATEST_YEAR)]
    },
    { metadataFixture: TAB3197.metadataFixture, chunkFixtures: TAB3197.chunkFixtures }
  );
}

async function ingestBalance() {
  return ingestTable(
    TAB5390.id,
    { ImportExport: '*', ContentsCode: '*', Tid: yearRange(FIRST_YEAR, LATEST_YEAR) },
    { metadataFixture: TAB5390.metadataFixture, chunkFixtures: TAB5390.chunkFixtures }
  );
}

function buildHero(partnerRows) {
  const totRow = partnerRows.find((r) => r.Handelspartner === 'TOT' && r.ContentsCode === TAB3195.importContentsCode);
  const totExportRow = partnerRows.find((r) => r.Handelspartner === 'TOT' && r.ContentsCode === TAB3195.exportContentsCode);
  if (!totRow || !totExportRow) throw new Error('buildHero: TAB3195 TOT rows not found for the configured ContentsCode');
  return {
    year: LATEST_YEAR,
    totalImportsSek: totRow.value,
    totalExportsSek: totExportRow.value,
    tradeBalanceSek: totExportRow.value - totRow.value
  };
}

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function formatSek(thousands) {
  const sek = thousands * 1000;
  return `SEK ${(sek / 1e9).toFixed(1)}bn`;
}

async function main() {
  const [partners, goods, balanceSource] = await Promise.all([ingestPartners(), ingestGoods(), ingestBalance()]);

  const hero = buildHero(partners.rows);

  const topPartners = topPartnersByImportValue(partners.rows, {
    importContentsCode: TAB3195.importContentsCode,
    exportContentsCode: TAB3195.exportContentsCode,
    labels: partners.labels.Handelspartner,
    coords,
    n: 10
  });

  const partnerConc = partnerConcentration(partners.rows, { importContentsCode: TAB3195.importContentsCode });

  const topGoodsCategories = topGoodsCategoriesByImportValue(goods.rows, {
    importContentsCode: TAB3197.importContentsCode,
    labels: goods.labels.VarugruppSITCrev3,
    n: 10
  });

  const goodsShare5 = top5GoodsImportShare(goods.rows, { importContentsCode: TAB3197.importContentsCode, n: 5 });

  const balance = buildBalanceSeries(balanceSource.rows, { contentsCode: TAB5390.contentsCode });
  const trend = buildTrendSeries(balance);

  const dataset = {
    meta: {
      source: 'Statistics Sweden (SCB)',
      sourceUrl: 'https://www.scb.se/en/services/open-data-api/pxwebapi/',
      tables: [TAB3195.id, TAB3197.id, TAB5390.id],
      generatedAt: new Date().toISOString(),
      latestYear: LATEST_YEAR,
      yearsCovered: balance.years
    },
    hero,
    topGoodsCategories,
    topPartners,
    concentration: {
      top5PartnerImportShare: partnerConc.top5PartnerImportShare,
      top10PartnerImportShare: partnerConc.top10PartnerImportShare,
      hhiPartners: partnerConc.hhiPartners,
      top5GoodsImportShare: goodsShare5
    },
    balance,
    trend
  };

  const { warnings } = assertValid(dataset);

  atomicWriteJson(OUTPUT_PATH, dataset);

  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Validation: 0 errors, ${warnings.length} warning(s).`);

  console.log(`\nHero ${LATEST_YEAR}: imports ${formatSek(hero.totalImportsSek)}, exports ${formatSek(hero.totalExportsSek)}, ` +
    `balance ${hero.tradeBalanceSek >= 0 ? '+' : ''}${formatSek(hero.tradeBalanceSek)} (${hero.tradeBalanceSek >= 0 ? 'surplus' : 'deficit'})`);

  const lastTrendIdx = trend.years.length - 1;
  if (lastTrendIdx >= 0) {
    const importGrowth = (trend.importGrowthPct[lastTrendIdx] * 100).toFixed(1);
    const exportGrowth = (trend.exportGrowthPct[lastTrendIdx] * 100).toFixed(1);
    console.log(`YoY ${trend.years[lastTrendIdx]} vs ${trend.years[lastTrendIdx] - 1}: imports ${importGrowth}%, exports ${exportGrowth}%`);
  }

  console.log('\nTop goods categories by import value:');
  topGoodsCategories.forEach((g, i) => {
    console.log(`  ${i + 1}. [${g.code}] ${g.label}: ${formatSek(g.importValueSek)} (${(g.share * 100).toFixed(1)}%)`);
  });
}

main().catch((err) => {
  console.error(`\nsweden-trade build failed: ${err.message}`);
  process.exitCode = 1;
});
