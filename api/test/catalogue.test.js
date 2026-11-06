'use strict';
const test = require('node:test');
const assert = require('node:assert');

process.env.GRAPH_TENANT_ID = 'tenant';
process.env.GRAPH_CLIENT_ID = 'client';
process.env.GRAPH_CLIENT_SECRET = 'secret';
process.env.MAIL_SENDER = 'sender@example.com';
process.env.NOTIFY_TO = 'leads@example.com';
process.env.LEADS_TABLE_CONNECTION = 'UseDevelopmentStorage=true';
process.env.IP_HASH_SALT = 'salt';

const handler = require('../catalogue-request');
const graph = require('../lib/graph');
const store = require('../lib/store');
const catalogueLib = require('../lib/catalogue');
const { validate, emailKey, parseIp } = require('../lib/validate');

// ---- in-memory store -------------------------------------------------------
let rows = [];
let storeFail = { insert: false, count: false };
store.insert = async (lead) => {
  if (storeFail.insert) throw new Error('table down');
  const r = { status: 'received', ...lead, createdAt: new Date(), key: { partitionKey: 'p', rowKey: String(rows.length) } };
  rows.push(r);
  return r.key;
};
store.setStatus = async (key, status, error) => {
  const r = rows.find((x) => x.key.rowKey === key?.rowKey);
  if (r) Object.assign(r, { status, error });
};
store.countSince = async ({ column, value, since, cap }) => {
  if (storeFail.count) throw new Error('table down');
  return Math.min(cap, rows.filter((r) => r.createdAt >= since && !['failed', 'suspect'].includes(r.status)
    && (!column || r[column] === value)).length);
};

// ---- Graph mock --------------------------------------------------------------
let calls = [];
function mockFetch(respond) {
  calls = [];
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body });
    const r = respond && respond(String(url), opts);
    if (r) return r;
    if (String(url).includes('login.microsoftonline.com')) return json(200, { access_token: 'tok', expires_in: 3600 });
    if (String(url).endsWith('/messages')) return json(201, { id: 'draft1' });
    if (String(url).includes('createUploadSession')) return json(201, { uploadUrl: 'https://upload.example/u' });
    return new Response(null, { status: 202 });
  };
}
const json = (status, b) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
const ctx = () => ({ log: Object.assign(() => {}, { error() {}, warn() {}, info() {} }) });
const req = (body, headers = {}) => ({ headers: { 'content-type': 'application/json', 'x-azure-clientip': '203.0.113.9', ...headers }, body });
const good = { name: "Anil D'Souza", email: 'farmer@example.com', phone: '+91 98765 43210', t: 9000 };
const cat = (size) => ({ name: 'c.pdf', contentType: 'application/pdf', bytes: Buffer.alloc(size, 1) });
const sends = () => calls.filter((x) => x.url.endsWith('/sendMail'));

test.beforeEach(() => {
  rows = []; storeFail = { insert: false, count: false };
  graph._reset(); catalogueLib._set(cat(1000)); mockFetch();
});

test('rejects non-JSON', async () => {
  const c = ctx();
  await handler(c, { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' });
  assert.equal(c.res.status, 415);
  assert.equal(calls.length, 0);
});

test('validates fields, including names that carry links or digits', async () => {
  for (const name of ['A', 'Visit http://x.y', 'Win 1000 now']) {
    const c = ctx();
    await handler(c, req({ name, email: 'nope', phone: '123', t: 9000 }));
    assert.equal(c.res.status, 400);
    assert.deepEqual(JSON.parse(c.res.body).fields, ['name', 'email', 'phone']);
  }
  assert.ok(validate({ name: 'José Müller-Smith', email: 'a@b.co', phone: '9876543210' }).ok);
  assert.ok(validate({ name: 'रमेश पाटील', email: 'a@b.co', phone: '9876543210' }).ok);
  assert.equal(calls.length, 0);
});

test('honeypot, missing timing and too-fast are stored as suspect, nothing sent', async () => {
  for (const b of [{ ...good, bsi_hp: 'x' }, { ...good, t: 500 }, { name: good.name, email: good.email, phone: good.phone }]) {
    const c = ctx(); await handler(c, req(b));
    assert.equal(c.res.status, 200);
  }
  assert.equal(calls.length, 0);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.status === 'suspect'));
});

test('sent inline, then notification; row marked sent', async () => {
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 200);
  assert.equal(sends().length, 2);
  const first = JSON.parse(sends()[0].body);
  assert.equal(first.message.toRecipients[0].emailAddress.address, 'farmer@example.com');
  assert.equal(Buffer.from(first.message.attachments[0].contentBytes, 'base64').length, 1000);
  const second = JSON.parse(sends()[1].body);
  assert.equal(second.message.toRecipients[0].emailAddress.address, 'leads@example.com');
  assert.equal(second.message.replyTo[0].emailAddress.address, 'farmer@example.com');
  assert.equal(rows[0].status, 'sent');
  assert.ok(rows[0].ipHash && rows[0].ipHash !== '203.0.113.9');
});

test('missing catalogue: 202 received, info@ notified, row failed', async () => {
  catalogueLib._set(null);
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 202);
  assert.equal(JSON.parse(c.res.body).code, 'received');
  assert.equal(sends().length, 1);
  assert.match(JSON.parse(sends()[0].body).message.body.content, /not uploaded yet/);
  assert.equal(rows[0].status, 'failed');
});

test('nothing stored and nothing notified: 500 retry', async () => {
  storeFail.insert = true;
  mockFetch((url) => (url.endsWith('/sendMail') ? new Response('no', { status: 500 }) : null));
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 500);
  assert.equal(JSON.parse(c.res.body).code, 'retry');
});

test('limit check failure fails closed', async () => {
  storeFail.count = true;
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 503);
  assert.equal(calls.length, 0);
});

test('per-mailbox limit sees through +tags and Gmail dots; failures do not count', async () => {
  const variants = ['f.armer@gmail.com', 'farmer+1@gmail.com', 'FARMER@googlemail.com', 'fa.rmer+x@gmail.com'];
  const statuses = [];
  for (const email of variants) {
    const c = ctx(); await handler(c, req({ ...good, email }));
    statuses.push(c.res.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 429]);
  rows.forEach((r) => { r.status = 'failed'; });
  const c = ctx(); await handler(c, req({ ...good, email: 'farmer@gmail.com' }));
  assert.equal(c.res.status, 200);
});

test('per-IP and daily caps', async () => {
  for (let i = 0; i < 10; i++) { const c = ctx(); await handler(c, req({ ...good, email: `u${i}@example.com` })); assert.equal(c.res.status, 200); }
  let c = ctx(); await handler(c, req({ ...good, email: 'u99@example.com' }));
  assert.equal(c.res.status, 429);
  process.env.CATALOGUE_DAILY_CAP = '10';
  c = ctx(); await handler(c, req({ ...good, email: 'other@example.com' }, { 'x-azure-clientip': '198.51.100.1' }));
  assert.equal(c.res.status, 429);
  delete process.env.CATALOGUE_DAILY_CAP;
});

test('large catalogue: upload session in chunks, no auth header on chunks', async () => {
  const size = 7 * 1024 * 1024 + 5;
  catalogueLib._set(cat(size));
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 200);
  const puts = calls.filter((x) => x.url === 'https://upload.example/u');
  assert.equal(puts.length, Math.ceil(size / graph.CHUNK));
  let expected = 0;
  for (const p of puts) {
    assert.equal(p.headers.authorization, undefined);
    const [, a, b, total] = p.headers['content-range'].match(/bytes (\d+)-(\d+)\/(\d+)/).map(Number);
    assert.equal(a, expected); assert.equal(total, size);
    expected = b + 1;
  }
  assert.equal(expected, size);
  assert.ok(calls.some((x) => x.url.endsWith('/messages/draft1/send')));
});

test('inline request body stays under 4 MB at the inline maximum', async () => {
  catalogueLib._set(cat(graph.INLINE_MAX - 1));
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 200);
  assert.ok(Buffer.byteLength(sends()[0].body) < 4 * 1000 * 1000);
});

test('sizes between the inline maximum and the upload-session minimum are refused', () => {
  assert.throws(() => graph.checkAttachmentSize(graph.INLINE_MAX));
  assert.throws(() => graph.checkAttachmentSize(graph.SESSION_MIN - 1));
  graph.checkAttachmentSize(graph.SESSION_MIN);
});

test('upload failure deletes the draft; lead kept, 202', async () => {
  catalogueLib._set(cat(4 * 1024 * 1024));
  mockFetch((url) => (url === 'https://upload.example/u' ? new Response('no', { status: 500 }) : null));
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 202);
  assert.ok(calls.some((x) => x.method === 'DELETE' && x.url.endsWith('/messages/draft1')));
});

test('helpers: emailKey and parseIp', () => {
  assert.equal(emailKey('A.B+c@GMail.com'), 'ab@gmail.com');
  assert.equal(emailKey('a.b+c@example.com'), 'a.b@example.com');
  assert.equal(parseIp('203.0.113.9:443'), '203.0.113.9');
  assert.equal(parseIp('2001:db8::1234'), '2001:db8::1234');
  assert.equal(parseIp('[2001:db8::1]:443'), '2001:db8::1');
  assert.equal(parseIp('garbage, 198.51.100.2'), '198.51.100.2');
  assert.equal(parseIp(''), '');
});
