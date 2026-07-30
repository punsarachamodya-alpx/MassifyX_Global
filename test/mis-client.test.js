'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const misClient = require('../lib/misClient');

test('getHealth returns null when baseUrl is empty', async () => {
  assert.equal(await misClient.getHealth(''), null);
});

test('getHealth returns null when the response status is not "ok"', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ status: 'degraded' }),
  });
  assert.equal(await misClient.getHealth('http://mis.local', { fetchImpl }), null);
});

test('getHealth returns the body when status is "ok"', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ status: 'ok', eventCount: 3 }),
  });
  const health = await misClient.getHealth('http://mis.local', { fetchImpl });
  assert.equal(health.eventCount, 3);
});

test('getHealth returns null on a non-ok HTTP response', async () => {
  const fetchImpl = async () => ({ ok: false });
  assert.equal(await misClient.getHealth('http://mis.local', { fetchImpl }), null);
});

test('getHealth returns null when fetch throws (network error, timeout, etc.)', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNREFUSED');
  };
  assert.equal(await misClient.getHealth('http://mis.local', { fetchImpl }), null);
});

test('getDisruptions returns null when the response has no events array', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ notEvents: true }) });
  assert.equal(await misClient.getDisruptions('http://mis.local', { fetchImpl }), null);
});

test('getDisruptions strips an unsafe sourceUrl scheme', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      events: [{ id: 'a', sourceUrl: 'javascript:alert(1)' }, { id: 'b', sourceUrl: 'https://example.com' }],
    }),
  });
  const events = await misClient.getDisruptions('http://mis.local', { fetchImpl });
  assert.equal(events[0].sourceUrl, null);
  assert.equal(events[1].sourceUrl, 'https://example.com');
});

test('sanitizeEvent accepts http and https, rejects everything else', () => {
  assert.equal(misClient.sanitizeEvent({ sourceUrl: 'https://x.com' }).sourceUrl, 'https://x.com');
  assert.equal(misClient.sanitizeEvent({ sourceUrl: 'http://x.com' }).sourceUrl, 'http://x.com');
  assert.equal(misClient.sanitizeEvent({ sourceUrl: 'javascript:alert(1)' }).sourceUrl, null);
  assert.equal(misClient.sanitizeEvent({ sourceUrl: 'data:text/html,x' }).sourceUrl, null);
  assert.equal(misClient.sanitizeEvent({ sourceUrl: undefined }).sourceUrl, null);
});
