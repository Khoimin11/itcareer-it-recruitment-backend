const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const AccountUser = require('../dist/models/account-user.model').default;
const PersonalCV = require('../dist/models/personal-cv.model').default;
const router = require('../dist/routes/user.route').default;

let server, base, account, storedCV, lastUpdate, ownerQueries;
const originals = [AccountUser.findOne, AccountUser.findById, AccountUser.updateOne, PersonalCV.findOne, PersonalCV.findOneAndUpdate];
const token = jwt.sign({ id: '507f1f77bcf86cd799439011', email: 'test@example.com' }, 'test-only');
before(async () => {
  process.env.JWT_SECRET = 'test-only';
  AccountUser.findOne = async filter => filter._id === account.id && filter.email === account.email ? account : null;
  AccountUser.findById = async () => account;
  AccountUser.updateOne = async (filter, update) => {
    assert.equal(filter._id, account.id);
    lastUpdate = update.$set;
    for (const [key, value] of Object.entries(lastUpdate)) {
      if (key.startsWith('general.')) { account.general ||= {}; account.general[key.slice(8)] = value; }
      else account[key] = value;
    }
  };
  PersonalCV.findOne = filter => {
    ownerQueries.push(filter);
    const result = Promise.resolve(storedCV);
    result.select = () => result;
    return result;
  };
  PersonalCV.findOneAndUpdate = async (filter, update, options) => {
    ownerQueries.push(filter);
    assert.equal(options.upsert, true);
    storedCV = { ...update.$set, updatedAt: new Date() };
    return storedCV;
  };
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/user', router);
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = `http://127.0.0.1:${server.address().port}/user/attachments`;
});
after(async () => {
  [AccountUser.findOne, AccountUser.findById, AccountUser.updateOne, PersonalCV.findOne, PersonalCV.findOneAndUpdate] = originals;
  await new Promise(resolve => server.close(resolve));
});
function reset() {
  account = { id: '507f1f77bcf86cd799439011', fullName: 'Real User', email: 'test@example.com', phone: '0123456789', avatar: '/avatar.png' };
  storedCV = null; lastUpdate = null; ownerQueries = [];
}
function call(path = '', options = {}) {
  return fetch(base + path, { ...options, headers: { Cookie: `token=${token}`, ...options.headers } });
}
function patch(section, values) {
  return call('', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, values }) });
}
function upload(content, name = 'CV.pdf') {
  const body = new FormData(); body.append('cv', new Blob([content], { type: 'application/pdf' }), name);
  return call('/cv', { method: 'POST', body });
}

test('unauthenticated requests cannot access a profile or PDF', async () => {
  reset();
  for (const path of ['', '/cv']) {
    const data = await (await fetch(base + path)).json();
    assert.equal(data.code, 'error');
  }
  assert.equal(ownerQueries.length, 0);
});
test('uses real account contact details and leaves missing fields empty', async () => {
  reset();
  const { profile } = await (await call()).json();
  assert.equal(profile.basic.fullName, 'Real User');
  assert.equal(profile.basic.phone, '0123456789');
  assert.equal(profile.avatar, '/avatar.png');
  assert.equal(profile.basic.title, '');
  assert.ok(Object.values(profile.general).every(value => value === ''));
  assert.equal(profile.letter, ''); assert.equal(profile.cv, null);
});
test('persists basic fields without allowing email, password or arbitrary fields to change', async () => {
  reset();
  const { profile: original } = await (await call()).json();
  const response = await patch('basic', { ...original.basic, fullName: 'Updated User', title: 'Developer', email: 'other@example.com', password: 'injected' });
  assert.equal(response.status, 200);
  assert.equal(lastUpdate.fullName, 'Updated User');
  assert.equal(lastUpdate.email, undefined); assert.equal(lastUpdate.password, undefined);
  const { profile } = await (await call()).json();
  assert.equal(profile.basic.title, 'Developer'); assert.equal(profile.basic.fullName, 'Updated User');
  assert.equal(profile.basic.email, 'test@example.com');
});
test('persists general information and allows optional fields to be cleared', async () => {
  reset();
  const { profile } = await (await call()).json();
  const values = { ...profile.general, skills: 'React, Node.js', experience: '2 năm' };
  await patch('general', values);
  assert.equal((await (await call()).json()).profile.general.skills, 'React, Node.js');
  await patch('general', { ...values, skills: '' });
  assert.equal((await (await call()).json()).profile.general.skills, '');
});
test('keeps TinyMCE formatting while removing scripts and event handlers', async () => {
  reset();
  const response = await patch('letter', '<p onclick="alert(1)">Hello <strong>world</strong></p><script>alert(1)</script><img src=x onerror=alert(1)><ul><li>React</li></ul>');
  const { profile } = await response.json();
  assert.equal(profile.letter, '<p>Hello <strong>world</strong></p><ul><li>React</li></ul>');
  assert.equal((await (await call()).json()).profile.letter, profile.letter);
});
test('rejects invalid sections, field types, and oversized letters', async () => {
  reset();
  for (const [section, values] of [['password', {}], ['basic', { fullName: { $ne: null } }], ['general', []], ['letter', 'x'.repeat(20001)]]) {
    assert.equal((await patch(section, values)).status, 400);
  }
  assert.equal(lastUpdate, null);
});
test('stores only one CV per owner and serves the actual PDF bytes privately', async () => {
  reset();
  assert.equal((await call('/cv')).status, 404);
  const pdf = '%PDF-1.7\nactual test bytes\n%%EOF';
  assert.equal((await upload(pdf)).status, 200);
  const first = await (await call()).json();
  assert.equal(first.profile.cv.name, 'CV.pdf'); assert.equal(first.profile.cv.data, undefined);
  await upload(pdf + '\nreplacement', 'New.pdf');
  const response = await call('/cv');
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('content-disposition'), /^inline;/);
  assert.equal(await response.text(), pdf + '\nreplacement');
  assert.ok(ownerQueries.every(query => query.userId === account.id));
  assert.equal(storedCV.name, 'New.pdf');
});
test('rejects disguised files, empty PDFs, Word files and files at the size limit', async () => {
  reset();
  for (const [content, name] of [['not a PDF', 'fake.pdf'], ['', 'empty.pdf'], ['%PDF-1.7', 'file.docx'], ['%PDF-' + 'x'.repeat(3 * 1024 * 1024 - 5), 'large.pdf']]) {
    assert.equal((await upload(content, name)).status, 400);
  }
  assert.equal(storedCV, null);
});
