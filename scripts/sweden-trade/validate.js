'use strict';

// Data-integrity checks per docs/internal/SWEDEN_TRADE_BUILD_INSTRUCTIONS.md
// §7: totals reconcile within tolerance, no negative values where
// impossible, YoY deltas within sane bounds, every figure internally
// self-consistent. Returns { errors, warnings } -- build.js fails loudly
// (non-zero exit) on any error and only logs warnings. Nothing in here
// mutates or "fixes" the dataset; it only reports what it finds.

const RECONCILE_TOLERANCE = {
  // Same table, same figure (sum of partner rows vs the table's own TOT
  // row) -- spike findings show this should match to a handful of parts in
  // two billion, so keep this tight.
  SAME_TABLE: 0.001, // 0.1%
  // Cross-table sanity checks (TAB5390 vs TAB3195 totals): different
  // collection/adjustment methodology, but still the same underlying
  // economy -- warn well before it's plausible, hard-fail only if it looks
  // like a real bug (wrong table, wrong unit, wrong year).
  CROSS_TABLE_WARN: 0.01, // 1%
  CROSS_TABLE_ERROR: 0.05, // 5%
  // TAB3197 (goods) explicitly excludes confidential data per its own
  // metadata note, so its total runs meaningfully below TAB3195's -- allow
  // a wider band before warning, but still hard-fail on something that
  // looks broken rather than just incomplete.
  GOODS_WARN: 0.02, // 2%
  GOODS_ERROR: 0.15 // 15%
};

const YOY_WARN_ABS = 5.0; // |growth| > 500%

function relativeDiff(a, b) {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / denom;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function validateHero(data, errors) {
  const { hero } = data;
  if (!hero) { errors.push('hero is missing'); return; }
  if (!isFiniteNumber(hero.totalImportsSek) || hero.totalImportsSek < 0) {
    errors.push('hero.totalImportsSek must be a non-negative number');
  }
  if (!isFiniteNumber(hero.totalExportsSek) || hero.totalExportsSek < 0) {
    errors.push('hero.totalExportsSek must be a non-negative number');
  }
  const expectedBalance = hero.totalExportsSek - hero.totalImportsSek;
  if (!isFiniteNumber(hero.tradeBalanceSek) || Math.abs(hero.tradeBalanceSek - expectedBalance) > 1) {
    errors.push(
      `hero.tradeBalanceSek (${hero.tradeBalanceSek}) does not equal totalExportsSek - totalImportsSek (${expectedBalance})`
    );
  }
}

function validateTopPartners(data, errors) {
  const partners = data.topPartners || [];
  if (partners.length === 0) errors.push('topPartners is empty');

  let prevImport = Infinity;
  for (const p of partners) {
    if (!isFiniteNumber(p.importValueSek) || p.importValueSek < 0) {
      errors.push(`topPartners[${p.code}].importValueSek must be a non-negative number`);
    }
    if (p.exportValueSek != null && (!isFiniteNumber(p.exportValueSek) || p.exportValueSek < 0)) {
      errors.push(`topPartners[${p.code}].exportValueSek must be null or a non-negative number`);
    }
    if (!isFiniteNumber(p.share) || p.share < 0 || p.share > 1) {
      errors.push(`topPartners[${p.code}].share must be between 0 and 1`);
    }
    if (!isFiniteNumber(p.lat) || p.lat < -90 || p.lat > 90) {
      errors.push(`topPartners[${p.code}].lat must be a valid latitude`);
    }
    if (!isFiniteNumber(p.lon) || p.lon < -180 || p.lon > 180) {
      errors.push(`topPartners[${p.code}].lon must be a valid longitude`);
    }
    if (p.importValueSek > prevImport) {
      errors.push(`topPartners is not sorted descending by importValueSek at "${p.code}"`);
    }
    prevImport = p.importValueSek;
  }
}

function validateTopGoodsCategories(data, errors) {
  const goods = data.topGoodsCategories || [];
  if (goods.length === 0) errors.push('topGoodsCategories is empty');

  let prevImport = Infinity;
  for (const g of goods) {
    if (!isFiniteNumber(g.importValueSek) || g.importValueSek < 0) {
      errors.push(`topGoodsCategories[${g.code}].importValueSek must be a non-negative number`);
    }
    if (!isFiniteNumber(g.share) || g.share < 0 || g.share > 1) {
      errors.push(`topGoodsCategories[${g.code}].share must be between 0 and 1`);
    }
    if (g.importValueSek > prevImport) {
      errors.push(`topGoodsCategories is not sorted descending by importValueSek at "${g.code}"`);
    }
    prevImport = g.importValueSek;
  }

  const goodsTotal = goods.reduce((sum, g) => sum + (g.importValueSek || 0), 0);
  return goodsTotal;
}

function validateConcentration(data, errors, warnings) {
  const c = data.concentration;
  if (!c) { errors.push('concentration is missing'); return; }
  for (const field of ['top5PartnerImportShare', 'top10PartnerImportShare']) {
    if (!isFiniteNumber(c[field]) || c[field] < 0 || c[field] > 1) {
      errors.push(`concentration.${field} must be between 0 and 1`);
    }
  }
  if (!isFiniteNumber(c.hhiPartners) || c.hhiPartners < 0 || c.hhiPartners > 10000) {
    errors.push('concentration.hhiPartners must be between 0 and 10000');
  }
  if (isFiniteNumber(c.top5PartnerImportShare) && isFiniteNumber(c.top10PartnerImportShare)) {
    if (c.top5PartnerImportShare > c.top10PartnerImportShare + 1e-9) {
      errors.push('concentration.top5PartnerImportShare must not exceed top10PartnerImportShare');
    }
  }
  if (c.top5GoodsImportShare != null) {
    if (!isFiniteNumber(c.top5GoodsImportShare) || c.top5GoodsImportShare < 0 || c.top5GoodsImportShare > 1) {
      errors.push('concentration.top5GoodsImportShare must be null or between 0 and 1');
    }
  } else {
    warnings.push('concentration.top5GoodsImportShare is null (goods data not available for this build)');
  }

  // Self-consistency: top5/top10 partner share should match the same sum
  // computed independently from topPartners itself (both come from the
  // same underlying values, so this should agree almost exactly).
  const partners = [...(data.topPartners || [])].sort((a, b) => b.importValueSek - a.importValueSek);
  const shareSum = (n) => partners.slice(0, n).reduce((sum, p) => sum + p.share, 0);
  if (partners.length >= 5 && isFiniteNumber(c.top5PartnerImportShare)) {
    if (Math.abs(shareSum(5) - c.top5PartnerImportShare) > 1e-6) {
      errors.push('concentration.top5PartnerImportShare is inconsistent with topPartners shares');
    }
  }
  if (partners.length >= 10 && isFiniteNumber(c.top10PartnerImportShare)) {
    if (Math.abs(shareSum(10) - c.top10PartnerImportShare) > 1e-6) {
      errors.push('concentration.top10PartnerImportShare is inconsistent with topPartners shares');
    }
  }
}

function validateBalanceAndTrend(data, errors) {
  const b = data.balance;
  if (!b || !Array.isArray(b.years) || b.years.length === 0) {
    errors.push('balance.years is missing or empty');
    return;
  }
  if (b.importsSek.length !== b.years.length || b.exportsSek.length !== b.years.length || b.balanceSek.length !== b.years.length) {
    errors.push('balance array lengths do not match balance.years');
  }
  for (let i = 0; i < b.years.length; i++) {
    if (i > 0 && b.years[i] <= b.years[i - 1]) {
      errors.push(`balance.years is not strictly ascending at index ${i} (${b.years[i - 1]} -> ${b.years[i]})`);
    }
    if (!isFiniteNumber(b.importsSek[i]) || b.importsSek[i] < 0) {
      errors.push(`balance.importsSek[${b.years[i]}] must be a non-negative number`);
    }
    if (!isFiniteNumber(b.exportsSek[i]) || b.exportsSek[i] < 0) {
      errors.push(`balance.exportsSek[${b.years[i]}] must be a non-negative number`);
    }
    const expected = b.exportsSek[i] - b.importsSek[i];
    if (!isFiniteNumber(b.balanceSek[i]) || Math.abs(b.balanceSek[i] - expected) > 1) {
      errors.push(`balance.balanceSek[${b.years[i]}] does not equal exportsSek - importsSek`);
    }
  }

  const t = data.trend;
  if (!t || !Array.isArray(t.years)) { errors.push('trend.years is missing'); return; }
  if (t.years.length !== b.years.length - 1) {
    errors.push('trend.years should have exactly one fewer entry than balance.years (first year has no prior-year comparison)');
  }
  for (let i = 0; i < t.years.length; i++) {
    if (t.years[i] !== b.years[i + 1]) {
      errors.push(`trend.years[${i}] (${t.years[i]}) does not match balance.years[${i + 1}] (${b.years[i + 1]})`);
    }
  }
  if (t.importGrowthPct.length !== t.years.length || t.exportGrowthPct.length !== t.years.length) {
    errors.push('trend growth-pct array lengths do not match trend.years');
  }
}

function validateYoyBounds(data, warnings) {
  const t = data.trend;
  if (!t) return;
  for (let i = 0; i < t.years.length; i++) {
    if (Math.abs(t.importGrowthPct[i]) > YOY_WARN_ABS) {
      warnings.push(`trend.importGrowthPct[${t.years[i]}] = ${t.importGrowthPct[i]} looks implausible (>500% swing)`);
    }
    if (Math.abs(t.exportGrowthPct[i]) > YOY_WARN_ABS) {
      warnings.push(`trend.exportGrowthPct[${t.years[i]}] = ${t.exportGrowthPct[i]} looks implausible (>500% swing)`);
    }
  }
}

function validateReconciliation(data, errors, warnings, goodsTotal) {
  const { hero, balance, meta } = data;
  if (!hero || !balance || !meta) return;

  const latestIdx = balance.years.indexOf(meta.latestYear);
  if (latestIdx === -1) {
    warnings.push(`meta.latestYear (${meta.latestYear}) is not present in balance.years -- cross-table reconciliation skipped`);
  } else {
    const importsDiff = relativeDiff(balance.importsSek[latestIdx], hero.totalImportsSek);
    const exportsDiff = relativeDiff(balance.exportsSek[latestIdx], hero.totalExportsSek);
    if (importsDiff > RECONCILE_TOLERANCE.CROSS_TABLE_ERROR) {
      errors.push(`balance.importsSek for ${meta.latestYear} diverges ${(importsDiff * 100).toFixed(2)}% from hero.totalImportsSek -- check table/unit`);
    } else if (importsDiff > RECONCILE_TOLERANCE.CROSS_TABLE_WARN) {
      warnings.push(`balance.importsSek for ${meta.latestYear} diverges ${(importsDiff * 100).toFixed(2)}% from hero.totalImportsSek (TAB5390 vs TAB3195 methodology difference)`);
    }
    if (exportsDiff > RECONCILE_TOLERANCE.CROSS_TABLE_ERROR) {
      errors.push(`balance.exportsSek for ${meta.latestYear} diverges ${(exportsDiff * 100).toFixed(2)}% from hero.totalExportsSek -- check table/unit`);
    } else if (exportsDiff > RECONCILE_TOLERANCE.CROSS_TABLE_WARN) {
      warnings.push(`balance.exportsSek for ${meta.latestYear} diverges ${(exportsDiff * 100).toFixed(2)}% from hero.totalExportsSek (TAB5390 vs TAB3195 methodology difference)`);
    }
  }

  if (goodsTotal != null && hero.totalImportsSek) {
    const goodsDiff = relativeDiff(goodsTotal, hero.totalImportsSek);
    if (goodsDiff > RECONCILE_TOLERANCE.GOODS_ERROR) {
      errors.push(`sum of topGoodsCategories (${goodsTotal}) diverges ${(goodsDiff * 100).toFixed(2)}% from hero.totalImportsSek -- check table/unit`);
    } else if (goodsDiff > RECONCILE_TOLERANCE.GOODS_WARN) {
      warnings.push(`sum of topGoodsCategories (${goodsTotal}) diverges ${(goodsDiff * 100).toFixed(2)}% from hero.totalImportsSek (TAB3197 excludes confidential data, per its own metadata note)`);
    }
  }
}

function validateMeta(data, errors) {
  const { meta } = data;
  if (!meta) { errors.push('meta is missing'); return; }
  if (!Array.isArray(meta.tables) || meta.tables.length === 0) errors.push('meta.tables must be a non-empty array');
  if (!Array.isArray(meta.yearsCovered) || meta.yearsCovered.length === 0) errors.push('meta.yearsCovered must be a non-empty array');
  if (data.balance && Array.isArray(data.balance.years)) {
    const sameLength = meta.yearsCovered.length === data.balance.years.length;
    const sameValues = sameLength && meta.yearsCovered.every((y, i) => y === data.balance.years[i]);
    if (!sameValues) errors.push('meta.yearsCovered must match balance.years exactly');
  }
  if (meta.latestYear !== meta.yearsCovered[meta.yearsCovered.length - 1]) {
    errors.push('meta.latestYear must equal the last entry in meta.yearsCovered');
  }
}

function validateDataset(data) {
  const errors = [];
  const warnings = [];

  validateMeta(data, errors);
  validateHero(data, errors);
  validateTopPartners(data, errors);
  const goodsTotal = validateTopGoodsCategories(data, errors);
  validateConcentration(data, errors, warnings);
  validateBalanceAndTrend(data, errors);
  validateYoyBounds(data, warnings);
  validateReconciliation(data, errors, warnings, goodsTotal);

  return { errors, warnings };
}

function assertValid(data) {
  const { errors, warnings } = validateDataset(data);
  for (const w of warnings) console.warn(`[validate] WARNING: ${w}`);
  if (errors.length > 0) {
    const message = `sweden-trade dataset failed validation:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    throw new Error(message);
  }
  return { warnings };
}

module.exports = { validateDataset, assertValid, RECONCILE_TOLERANCE, YOY_WARN_ABS };
