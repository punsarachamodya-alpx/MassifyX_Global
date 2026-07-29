'use strict';

// Boots the real app on an ephemeral port and hits every public route, plus a
// couple of admin-auth edge cases. No new dependency: node:test + node:http are
// built in (Node 18+, matching the CI matrix and package.json's engines field).

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ci-test-password-only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'ci-test-session-secret';

const app = require('../server.js');

let server;
let base;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(base + path, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      })
      .on('error', reject);
  });
}

const PUBLIC_ROUTES = [
  '/',
  '/what-we-do',
  '/industries',
  '/how-we-work',
  '/who-we-are',
  '/contact',
  '/privacy',
  '/cookies',
  '/terms',
  '/robots.txt',
  '/sitemap.xml'
];

for (const route of PUBLIC_ROUTES) {
  test(`GET ${route} returns 200`, async () => {
    assert.equal(await get(route), 200);
  });
}

test('unknown route returns 404', async () => {
  assert.equal(await get('/this-page-does-not-exist'), 404);
});

test('/admin redirects unauthenticated visitors to login', async () => {
  const status = await new Promise((resolve, reject) => {
    http
      .get(base + '/admin', (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', reject);
  });
  assert.equal(status, 302);
});

test('/admin/login is reachable', async () => {
  assert.equal(await get('/admin/login'), 200);
});
