'use strict';

// Merges admin JSON overrides (data/content.json) over the shipped defaults in content/.
//
// Why defaults live in code: a missing, empty, or corrupted data/content.json can never
// take the site down — it falls back to the shipped copy. It also makes every admin edit
// a visible diff against a known baseline, so "reset to original" needs no backup step.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

const DEFAULTS = {
  site: require('../content/site'),
  nav: require('../content/nav'),
  appearance: require('../content/appearance'),
  home: require('../content/home'),
  'what-we-do': require('../content/what-we-do'),
  industries: require('../content/industries'),
  'how-we-work': require('../content/how-we-work'),
  'who-we-are': require('../content/who-we-are'),
  contact: require('../content/contact'),
  legal: require('../content/legal')
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function clone(v) {
  if (Array.isArray(v)) return v.map(clone);
  if (isPlainObject(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = clone(v[k]);
    return out;
  }
  return v;
}

// Arrays are replaced wholesale, never merged element-wise: an element-wise merge would
// resurrect a deleted item from the shipped defaults the moment its slot was left empty.
function merge(base, override) {
  if (override === undefined) return clone(base);
  if (Array.isArray(base) || Array.isArray(override)) return clone(override);
  if (isPlainObject(base) && isPlainObject(override)) {
    const out = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(override)])) {
      out[k] = merge(base[k], override[k]);
    }
    return out;
  }
  return clone(override);
}

let cache = null;

function readOverrides() {
  try {
    const raw = fs.readFileSync(CONTENT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[store] ignoring unreadable ${CONTENT_FILE}: ${err.message}`);
    }
    return {};
  }
}

function getAll() {
  if (cache) return cache;
  const overrides = readOverrides();
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = merge(DEFAULTS[key], overrides[key]);
  }
  cache = out;
  return out;
}

function getSection(name) {
  return getAll()[name];
}

function getDefaults(name) {
  return clone(DEFAULTS[name]);
}

function sectionNames() {
  return Object.keys(DEFAULTS);
}

function invalidate() {
  cache = null;
}

function ensureDirs() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backup() {
  ensureDirs();
  if (!fs.existsSync(CONTENT_FILE)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `content-${stamp}.json`;
  fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, name));
  pruneBackups();
  return name;
}

function pruneBackups() {
  const files = listBackups();
  for (const f of files.slice(MAX_BACKUPS)) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
    } catch { /* already gone */ }
  }
}

function listBackups() {
  ensureDirs();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((n) => /^content-[\w-]+\.json$/.test(n))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(BACKUP_DIR, name)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

// Write to a temp file then rename over the target, so a crash mid-write can never
// leave a truncated file behind.
function writeOverrides(next) {
  ensureDirs();
  const tmp = path.join(DATA_DIR, `.content.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, CONTENT_FILE);
  invalidate();
}

function saveSection(name, sectionOverride) {
  backup();
  const overrides = readOverrides();
  overrides[name] = sectionOverride;
  writeOverrides(overrides);
}

function resetSection(name) {
  backup();
  const overrides = readOverrides();
  delete overrides[name];
  writeOverrides(overrides);
}

function restoreBackup(name) {
  if (!/^content-[\w-]+\.json$/.test(name)) throw new Error('Invalid backup name');
  const src = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(src)) throw new Error('Backup not found');
  backup(); // a restore is itself always reversible
  fs.copyFileSync(src, CONTENT_FILE);
  invalidate();
}

module.exports = {
  getAll,
  getSection,
  getDefaults,
  sectionNames,
  invalidate,
  readOverrides,
  saveSection,
  resetSection,
  listBackups,
  restoreBackup,
  CONTENT_FILE
};
