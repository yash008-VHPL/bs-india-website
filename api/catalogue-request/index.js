'use strict';
/*
 * POST /api/catalogue-request  { name, email, phone, bsi_hp (honeypot), t (ms on page) }
 *
 * 1. honeypot, validation, limits (fail closed)
 * 2. store the request (Azure Table)
 * 3. email the catalogue to the requester (Graph, from MAIL_SENDER)
 * 4. notify NOTIFY_TO with the lead details
 *
 * Row status: received -> sent | failed; 'flagged' (submitted faster than a
 * person types: stored and notified, catalogue not sent automatically);
 * 'suspect' (honeypot filled: stored only, nothing sent).
 *
 * Responses:
 *   200 {ok:true}                  catalogue sent
 *   202 {code:'received'}          not sent, but the lead was stored or notified
 *   400 {code:'invalid', fields}   fix the fields
 *   415 {code:'unsupported'}
 *   429 {code:'too_many'}          this visitor has hit a limit
 *   503 {code:'busy'}              site-wide daily cap reached
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
const BUDGET_MS = 35000; // SWA cuts an API request off at 45 s
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
  const deadline = Date.now() + BUDGET_MS;
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
  const now = Date.now();
  const day = new Date(now - 24 * 3600 * 1000);
  const hour = new Date(now - 3600 * 1000);

  // Honeypot filled: a bot. Keep a 'suspect' row for review - bounded per IP
  // and per day, so bots cannot fill the table - send nothing, and answer as
  // if it worked so they learn nothing.
  if (body.bsi_hp) {
    try {
      if (store.enabled()
        && (!ipHash || await store.countSince({ column: 'ipHash', value: ipHash, since: hour, cap: IP_PER_HOUR }) < IP_PER_HOUR)
        && await store.countSince({ since: day, cap: dailyCap() }) < dailyCap()) {
        await store.insert({ ...v.value, emailKey: v.value.email ? emailKey(v.value.email) : '', ipHash, userAgent, status: 'suspect' });
      }
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
  if (!ipHash) log.warn('IP_HASH_SALT not set or client IP unknown: per-IP limit is off');

  // Limits. Fail closed: if they cannot be checked, nothing is sent.
  // Daily and per-IP count failed sends too, so a broken send cannot be used
  // to flood the leads inbox; the per-mailbox limit skips them so a visitor is
  // not locked out by our failures.
  try {
    if (await store.countSince({ since: day, cap: dailyCap(), exclude: ['suspect'] }) >= dailyCap()) {
      log.error('daily cap reached');
      return reply(context, 503, { code: 'busy' });
    }
    if (ipHash && await store.countSince({ column: 'ipHash', value: ipHash, since: hour, cap: IP_PER_HOUR, exclude: ['suspect'] }) >= IP_PER_HOUR) {
      return reply(context, 429, { code: 'too_many' });
    }
    if (await store.countSince({ column: 'emailKey', value: key, since: day, cap: EMAIL_PER_DAY, exclude: ['failed', 'suspect'] }) >= EMAIL_PER_DAY) {
      return reply(context, 429, { code: 'too_many' });
    }
  } catch (err) {
    log.error('limit check failed', err && err.message);
    return reply(context, 503, { code: 'retry' });
  }

  // Faster than a person can fill three fields (or no timing sent): could be
  // autofill, could be a script. Keep and notify, but do not auto-send.
  const t = Number(body.t);
  const flagged = !(t >= MIN_FILL_MS);

  let row = null;
  try {
    row = await store.insert({ name, email, emailKey: key, phone, ipHash, userAgent, status: flagged ? 'flagged' : 'received' });
  } catch (err) {
    log.error('lead insert failed', err && err.message);
  }

  const sender = process.env.MAIL_SENDER;
  let sent = false;
  let error = '';

  if (flagged) {
    error = `flagged: form submitted ${Number.isFinite(t) ? `in ${Math.round(t)} ms` : 'without timing'} - please send the catalogue by hand if genuine`;
  } else {
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
        await sendMail({ from: sender, to: email, subject: m.subject, html: m.html, attachment: catalogue, saveToSentItems: true, deadline });
        sent = true;
      } catch (err) {
        error = 'send failed';
        log.error('catalogue send failed', err && err.message);
      }
    }
  }

  const notifyTask = (async () => {
    if (!sender || !process.env.NOTIFY_TO) return false;
    const n = copy.notify({ name, email, phone, sent, error });
    await sendMail({ from: sender, to: process.env.NOTIFY_TO, subject: n.subject, html: n.html, replyTo: email, saveToSentItems: false, deadline: deadline + 5000 });
    return true;
  })().catch((err) => { log.error('notification failed', err && err.message); return false; });
  const statusTask = (flagged ? Promise.resolve() : store.setStatus(row, sent ? 'sent' : 'failed', error))
    .catch((err) => log.error('status update failed', err && err.message));
  const [notified] = await Promise.all([notifyTask, statusTask]);

  if (sent) return reply(context, 200, { ok: true });
  if (row || notified) return reply(context, 202, { code: 'received' });
  return reply(context, 500, { code: 'retry' });
};
