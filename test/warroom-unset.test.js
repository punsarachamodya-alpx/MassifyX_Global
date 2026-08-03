'use strict';

// The other agent building massifyx-warroom hasn't deployed anything yet --
// WARROOM_BASE_URL is unset here, exactly like a fresh checkout of this repo
// today. Asserts the proxy routes degrade to a clean "unavailable" JSON
// response (200, never a 500) once unlocked, mirroring how test/live.test.js
// asserts /live/data degrades when MIS_BASE_URL points nowhere.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ci-test-password-only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'ci-test-session-secret';
process.env.WARROOM_ACCESS_CODE = 'ci-test-warroom-code';
delete process.env.WARROOM_BASE_URL; // the point of this file

let app;
let server;
let base;

test.before(async () => {
  app = require('../server.js');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function sessionCookie(res) {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

async function unlockSession() {
  const res = await fetch(`${base}/live/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'ci-test-warroom-code' })
  });
  const body = await res.json();
  assert.equal(body.ok, true);
  return sessionCookie(res);
}

test('POST /live/investigate degrades to available:false (200) when WARROOM_BASE_URL is unset', async () => {
  const cookie = await unlockSession();
  const res = await fetch(`${base}/live/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      incidentId: 'evt_x',
      title: 'Test incident',
      location: 'Nowhere',
      category: 'other',
      severity: 3,
      summary: 'A test incident summary.',
      lat: 1,
      lon: 2,
      eventDate: '2026-08-01T00:00:00Z'
    })
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.available, false);
});

test('GET /live/investigate/:jobId degrades to available:false (200) when WARROOM_BASE_URL is unset', async () => {
  const cookie = await unlockSession();
  const res = await fetch(`${base}/live/investigate/wrj_doesnotexist`, {
    headers: { Cookie: cookie }
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.available, false);
});

test('War Room routes never 500 even when locked and WARROOM_BASE_URL is unset', async () => {
  const res = await fetch(`${base}/live/investigate/wrj_whatever`);
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.available, false);
  assert.equal(body.locked, true);
});
