'use strict';
/*
 * POST /api/contact-request
 *   { name, company, email, phone, product, type, message, bsi_hp (honeypot), t (ms on page) }
 *
 * 1. honeypot, validation, limits (fail closed)
 * 2. store the enquiry (Azure Table, CONTACT_TABLE_NAME, default ContactEnquiries)
 * 3. email it to CONTACT_NOTIFY_TO (falls back to NOTIFY_TO) from MAIL_SENDER,
 *    with Reply-To set to the visitor, so staff answer by pressing Reply
 *
 * Nothing is emailed to the visitor.
 *
 * Responses:
 *   200 {ok:true}                  enquiry emailed to the team
 *   202 {code:'received'}          stored, but the email to the team failed
 *   400 {code:'invalid', fields}
 *   415 {code:'unsupported'}
 *   429 {code:'too_many'}
 *   503 {code:'busy'}              site-wide daily cap reached
 *   500/503 {code:'retry'}         nothing kept - the visitor should try again
 *
 * Shares MAIL_SENDER, Graph settings, LEADS_TABLE_CONNECTION and IP_HASH_SALT
 * with the catalogue form (api/README.md).
 */
const { validate: validateBasic, emailKey, parseIp } = require('../lib/validate');
const store = require('../lib/store').forTable(process.env.CONTACT_TABLE_NAME || 'ContactEnquiries');
const { sendMail } = require('../lib/graph');
const { notify, TYPE_LABEL } = require('./copy');

const EMAIL_PER_DAY = 5;
const IP_PER_HOUR = 10;
const MIN_FILL_MS = 3000;
const BUDGET_MS = 30000;
const dailyCap = () => Number(process.env.CONTACT_DAILY_CAP) || 100;

function clean(v, max, keepNewlines = false) {
  if (typeof v !== 'string') return '';
  let s = v.normalize('NFC').replace(/[‘’ʼ]/g, "'").replace(/\r\n?/g, '\n');
  s = keepNewlines
    ? s.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
    : s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
}

/** Name and email rules come from the catalogue form; phone is optional here. */
function validate(body) {
  const b = body || {};
  const base = validateBasic({ name: b.name, email: b.email, phone: '0000000000' });
  const fields = base.fields.filter((f) => f !== 'phone');
  const phone = clean(b.phone, 30);
  if (phone && !/^\d{10,15}$/.test(phone.replace(/[\s\-().]/g, '').replace(/^\+/, ''))) fields.push('phone');
  const company = clean(b.company, 120);
  const product = clean(b.product, 80);
  const type = TYPE_LABEL[b.type] ? b.type : 'enquiry';
  const message = clean(b.message, 3000, true);
  if (message.length < 10) fields.push('message');
  return {
    ok: fields.length === 0,
    fields,
    value: { name: base.value.name, email: base.value.email, phone, company, product, type, message },
  };
}

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

  // Honeypot: keep a bounded 'suspect' row, send nothing, answer as success.
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
  const lead = v.value;
  const key = emailKey(lead.email);

  if (!store.enabled()) {
    log.error('LEADS_TABLE_CONNECTION not set');
    return reply(context, 503, { code: 'retry' });
  }

  try {
    if (await store.countSince({ since: day, cap: dailyCap(), exclude: ['suspect'] }) >= dailyCap()) {
      log.error('contact daily cap reached');
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

  const t = Number(body.t);
  const flagged = !(t >= MIN_FILL_MS);

  let row = null;
  try {
    row = await store.insert({ ...lead, emailKey: key, ipHash, userAgent, status: flagged ? 'flagged' : 'received' });
  } catch (err) {
    log.error('enquiry insert failed', err && err.message);
  }

  const sender = process.env.MAIL_SENDER;
  const to = process.env.CONTACT_NOTIFY_TO || process.env.NOTIFY_TO;
  let sent = false;
  let error = '';
  if (!sender || !to) {
    error = 'MAIL_SENDER or CONTACT_NOTIFY_TO not set';
    log.error(error);
  } else {
    try {
      const m = notify({ ...lead, flagged });
      await sendMail({ from: sender, to, subject: m.subject, html: m.html, replyTo: lead.email, saveToSentItems: false, deadline });
      sent = true;
    } catch (err) {
      error = 'send failed';
      log.error('enquiry notification failed', err && err.message);
    }
  }
  try {
    if (row) await store.setStatus(row, sent ? (flagged ? 'flagged-sent' : 'sent') : 'failed', error);
  } catch (err) {
    log.error('status update failed', err && err.message);
  }

  if (sent) return reply(context, 200, { ok: true });
  if (row) return reply(context, 202, { code: 'received' });
  return reply(context, 500, { code: 'retry' });
};

module.exports.validate = validate;
