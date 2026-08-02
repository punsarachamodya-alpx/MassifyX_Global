'use strict';

// Thin GET-JSON wrapper for SCB's PxWebApi v2 (GET only, no auth, no key)
// with real backoff/pacing -- not a busy-loop. Retries sleep via
// setTimeout with exponential backoff; callers making several calls in a
// batch should pace them with `wait(MIN_CALL_INTERVAL_MS)` between calls to
// stay under SCB's documented ~30 calls / 10s per IP limit (see
// docs/internal/SWEDEN_TRADE_BUILD_INSTRUCTIONS.md Appendix).

const MIN_CALL_INTERVAL_MS = 400; // ~25 calls/10s -- under the ~30/10s limit with margin
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 1000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, { retries = MAX_RETRIES } = {}) {
  let attempt = 0;
  for (;;) {
    const res = await fetch(url);
    if (res.ok) return res.json();

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `SCB request failed: ${res.status} ${res.statusText} for ${url}` +
        (body ? ` -- ${body.slice(0, 500)}` : '')
      );
    }
    const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
    console.warn(`[scb] ${res.status} on attempt ${attempt + 1}, retrying in ${delay}ms: ${url}`);
    await wait(delay);
    attempt += 1;
  }
}

module.exports = { fetchJson, wait, MIN_CALL_INTERVAL_MS };
