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

// Intercept forTable so the contact handler gets an in-memory store.
const storeMod = require('../lib/store');
let rows = [];
let fail = { insert: false, count: false };
const mem = {
  enabled: () => !!process.env.LEADS_TABLE_CONNECTION,
  hashIp: storeMod.hashIp,
  insert: async (lead) => {
    if (fail.insert) throw new Error('table down');
    const k = { partitionKey: 'p', rowKey: String(rows.length) };
    rows.push({ status: 'received', ...lead, createdAt: new Date(), key: k });
    return k;
  },
  setStatus: async (key, status, error) => { const r = rows.find((x) => x.key.rowKey === key?.rowKey); if (r) Object.assign(r, { status, error }); },
  countSince: async ({ column, value, since, cap, exclude = [] }) => {
    if (fail.count) throw new Error('table down');
    return Math.min(cap, rows.filter((r) => r.createdAt >= since && !exclude.includes(r.status) && (!column || r[column] === value)).length);
  },
};
let tableAsked = null;
storeMod.forTable = (name) => { tableAsked = name; return mem; };

const handler = require('../contact-request');
const graph = require('../lib/graph');

let calls = [];
let sendStatus = 202;
global.fetch = async (url, opts = {}) => {
  calls.push({ url: String(url), body: opts.body });
  if (String(url).includes('login.microsoftonline.com')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
  return new Response(null, { status: sendStatus });
};
const ctx = () => ({ log: Object.assign(() => {}, { error() {}, warn() {}, info() {} }) });
const req = (body, headers = {}) => ({ headers: { 'content-type': 'application/json', 'x-azure-clientip': '203.0.113.9', ...headers }, body });
const good = { name: 'Anil Patil', company: 'Patil Poultry', email: 'farmer@example.com', phone: '+91 98765 43210', product: 'Bergaapur', type: 'pricing', message: 'Need pricing for 20,000 broilers.\nPune district.', t: 9000 };
const sends = () => calls.filter((c) => c.url.endsWith('/sendMail'));
const run = async (body, headers) => { const c = ctx(); await handler(c, req(body, headers)); return { status: c.res.status, body: JSON.parse(c.res.body) }; };

test.beforeEach(() => { rows = []; calls = []; sendStatus = 202; fail = { insert: false, count: false }; graph._reset(); delete process.env.CONTACT_NOTIFY_TO; });

test('uses its own table', () => assert.strictEqual(tableAsked, 'ContactEnquiries'));

test('good enquiry is stored and emailed to the team with reply-to the visitor', async () => {
  const r = await run(good);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(sends().length, 1);
  const m = JSON.parse(sends()[0].body).message;
  assert.strictEqual(m.toRecipients[0].emailAddress.address, 'leads@example.com');
  assert.strictEqual(m.replyTo[0].emailAddress.address, 'farmer@example.com');
  assert.match(m.subject, /Pricing \/ availability - Anil Patil/);
  assert.match(m.body.content, /20,000 broilers\.<br>Pune district\./);
  assert.strictEqual(rows[0].status, 'sent');
});

test('CONTACT_NOTIFY_TO overrides NOTIFY_TO', async () => {
  process.env.CONTACT_NOTIFY_TO = 'sales@example.com';
  await run(good);
  assert.strictEqual(JSON.parse(sends()[0].body).message.toRecipients[0].emailAddress.address, 'sales@example.com');
});

test('nothing is sent to the visitor', async () => {
  await run(good);
  assert.deepStrictEqual(sends().map((s) => JSON.parse(s.body).message.toRecipients[0].emailAddress.address), ['leads@example.com']);
});

test('message HTML is escaped', async () => {
  await run({ ...good, message: '<script>alert(1)</script> hello there' });
  assert.ok(!sends()[0].body.includes('<script>'));
});

test('phone is optional but checked when given', async () => {
  assert.strictEqual((await run({ ...good, phone: '' })).status, 200);
  const r = await run({ ...good, phone: '12' });
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(r.body.fields, ['phone']);
});

test('short message and bad email rejected', async () => {
  const r = await run({ ...good, email: 'x', message: 'hi' });
  assert.deepStrictEqual(r.body.fields.sort(), ['email', 'message']);
  assert.strictEqual(sends().length, 0);
});

test('unknown enquiry type falls back to enquiry', () => {
  assert.strictEqual(handler.validate({ ...good, type: 'evil' }).value.type, 'enquiry');
});

test('honeypot: success reply, stored as suspect, nothing sent', async () => {
  const r = await run({ ...good, bsi_hp: 'x' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(sends().length, 0);
  assert.strictEqual(rows[0].status, 'suspect');
});

test('fast submission is sent but marked for checking', async () => {
  await run({ ...good, t: 500 });
  assert.match(JSON.parse(sends()[0].body).message.subject, /^\[CHECK\]/);
  assert.strictEqual(rows[0].status, 'flagged-sent');
});

test('per-email limit', async () => {
  for (let i = 0; i < 5; i++) assert.strictEqual((await run(good, { 'x-azure-clientip': `198.51.100.${i}` })).status, 200);
  assert.strictEqual((await run(good, { 'x-azure-clientip': '198.51.100.99' })).status, 429);
});

test('per-IP limit', async () => {
  for (let i = 0; i < 10; i++) await run({ ...good, email: `f${i}@example.com` });
  assert.strictEqual((await run({ ...good, email: 'new@example.com' })).status, 429);
});

test('limits unavailable: fails closed', async () => {
  fail.count = true;
  assert.strictEqual((await run(good)).status, 503);
  assert.strictEqual(sends().length, 0);
});

test('send fails but stored: 202 received', async () => {
  sendStatus = 500;
  const r = await run(good);
  assert.strictEqual(r.status, 202);
  assert.strictEqual(rows[0].status, 'failed');
});

test('send and store both fail: 500 retry', async () => {
  sendStatus = 500; fail.insert = true;
  assert.strictEqual((await run(good)).status, 500);
});

test('wrong content type', async () => {
  const c = ctx(); await handler(c, req(good, { 'content-type': 'text/plain' }));
  assert.strictEqual(c.res.status, 415);
});
