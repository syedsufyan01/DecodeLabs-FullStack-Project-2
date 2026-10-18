'use strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test-admin-key';
process.env.USER_API_KEY = 'test-user-key';
process.env.RATE_LIMIT_MAX = '1000';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { loadConfig } = require('../config');
const store = require('../data/users.data');

const ADMIN = { 'x-api-key': 'test-admin-key' };
const USER = { 'x-api-key': 'test-user-key' };

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }));
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

function makeClient(baseUrl) {
  return async function api(path, { method = 'GET', headers = {}, body, raw } = {}) {
    const options = { method, headers: { ...headers } };
    if (raw !== undefined) {
      options.body = raw;
      options.headers['Content-Type'] = 'application/json';
    } else if (body !== undefined) {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(baseUrl + path, options);
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
  };
}

describe('Users API', () => {
  let server;
  let api;
  let createdId;

  before(async () => {
    store.resetStore();
    const started = await listen(
      createApp({
        extraRoutes: (app) =>
          app.get('/api/boom', () => {
            throw new Error('secret internal detail');
          }),
      })
    );
    server = started.server;
    api = makeClient(started.baseUrl);
  });

  after(() => closeServer(server));

  it('GET /api/health -> 200', async () => {
    const res = await api('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true, message: 'API is running' });
  });

  it('GET /api/users -> 200 with all users', async () => {
    const res = await api('/api/users');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 3);
    assert.equal(res.body.data.length, 3);
  });

  it('GET /api/users/101 -> 200', async () => {
    const res = await api('/api/users/101');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'john@example.com');
  });

  it('GET /api/users/999 -> 404', async () => {
    const res = await api('/api/users/999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('GET /api/users/abc -> 400', async () => {
    const res = await api('/api/users/abc');
    assert.equal(res.status, 400);
  });

  it('POST without API key -> 401', async () => {
    const res = await api('/api/users', { method: 'POST', body: { name: 'Sam Lee', email: 'sam@example.com' } });
    assert.equal(res.status, 401);
  });

  it('POST with wrong API key -> 401', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      headers: { 'x-api-key': 'nope' },
      body: { name: 'Sam Lee', email: 'sam@example.com' },
    });
    assert.equal(res.status, 401);
  });

  it('POST valid data -> 201 with Location header', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      headers: USER,
      body: { name: '  Sam Lee ', email: 'Sam@Example.com' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Sam Lee');
    assert.equal(res.body.data.email, 'sam@example.com');
    assert.equal(res.body.data.role, 'user');
    createdId = res.body.data.id;
    assert.equal(res.headers.get('location'), `/api/users/${createdId}`);
  });

  it('POST missing email -> 400 with details', async () => {
    const res = await api('/api/users', { method: 'POST', headers: USER, body: { name: 'No Email' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.details.includes('email is required'));
  });

  it('POST invalid email and wrong name type -> 400', async () => {
    const res = await api('/api/users', { method: 'POST', headers: USER, body: { name: 42, email: 'not-an-email' } });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.details.includes('name must be a string'));
    assert.ok(res.body.error.details.includes('Invalid email address'));
  });

  it('POST unexpected field (role) -> 400', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      headers: USER,
      body: { name: 'Mallory', email: 'mallory@example.com', role: 'admin' },
    });
    assert.equal(res.status, 400);
  });

  it('POST malformed JSON -> 400', async () => {
    const res = await api('/api/users', { method: 'POST', headers: USER, raw: '{"name": "Broken", ' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Invalid JSON in request body');
  });

  it('POST oversized body -> 413', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      headers: USER,
      body: { name: 'x'.repeat(20000), email: 'big@example.com' },
    });
    assert.equal(res.status, 413);
  });

  it('POST duplicate email -> 409', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      headers: USER,
      body: { name: 'Copy Cat', email: 'john@example.com' },
    });
    assert.equal(res.status, 409);
  });

  it('PUT valid data -> 200 and is idempotent', async () => {
    const payload = { name: 'Samuel Lee', email: 'samuel@example.com' };
    const first = await api(`/api/users/${createdId}`, { method: 'PUT', headers: USER, body: payload });
    const second = await api(`/api/users/${createdId}`, { method: 'PUT', headers: USER, body: payload });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(first.body, second.body);
    assert.equal(first.body.data.name, 'Samuel Lee');
  });

  it('PUT invalid data -> 400', async () => {
    const res = await api(`/api/users/${createdId}`, { method: 'PUT', headers: USER, body: { name: '' } });
    assert.equal(res.status, 400);
  });

  it('PUT non-existent user -> 404', async () => {
    const res = await api('/api/users/999', {
      method: 'PUT',
      headers: USER,
      body: { name: 'Ghost', email: 'ghost@example.com' },
    });
    assert.equal(res.status, 404);
  });

  it('DELETE without API key -> 401', async () => {
    const res = await api(`/api/users/${createdId}`, { method: 'DELETE' });
    assert.equal(res.status, 401);
  });

  it('DELETE with user role -> 403 (authenticated but not allowed)', async () => {
    const res = await api(`/api/users/${createdId}`, { method: 'DELETE', headers: USER });
    assert.equal(res.status, 403);
  });

  it('DELETE with admin role -> 204 and user is gone', async () => {
    const res = await api(`/api/users/${createdId}`, { method: 'DELETE', headers: ADMIN });
    assert.equal(res.status, 204);
    assert.equal(res.body, null);
    const after = await api(`/api/users/${createdId}`);
    assert.equal(after.status, 404);
  });

  it('DELETE non-existent user -> 404', async () => {
    const res = await api('/api/users/999', { method: 'DELETE', headers: ADMIN });
    assert.equal(res.status, 404);
  });

  it('Unknown route -> 404 JSON', async () => {
    const res = await api('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('Unsupported method -> 405 with Allow header', async () => {
    const res = await api('/api/users/101', { method: 'PATCH', headers: USER, body: { name: 'Patch Test' } });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'GET, PUT, DELETE');
  });

  it('Unexpected error -> 500 without leaking internals', async () => {
    const res = await api('/api/boom');
    assert.equal(res.status, 500);
    assert.equal(res.body.error.message, 'Internal server error');
    assert.ok(!JSON.stringify(res.body).includes('secret internal detail'));
  });
});

describe('Rate limiting', () => {
  let server;
  let api;

  before(async () => {
    const started = await listen(createApp({ config: { ...loadConfig(), rateLimitMax: 2 } }));
    server = started.server;
    api = makeClient(started.baseUrl);
  });

  after(() => closeServer(server));

  it('returns 429 after the limit is exceeded', async () => {
    assert.equal((await api('/api/health')).status, 200);
    assert.equal((await api('/api/health')).status, 200);
    const blocked = await api('/api/health');
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
  });
});
