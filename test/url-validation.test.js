'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { isSafeLinkHref, isSafeAbsoluteUrl, sanitizeLinkHref, sanitizeAbsoluteUrl } = require('../lib/urlValidation');

test('isSafeLinkHref accepts a same-site relative path', () => {
  assert.equal(isSafeLinkHref('/contact'), true);
});

test('isSafeLinkHref accepts an absolute https URL', () => {
  assert.equal(isSafeLinkHref('https://example.com/book'), true);
});

test('isSafeLinkHref rejects a protocol-relative URL', () => {
  assert.equal(isSafeLinkHref('//evil.example'), false);
});

test('isSafeLinkHref rejects javascript: and data: schemes', () => {
  assert.equal(isSafeLinkHref('javascript:alert(1)'), false);
  assert.equal(isSafeLinkHref('data:text/html,<script>alert(1)</script>'), false);
});

test('isSafeLinkHref rejects empty/non-string values', () => {
  assert.equal(isSafeLinkHref(''), false);
  assert.equal(isSafeLinkHref(undefined), false);
});

test('isSafeAbsoluteUrl accepts a real https URL', () => {
  assert.equal(isSafeAbsoluteUrl('https://calendly.com/massifyx'), true);
});

test('isSafeAbsoluteUrl rejects a relative path (no bare scheme to check)', () => {
  assert.equal(isSafeAbsoluteUrl('/contact'), false);
});

test('isSafeAbsoluteUrl rejects javascript: and file: schemes', () => {
  assert.equal(isSafeAbsoluteUrl('javascript:alert(1)'), false);
  assert.equal(isSafeAbsoluteUrl('file:///etc/passwd'), false);
});

test('sanitizeLinkHref passes through a safe value and blanks an unsafe one', () => {
  assert.equal(sanitizeLinkHref('/what-we-do'), '/what-we-do');
  assert.equal(sanitizeLinkHref('javascript:alert(1)'), '');
});

test('sanitizeAbsoluteUrl passes through a safe value and blanks an unsafe one', () => {
  assert.equal(sanitizeAbsoluteUrl('https://linkedin.com/in/someone'), 'https://linkedin.com/in/someone');
  assert.equal(sanitizeAbsoluteUrl('javascript:alert(1)'), '');
});
