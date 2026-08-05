'use strict';

// Server-side client for the MassifyX Intelligence Service (MIS) — the
// decoupled disruption-monitor microservice. Every call here is designed to
// never throw: MIS being down, slow, or misconfigured must never break the
// site. See docs/internal/DESIGN.md for the full contract.

const { assertValidDisruptionEvent } = require('./misContract');

const DEFAULT_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { promise, controller, cancel: () => clearTimeout(timer) };
}

async function fetchJson(url, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const { controller, cancel } = withTimeout(null, timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    cancel();
  }
}

// Returns null on any failure (down, timeout, bad response) instead of
// throwing — callers treat null exactly like "MIS is unavailable."
async function getHealth(baseUrl, opts) {
  if (!baseUrl) return null;
  const health = await fetchJson(`${baseUrl}/api/v1/health`, opts);
  return health && health.status === 'ok' ? health : null;
}

// Every field here is AI- or third-party-sourced and therefore untrusted
// (DESIGN.md §9) — sourceUrl in particular gets scheme-checked so a
// javascript: URL from a compromised or buggy upstream can never land in
// an href, in the SSR view or the client-side feed it hands data to.
function sanitizeEvent(event) {
  const hasSafeSourceUrl = typeof event.sourceUrl === 'string' && /^https?:\/\//i.test(event.sourceUrl);
  return { ...event, sourceUrl: hasSafeSourceUrl ? event.sourceUrl : null };
}

// The Supabase table both this site's queries and MIS itself read/write is
// only as trustworthy as MIS's own write path (see the separately-tracked
// RLS hardening) — this boundary re-validates shape defensively rather
// than assuming MIS's contract is still being honored by every row.
// Malformed events are dropped, never rendered half-valid.
function isValidEvent(event) {
  try {
    assertValidDisruptionEvent(event);
    return true;
  } catch {
    return false;
  }
}

async function getDisruptions(baseUrl, opts) {
  if (!baseUrl) return null;
  const body = await fetchJson(`${baseUrl}/api/v1/disruptions?limit=200`, opts);
  if (!body || !Array.isArray(body.events)) return null;
  return body.events.filter(isValidEvent).map(sanitizeEvent);
}

// Optional: MIS returns available:false + an empty list when it has no
// AISSTREAM_API_KEY configured, which isn't a failure -- an empty array
// here just means "no live vessels to show," not "MIS is down."
async function getVessels(baseUrl, opts) {
  if (!baseUrl) return [];
  const body = await fetchJson(`${baseUrl}/api/v1/vessels`, opts);
  return body && Array.isArray(body.vessels) ? body.vessels : [];
}

module.exports = { getHealth, getDisruptions, getVessels, fetchJson, sanitizeEvent, DEFAULT_TIMEOUT_MS };
