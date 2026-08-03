'use strict';

// Server-side client for the War Room investigation service (a separate,
// independently deployed Python/LangGraph microservice -- see
// docs/internal/WARROOM_BUILD_PLAN.md and WARROOM_API_CONTRACT.md). Same
// doctrine as lib/misClient.js: every call here is designed to never throw
// and never leak WARROOM_BASE_URL to the caller. War Room being unset, down,
// slow, or not yet deployed all collapse to the same `{ available: false }`
// shape -- callers in server.js just check that flag and degrade cleanly,
// same as they already do for MIS.

const DEFAULT_TIMEOUT_MS = 5000;

async function requestJson(url, { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch {
    // Network error, timeout, DNS failure, connection refused -- all the
    // same "War Room isn't reachable" outcome to the caller.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Kicks off a job. Never throws; the shape below is what server.js's route
// handlers branch on.
async function createInvestigation(baseUrl, payload, opts) {
  if (!baseUrl) return { available: false };

  const result = await requestJson(`${baseUrl}/api/v1/investigations`, { method: 'POST', body: payload, ...opts });
  if (!result) return { available: false };

  if (result.status === 429) return { available: true, rateLimited: true };
  if (result.status === 400) return { available: true, invalid: true };
  if (!result.json || typeof result.json.jobId !== 'string') return { available: false };

  return {
    available: true,
    jobId: result.json.jobId,
    status: result.json.status,
    cachedFrom: result.json.cachedFrom || null
  };
}

// Polls job status/result. Never throws; returns the War Room response body
// verbatim (already validated to be JSON) alongside `available: true`, or
// `{ available: false }` on any failure.
async function getInvestigation(baseUrl, jobId, opts) {
  if (!baseUrl) return { available: false };

  const result = await requestJson(`${baseUrl}/api/v1/investigations/${encodeURIComponent(jobId)}`, opts);
  if (!result || result.status === 404 || !result.json) return { available: false };

  return { available: true, ...result.json };
}

module.exports = { createInvestigation, getInvestigation, requestJson, DEFAULT_TIMEOUT_MS };
