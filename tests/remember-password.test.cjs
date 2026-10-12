const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AccountUser = require('../dist/models/account-user.model').default;
const validate = require('../dist/validates/user.validate');
const controller = require('../dist/controllers/user.controller');

let server, base;
const originalFindOne = AccountUser.findOne;
const originalSecret = process.env.JWT_SECRET;
const originalEnvironment = process.env.NODE_ENV;
const password = 'TestPass123!';

before(async () => {
  process.env.JWT_SECRET = 'remember-password-test-only';
  process.env.NODE_ENV = 'development';
  const hash = await bcrypt.hash(password, 4);
  AccountUser.findOne = async ({ email }) => email === 'test@example.com'
    ? { id: '507f1f77bcf86cd799439011', email, password: hash } : null;
  const app = express();
  app.use(express.json());
  app.post('/login', validate.loginPost, controller.loginPost);
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  AccountUser.findOne = originalFindOne;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  if (originalEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment;
  await new Promise(resolve => server.close(resolve));
});

function login(extra = {}) {
  return fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password, ...extra }) });
}
async function assertLifetime(extra, days) {
  const response = await login(extra);
  assert.equal((await response.json()).code, 'success');
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, new RegExp(`Max-Age=${days * 86400}(?:;|$)`));
  assert.match(cookie, /HttpOnly/);
  const token = decodeURIComponent(cookie.match(/^token=([^;]+)/)[1]);
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(payload.exp - payload.iat, days * 86400);
  assert.equal(payload.password, undefined);
}

test('remember checked keeps both JWT and cookie for 30 days', () => assertLifetime({ rememberPassword: true }, 30));
test('remember unchecked keeps both JWT and cookie for 1 day', () => assertLifetime({ rememberPassword: false }, 1));
test('older clients omitting the checkbox still get 1 day', () => assertLifetime({}, 1));
test('non-boolean remember flags are rejected without a session', async () => {
  for (const rememberPassword of ['false', 'true', 1, {}, null]) {
    const response = await login({ rememberPassword });
    assert.equal((await response.json()).code, 'error');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});
test('wrong password or unknown email does not issue a remembered session', async () => {
  for (const extra of [{ password: 'WrongPass123!' }, { email: 'missing@example.com' }]) {
    const response = await login({ ...extra, rememberPassword: true });
    assert.equal((await response.json()).code, 'error');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});
test('production remembered cookie remains secure and HTTP-only', async () => {
  process.env.NODE_ENV = 'production';
  try {
    const response = await login({ rememberPassword: true });
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /Secure/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=None/);
  } finally { process.env.NODE_ENV = 'development'; }
});
