'use strict';

// Boots the real app against a fake in-process MIS (never the real network)
// and asserts /live's graceful-degradation contract: 200 whether MIS is
// healthy or down, and MIS's real address never leaks to the browser.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ci-test-password-only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'ci-test-session-secret';

const sampleEvents = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'mis-api-contract-sample.json'), 'utf8'),
);

let fakeMis;
let fakeMisPort;
let misShouldFail = false;
let app;
let server;
let base;

function startFakeMis() {
  return new Promise((resolve) => {
    fakeMis = http.createServer((req, res) => {
      if (misShouldFail) {
        req.socket.destroy();
        return;
      }
      if (req.url.startsWith('/api/v1/health')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            status: 'ok',
            lastIngestAt: new Date().toISOString(),
            eventCount: sampleEvents.length,
          }),
        );
        return;
      }
      if (req.url.startsWith('/api/v1/disruptions')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            generatedAt: new Date().toISOString(),
            count: sampleEvents.length,
            events: sampleEvents,
          }),
        );
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    fakeMis.listen(0, () => {
      fakeMisPort = fakeMis.address().port;
      resolve();
    });
  });
}

test.before(async () => {
  await startFakeMis();
  // server.js reads MIS_BASE_URL once at module load, so the fake MIS
  // server above must already be listening before this require() runs.
  process.env.MIS_BASE_URL = `http://127.0.0.1:${fakeMisPort}`;
  app = require('../server.js');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => fakeMis.close(resolve));
});

test('GET /live returns 200 with the globe rendered when MIS is healthy', async () => {
  const res = await fetch(`${base}/live`);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.ok(body.includes('id="live-globe"'));
  assert.ok(body.includes('Rotterdam'));
  assert.ok(!body.includes('temporarily unavailable'));
});

test('GET /live degrades gracefully (still 200) when MIS is down', async () => {
  misShouldFail = true;
  try {
    const res = await fetch(`${base}/live`);
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.ok(body.includes('temporarily unavailable'));
    assert.ok(!body.includes('id="live-globe"'));
  } finally {
    misShouldFail = false;
  }
});

test('GET /live/data proxies MIS data without exposing its address to the client', async () => {
  const res = await fetch(`${base}/live/data`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.available, true);
  assert.equal(body.events.length, sampleEvents.length);
  assert.ok(!JSON.stringify(body).includes(String(fakeMisPort)));
});

test('GET /live/data degrades to available:false when MIS is down', async () => {
  misShouldFail = true;
  try {
    const res = await fetch(`${base}/live/data`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.available, false);
    assert.deepEqual(body.events, []);
  } finally {
    misShouldFail = false;
  }
});

test('a valid https sourceUrl survives end to end into the rendered page', async () => {
  const res = await fetch(`${base}/live`);
  const body = await res.text();
  assert.ok(body.includes('href="https://example.com/rotterdam-storm-port-congestion"'));
});
