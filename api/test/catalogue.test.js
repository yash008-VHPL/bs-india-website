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

const real = { countSince: store.countSince, insert: store.insert };

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
store.countSince = async ({ column, value, since, cap, exclude = [] }) => {
  if (storeFail.count) throw new Error('table down');
  return Math.min(cap, rows.filter((r) => r.createdAt >= since && !exclude.includes(r.status)
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

test('honeypot: stored as suspect (bounded per IP), nothing sent, fake success', async () => {
  for (let i = 0; i < 15; i++) {
    const c = ctx(); await handler(c, req({ ...good, bsi_hp: 'x' }));
    assert.equal(c.res.status, 200);
  }
  assert.equal(calls.length, 0);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((r) => r.status === 'suspect'));
  // suspect rows do not use up a real visitor's limits
  const c = ctx(); await handler(c, req(good));
  assert.equal(c.res.status, 200);
});

test('too fast or no timing: flagged, stored, info@ notified, catalogue not sent, 202', async () => {
  for (const b of [{ ...good, t: 500 }, { name: good.name, email: good.email, phone: good.phone }]) {
    mockFetch();
    const c = ctx(); await handler(c, req(b));
    assert.equal(c.res.status, 202);
    assert.equal(JSON.parse(c.res.body).code, 'received');
    assert.equal(sends().length, 1);
    const msg = JSON.parse(sends()[0].body).message;
    assert.equal(msg.toRecipients[0].emailAddress.address, 'leads@example.com');
    assert.match(msg.body.content, /flagged/);
  }
  assert.ok(rows.every((r) => r.status === 'flagged'));
});

test('failed sends still count towards the per-IP limit (no inbox flood)', async () => {
  catalogueLib._set(null);
  const st = [];
  for (let i = 0; i < 11; i++) { const c = ctx(); await handler(c, req({ ...good, email: `f${i}@example.com` })); st.push(c.res.status); }
  assert.deepEqual(st, [...Array(10).fill(202), 429]);
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
  try {
    c = ctx(); await handler(c, req({ ...good, email: 'other@example.com' }, { 'x-azure-clientip': '198.51.100.1' }));
    assert.equal(c.res.status, 503);
    assert.equal(JSON.parse(c.res.body).code, 'busy');
  } finally {
    delete process.env.CATALOGUE_DAILY_CAP;
  }
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

test('validate: real names pass, link-carrying names fail', () => {
  const ok = (n) => validate({ name: n, email: 'a@b.co', phone: '9876543210' }).ok;
  for (const n of ['S. K. Patil', 'S.K. Patil', 'D’Souza', 'श्री. र. कुलकर्णी', 'र्‍या पाटील', 'ശ്രീ']) assert.ok(ok(n), n);
  for (const n of ['Claim prize at evil.com', 'Get cash at bit.ly', 'A', 'x 100']) assert.ok(!ok(n), n);
});

test('store.countSince builds a partition-bounded, escaped filter', async () => {
  const { TableClient } = require('@azure/data-tables');
  const orig = { list: TableClient.prototype.listEntities, create: TableClient.prototype.createTable };
  let seen;
  TableClient.prototype.createTable = async () => {};
  TableClient.prototype.listEntities = function (opts) { seen = opts; return (async function* () { yield {}; yield {}; })(); };
  try {
    store._reset();
    const n = await real.countSince({ column: 'emailKey', value: "o'x@y.com", since: new Date('2026-11-05T00:00:00Z'), cap: 5, exclude: ['failed'] });
    assert.equal(n, 2);
    assert.equal(seen.queryOptions.filter,
      "PartitionKey ge '2026-11' and createdAt ge datetime'2026-11-05T00:00:00.000Z' and status ne 'failed' and emailKey eq 'o''x@y.com'");
    await assert.rejects(real.countSince({ column: 'name', value: 'x', since: new Date(), cap: 1 }));
  } finally {
    TableClient.prototype.listEntities = orig.list;
    TableClient.prototype.createTable = orig.create;
    store._reset();
  }
});

test('store.hashIp: needs a salt; IPv6 bucketed by /64', () => {
  const h = store.hashIp;
  assert.equal(h('2001:db8:1:2::9'), h('2001:db8:1:2:aaaa::1'));
  assert.notEqual(h('2001:db8:1:2::9'), h('2001:db8:1:3::9'));
  const salt = process.env.IP_HASH_SALT;
  delete process.env.IP_HASH_SALT;
  try { assert.equal(h('203.0.113.9'), ''); } finally { process.env.IP_HASH_SALT = salt; }
});

test('catalogue loader: 404 and empty are missing, non-PDF and gap sizes throw', async () => {
  const blobLib = require('@azure/storage-blob');
  const orig = blobLib.BlobServiceClient.fromConnectionString;
  let next;
  blobLib.BlobServiceClient.fromConnectionString = () => ({
    getContainerClient: () => ({ getBlobClient: () => ({ downloadToBuffer: async () => next() }) }),
  });
  const load = async () => { catalogueLib._set(undefined); return catalogueLib.loadCatalogue(); };
  try {
    next = () => { const e = new Error('nf'); e.statusCode = 404; throw e; };
    assert.equal(await load(), null);
    next = () => Buffer.alloc(0);
    assert.equal(await load(), null);
    next = () => Buffer.from('<html>');
    await assert.rejects(load(), /not a PDF/);
    next = () => Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(graph.INLINE_MAX)]);
    await assert.rejects(load(), /resize/);
    next = () => Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(100)]);
    const c = await load();
    assert.equal(c.bytes.length, 108);
    // errors are cached briefly: a second call does not download again
    let downloads = 0;
    next = () => { downloads++; throw new Error('boom'); };
    catalogueLib._set(undefined);
    await assert.rejects(catalogueLib.loadCatalogue());
    await assert.rejects(catalogueLib.loadCatalogue());
    assert.equal(downloads, 1);
  } finally {
    blobLib.BlobServiceClient.fromConnectionString = orig;
    catalogueLib._set(undefined);
  }
});

test('deadline: a spent budget aborts Graph calls instead of overrunning', async () => {
  await assert.rejects(graph.sendMail({ from: 'a@b.co', to: 'c@d.co', subject: 's', html: 'h', deadline: Date.now() - 1 }), /budget/);
});
