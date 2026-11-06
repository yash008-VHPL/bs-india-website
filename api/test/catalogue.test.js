'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CAT_DIR = path.join(__dirname, '..', 'catalogue');
const TEST_FILE = '__test-catalogue.pdf';

process.env.GRAPH_TENANT_ID = 'tenant';
process.env.GRAPH_CLIENT_ID = 'client';
process.env.GRAPH_CLIENT_SECRET = 'secret';
process.env.MAIL_SENDER = 'sender@example.com';
process.env.NOTIFY_TO = 'leads@example.com';
process.env.CATALOGUE_FILE = TEST_FILE;
delete process.env.LEADS_TABLE_CONNECTION;

const handler = require('../catalogue-request');
const graph = require('../lib/graph');

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

const ctx = () => {
  const c = { log: Object.assign(() => {}, { error() {}, warn() {}, info() {} }) };
  return c;
};
const req = (body, headers = {}) => ({ headers: { 'content-type': 'application/json', ...headers }, body });
const good = { name: 'Test Farmer', email: 'farmer@example.com', phone: '+91 98765 43210', t: 9000 };

function setCatalogue(bytes) {
  handler._reset();
  graph._reset();
  const f = path.join(CAT_DIR, TEST_FILE);
  if (bytes === null) { if (fs.existsSync(f)) fs.unlinkSync(f); return; }
  fs.writeFileSync(f, bytes);
}
test.after(() => setCatalogue(null));

test('rejects non-JSON', async () => {
  mockFetch(); const c = ctx();
  await handler(c, { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' });
  assert.equal(c.res.status, 415);
  assert.equal(calls.length, 0);
});

test('validates fields', async () => {
  mockFetch(); const c = ctx();
  await handler(c, req({ name: 'A', email: 'nope', phone: '123', t: 9000 }));
  assert.equal(c.res.status, 400);
  assert.deepEqual(JSON.parse(c.res.body).fields, ['name', 'email', 'phone']);
  assert.equal(calls.length, 0);
});

test('honeypot and too-fast submissions are dropped silently', async () => {
  mockFetch();
  for (const b of [{ ...good, website: 'x' }, { ...good, t: 500 }]) {
    const c = ctx(); await handler(c, req(b));
    assert.equal(c.res.status, 200);
  }
  assert.equal(calls.length, 0);
});

test('missing catalogue: 503, info@ still notified', async () => {
  setCatalogue(null); mockFetch(); const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 503);
  const sends = calls.filter((x) => x.url.endsWith('/sendMail'));
  assert.equal(sends.length, 1);
  const msg = JSON.parse(sends[0].body).message;
  assert.equal(msg.toRecipients[0].emailAddress.address, 'leads@example.com');
  assert.equal(msg.replyTo[0].emailAddress.address, 'farmer@example.com');
  assert.match(msg.body.content, /not uploaded yet/);
});

test('small catalogue: sent inline, then notification', async () => {
  setCatalogue(Buffer.alloc(1000, 1)); mockFetch(); const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 200);
  const sends = calls.filter((x) => x.url.endsWith('/sendMail'));
  assert.equal(sends.length, 2);
  const first = JSON.parse(sends[0].body);
  assert.equal(first.message.toRecipients[0].emailAddress.address, 'farmer@example.com');
  assert.equal(Buffer.from(first.message.attachments[0].contentBytes, 'base64').length, 1000);
  assert.ok(sends[0].url.includes('/users/sender%40example.com/'));
});

test('large catalogue: upload session in chunks, no auth header on chunks', async () => {
  const size = 7 * 1024 * 1024 + 5;
  setCatalogue(Buffer.alloc(size, 2)); mockFetch(); const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 200);
  const puts = calls.filter((x) => x.url === 'https://upload.example/u');
  assert.equal(puts.length, Math.ceil(size / graph.CHUNK));
  let expected = 0;
  for (const p of puts) {
    assert.equal(p.headers.authorization, undefined);
    const [, a, b, total] = p.headers['content-range'].match(/bytes (\d+)-(\d+)\/(\d+)/).map(Number);
    assert.equal(a, expected); assert.equal(Number(total), size);
    expected = b + 1;
  }
  assert.equal(expected, size);
  assert.ok(calls.some((x) => x.url.endsWith('/messages/draft1/send')));
});

test('upload failure deletes the draft and returns 502', async () => {
  setCatalogue(Buffer.alloc(4 * 1024 * 1024, 3));
  mockFetch((url) => (url === 'https://upload.example/u' ? new Response('no', { status: 500 }) : null));
  const c = ctx();
  await handler(c, req(good));
  assert.equal(c.res.status, 502);
  assert.ok(calls.some((x) => x.method === 'DELETE' && x.url.endsWith('/messages/draft1')));
});

test('HTML in the name is escaped in both emails', async () => {
  setCatalogue(Buffer.alloc(10, 1)); mockFetch(); const c = ctx();
  await handler(c, req({ ...good, name: '<script>x</script>' }));
  for (const s of calls.filter((x) => x.url.endsWith('/sendMail'))) {
    assert.ok(!JSON.parse(s.body).message.body.content.includes('<script>'));
  }
});
