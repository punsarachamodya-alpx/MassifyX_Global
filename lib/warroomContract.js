'use strict';

// Validation for the site -> War Room boundary, mirroring how
// lib/misContract.js validates the MIS -> site boundary. Kept in its own
// module (not inline in server.js) so it can be unit tested directly and so
// server.js's route handlers stay thin.
//
// docs/internal/WARROOM_API_CONTRACT.md defines the request body for
// POST /api/v1/investigations. The site never forwards a raw client body to
// War Room -- every field is picked and type-checked here first (input
// validation at a system boundary, not trust-by-default).

const JOB_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Builds a clean War Room request payload from the client's POST body, or
// returns null if required fields are missing/malformed. Extra fields on
// the incoming body are dropped, not forwarded -- the allow-list here is
// the only thing that reaches War Room.
function buildInvestigationPayload(body) {
  if (!body || typeof body !== 'object') return null;

  const incidentId = typeof body.incidentId === 'string' ? body.incidentId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const eventDate = typeof body.eventDate === 'string' ? body.eventDate.trim() : '';
  const severity = Number(body.severity);
  const lat = Number(body.lat);
  const lon = Number(body.lon);

  if (!incidentId || !title || !location || !summary) return null;
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { incidentId, title, location, category, severity, summary, lat, lon, eventDate };
}

function isValidJobId(jobId) {
  return typeof jobId === 'string' && JOB_ID_RE.test(jobId);
}

module.exports = { buildInvestigationPayload, isValidJobId };
