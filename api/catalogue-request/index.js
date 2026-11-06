'use strict';
/*
 * POST /api/catalogue-request  { name, email, phone, bsi_hp (honeypot), t (ms on page) }
 *
 * 1. bot checks, validation, limits (fail closed)
 * 2. store the request (Azure Table)
 * 3. email the catalogue to the requester (Graph, from MAIL_SENDER)
 * 4. notify NOTIFY_TO with the lead details
 *
 * Responses:
 *   200 {ok:true}                  catalogue sent
 *   202 {code:'received'}          not sent, but the lead was stored or notified
 *   400 {code:'invalid', fields}   fix the fields
 *   415 {code:'unsupported'}
 *   429 {code:'too_many'}
 *   500/503 {code:'retry'}         nothing kept - the visitor should try again
 *
 * App settings: see api/README.md
 */
const { validate, emailKey, parseIp } = require('../lib/validate');
const store = require('../lib/store');
const { sendMail } = require('../lib/graph');
const catalogueLib = require('../lib/catalogue');
const copy = require('./copy');

const EMAIL_PER_DAY = 3;
const IP_PER_HOUR = 10;
const MIN_FILL_MS = 1500;
const dailyCap = () => Number(process.env.CATALOGUE_DAILY_CAP) || 200;

function clientIp(req) {
  const h = req.headers || {};
  return parseIp(h['x-azure-clientip']) || parseIp(h['x-forwarded-for']);
}

function reply(context, status, body) {
  context.res = {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

module.exports = async function (context, req) {
  const log = context.log;
  const headers = req.headers || {};
  if (!String(headers['content-type'] || '').includes('application/json')) {
    return reply(context, 415, { code: 'unsupported' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return reply(context, 400, { code: 'invalid', fields: [] });

  const v = validate(body);
  const ipHash = store.hashIp(clientIp(req));
  const userAgent = String(headers['user-agent'] || '').slice(0, 300);

  // Bots: filled the hidden field, sent no timing, or were faster than a
  // person. Keep a 'suspect' row for review, send nothing, and answer as if
  // it worked so they learn nothing.
  const t = Number(body.t);
  if (body.bsi_hp || !(t >= MIN_FILL_MS)) {
    try {
      await store.insert({ ...v.value, emailKey: v.value.email ? emailKey(v.value.email) : '', ipHash, userAgent, status: 'suspect' });
    } catch (err) {
      log.error('suspect insert failed', err && err.message);
    }
    return reply(context, 200, { ok: true });
  }

  if (!v.ok) return reply(context, 400, { code: 'invalid', fields: v.fields });
  const { name, email, phone } = v.value;
  const key = emailKey(email);

  if (!store.enabled()) {
    log.error('LEADS_TABLE_CONNECTION not set');
    return reply(context, 503, { code: 'retry' });
  }

  // Limits. Fail closed: if they cannot be checked, nothing is sent.
  try {
    const now = Date.now();
    const day = new Date(now - 24 * 3600 * 1000);
    if (await store.countSince({ since: day, cap: dailyCap() }) >= dailyCap()) {
      log.error('daily cap reached');
      return reply(context, 429, { code: 'too_many' });
    }
    if (await store.countSince({ column: 'emailKey', value: key, since: day, cap: EMAIL_PER_DAY }) >= EMAIL_PER_DAY) {
      return reply(context, 429, { code: 'too_many' });
    }
    if (ipHash && await store.countSince({ column: 'ipHash', value: ipHash, since: new Date(now - 3600 * 1000), cap: IP_PER_HOUR }) >= IP_PER_HOUR) {
      return reply(context, 429, { code: 'too_many' });
    }
  } catch (err) {
    log.error('limit check failed', err && err.message);
    return reply(context, 503, { code: 'retry' });
  }

  let row = null;
  try {
    row = await store.insert({ name, email, emailKey: key, phone, ipHash, userAgent });
  } catch (err) {
    log.error('lead insert failed', err && err.message);
  }

  const sender = process.env.MAIL_SENDER;
  let sent = false;
  let error = '';
  let catalogue = null;
  try {
    catalogue = await catalogueLib.loadCatalogue();
    if (!catalogue) error = 'catalogue file not uploaded yet';
  } catch (err) {
    error = 'catalogue could not be loaded';
    log.error('catalogue load failed', err && err.message);
  }

  if (catalogue && !sender) error = 'MAIL_SENDER not set';
  if (catalogue && sender) {
    try {
      const m = copy.customer({ name });
      await sendMail({ from: sender, to: email, subject: m.subject, html: m.html, attachment: catalogue, saveToSentItems: true });
      sent = true;
    } catch (err) {
      error = 'send failed';
      log.error('catalogue send failed', err && err.message);
    }
  }

  const notifyTask = (async () => {
    if (!sender || !process.env.NOTIFY_TO) return false;
    const n = copy.notify({ name, email, phone, sent, error });
    await sendMail({ from: sender, to: process.env.NOTIFY_TO, subject: n.subject, html: n.html, replyTo: email, saveToSentItems: false });
    return true;
  })().catch((err) => { log.error('notification failed', err && err.message); return false; });
  const statusTask = store.setStatus(row, sent ? 'sent' : 'failed', error)
    .catch((err) => log.error('status update failed', err && err.message));
  const [notified] = await Promise.all([notifyTask, statusTask]);

  if (sent) return reply(context, 200, { ok: true });
  if (row || notified) return reply(context, 202, { code: 'received' });
  return reply(context, 500, { code: 'retry' });
};
