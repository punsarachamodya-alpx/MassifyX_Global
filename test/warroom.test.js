'use strict';

// Boots the real app against a fake in-process War Room service (never the
// real network) and asserts:
//  - the access-code gate itself (wrong code stays locked, right code
//    unlocks, the session flag persists across requests)
//  - the proxy routes' happy path against the fixed API contract
//    (docs/internal/WARROOM_API_CONTRACT.md)
//  - the same degrade-gracefully contract /live/data already has for MIS:
//    200/JSON "unavailable", never a 500, when War Room is down.
//
// Mirrors test/live.test.js's fake-service pattern.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ci-test-password-only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'ci-test-session-secret';
process.env.WARROOM_ACCESS_CODE = 'ci-test-warroom-code';

let fakeWarroom;
let fakeWarroomPort;
let warroomShouldFail = false;
let warroomRateLimited = false;
let lastCreatedJob = null;
let app;
let server;
let base;

function startFakeWarroom() {
  return new Promise((resolve) => {
    fakeWarroom = http.createServer((req, res) => {
      if (warroomShouldFail) {
        req.socket.destroy();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/v1/investigations') {
        if (warroomRateLimited) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'rate limited' }));
          return;
        }
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
          lastCreatedJob = JSON.parse(raw);
          res.statusCode = 202;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ jobId: 'wrj_test123', status: 'queued', cachedFrom: null }));
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/api/v1/investigations/wrj_test123') {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jobId: 'wrj_test123',
            status: 'complete',
            startedAt: '2026-08-01T00:00:00Z',
            completedAt: '2026-08-01T00:02:00Z',
            costEstimateUsd: 0.19,
            result: {
              summary: 'One paragraph summary.',
              affectedSuppliers: [{ name: 'Acme Freight', findingId: 'f_1', confidence: 'high' }],
              affectedPorts: [],
              affectedShippingLines: [],
              affectedManufacturers: [],
              unaffectedAlternatives: [],
              recommendedActions: [{ action: 'Reroute via Rotterdam.', rationale: 'Least exposed.', urgency: 'high' }],
              findings: [
                {
                  id: 'f_1',
                  sourceUrl: 'https://example.com/acme-freight-report',
                  sourceType: 'news',
                  title: 'Acme Freight report',
                  excerpt: 'Excerpt text.',
                  publishedAt: '2026-07-31T00:00:00Z'
                }
              ]
            }
          })
        );
        return;
      }

      res.statusCode = 404;
      res.end();
    });
    fakeWarroom.listen(0, () => {
      fakeWarroomPort = fakeWarroom.address().port;
      resolve();
    });
  });
}

test.before(async () => {
  await startFakeWarroom();
  process.env.WARROOM_BASE_URL = `http://127.0.0.1:${fakeWarroomPort}`;
  app = require('../server.js');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => fakeWarroom.close(resolve));
});

function sessionCookie(res) {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

const validIncident = {
  incidentId: 'evt_suez',
  title: 'Suez Canal transit restricted',
  location: 'Suez, Egypt',
  category: 'geopolitical',
  severity: 5,
  summary: 'Suez Canal transit was restricted following a security incident.',
  lat: 29.9668,
  lon: 32.5498,
  eventDate: '2026-07-29T14:10:00.000Z'
};

// ------------------------------------------------------------------ gating

test('POST /live/investigate is refused (403, locked) with no session at all', async () => {
  const res = await fetch(`${base}/live/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validIncident)
  });
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.available, false);
  assert.equal(body.locked, true);
});

test('POST /live/unlock rejects a wrong code and does not set the session flag', async () => {
  const res = await fetch(`${base}/live/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'definitely-wrong' })
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.ok, false);

  const cookie = sessionCookie(res);
  const gated = await fetch(`${base}/live/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(validIncident)
  });
  assert.equal(gated.status, 403);
});

let unlockedCookie;

test('POST /live/unlock accepts the correct code and sets the session flag', async () => {
  const res = await fetch(`${base}/live/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'ci-test-warroom-code' })
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  unlockedCookie = sessionCookie(res);
  assert.ok(unlockedCookie.startsWith('mxg.sid='));
});

test('the unlocked session flag persists across a subsequent request (no re-unlock needed)', async () => {
  const res = await fetch(`${base}/live/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: unlockedCookie },
    body: JSON.stringify(validIncident)
  });
  assert.notEqual(res.status, 403);
});

// -------------------------------------------------------------- happy path

test('POST /live/investigate proxies to War Room and returns the jobId (202)', async () => {
  const res = await fetch(`${base}/live/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: unlockedCookie },
    body: JSON.stringify(validIncident)
  });
  const body = await res.json();
  assert.equal(res.status, 202);
  assert.equal(body.available, true);
  assert.equal(body.jobId, 'wrj_test123');
  assert.equal(body.status, 'queued');
  // War Room's real address must never reach the client.
  assert.ok(!JSON.stringify(body).includes(String(fakeWarroomPort)));
  // Only the site's own validated allow-list fields were forwarded.
  assert.equal(lastCreatedJob.incidentId, 'evt_suez');
  assert.equal(lastCreatedJob.severity, 5);
});

test('GET /live/investigate/:jobId returns the completed result with citations intact', async () => {
  const res = await fetch(`${base}/live/investigate/wrj_test123`, {
    headers: { Cookie: unlockedCookie }
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.available, true);
  assert.equal(body.status, 'complete');
  assert.equal(body.result.affectedSuppliers[0].findingId, 'f_1');
  assert.equal(body.result.findings[0].sourceUrl, 'https://example.com/acme-freight-report');
});

// ----------------------------------------------------------- request shape

test('POST /live/investigate rejects a body missing required fields (400) without calling War Room', async () => {
  const before = lastCreatedJob;
  const res = await fetch(`${base}/live/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: unlockedCookie },
    body: JSON.stringify({ title: 'Missing everything else' })
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.available, false);
  assert.deepEqual(lastCreatedJob, before); // untouched -- War Room was never called
});

test('GET /live/investigate/:jobId rejects a path-unsafe job id (400)', async () => {
  const res = await fetch(`${base}/live/investigate/${encodeURIComponent('../../etc/passwd')}`, {
    headers: { Cookie: unlockedCookie }
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.available, false);
});

// --------------------------------------------------------------- degrading

test('POST /live/investigate returns available:false (never 500) when War Room is unreachable', async () => {
  warroomShouldFail = true;
  try {
    const res = await fetch(`${base}/live/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: unlockedCookie },
      body: JSON.stringify(validIncident)
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.available, false);
  } finally {
    warroomShouldFail = false;
  }
});

test('GET /live/investigate/:jobId returns available:false (never 500) when War Room is unreachable', async () => {
  warroomShouldFail = true;
  try {
    const res = await fetch(`${base}/live/investigate/wrj_test123`, { headers: { Cookie: unlockedCookie } });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.available, false);
  } finally {
    warroomShouldFail = false;
  }
});

test('POST /live/investigate passes a 429 from War Room through as rate-limited', async () => {
  warroomRateLimited = true;
  try {
    const res = await fetch(`${base}/live/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: unlockedCookie },
      body: JSON.stringify(validIncident)
    });
    const body = await res.json();
    assert.equal(res.status, 429);
    assert.equal(body.available, true);
    assert.equal(body.rateLimited, true);
  } finally {
    warroomRateLimited = false;
  }
});
