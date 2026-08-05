'use strict';

// Scheme validation for admin-editable URL fields (lib/schema.js's 'url'/
// 'externalUrl' field types), applied at save time in routes/admin.js's
// collect(). Without this, a value like "javascript:..." or "data:..."
// typed into an href/embed-URL field would be persisted verbatim and later
// rendered straight into an href or iframe src (views/partials/header.ejs,
// views/contact.ejs, etc) with only HTML-escaping in between -- which does
// not stop those schemes from executing.

// Nav/CTA links (lib/schema.js's 'url' type): either a same-site relative
// path ("/contact") or a real http(s) URL. Rejects protocol-relative
// "//evil.com" (browsers resolve that as https://evil.com, not a path).
function isSafeLinkHref(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return isSafeAbsoluteUrl(value);
}

// Embeds and social links (lib/schema.js's 'externalUrl' type): must be a
// genuine absolute http(s) URL -- a relative path makes no sense for a
// Calendly embed or a LinkedIn profile link.
function isSafeAbsoluteUrl(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    return /^https?:$/i.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Returns value unchanged if safe, otherwise '' -- same "just don't save
// it" posture as the rest of collect()'s per-field-type handling, rather
// than failing the whole save over one bad field.
function sanitizeLinkHref(value) {
  return isSafeLinkHref(value) ? value : '';
}

function sanitizeAbsoluteUrl(value) {
  return isSafeAbsoluteUrl(value) ? value : '';
}

module.exports = { isSafeLinkHref, isSafeAbsoluteUrl, sanitizeLinkHref, sanitizeAbsoluteUrl };
