'use strict';

// Dotted-path get/set, plus the textarea <-> array helpers the admin form relies on.

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}

function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  const last = keys.pop();
  let cursor = obj;
  for (const key of keys) {
    if (typeof cursor[key] !== 'object' || cursor[key] === null) {
      cursor[key] = /^\d+$/.test(key) ? [] : {};
    }
    cursor = cursor[key];
  }
  cursor[last] = value;
  return obj;
}

// One item per line.
function linesToArray(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  return Array.isArray(arr) ? arr.join('\n') : '';
}

// Blank-line-separated paragraphs.
function textToParas(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim().replace(/\s*\r?\n\s*/g, ' '))
    .filter(Boolean);
}

function parasToText(arr) {
  return Array.isArray(arr) ? arr.join('\n\n') : '';
}

module.exports = {
  getPath,
  setPath,
  linesToArray,
  arrayToLines,
  textToParas,
  parasToText
};
