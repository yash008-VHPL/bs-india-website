'use strict';
/*
 * POST /api/catalogue-request  { name, email, phone, website (honeypot), t (ms on page) }
 *
 * 1. validate + bot checks + throttle
 * 2. store the request (Azure Table)
 * 3. email the catalogue to the requester (Graph, from MAIL_SENDER)
 * 4. notify NOTIFY_TO with the lead details
 *
 * App settings: see api/README.md
 */
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../lib/validate');
const store = require('../lib/store');
const { sendMail } = require('../lib/graph');
const copy = require('./copy');

const EMAIL_PER_DAY = 3;
const IP_PER_HOUR = 10;
const MIN_FILL_MS = 2500;

let catalogueCache = null;
function loadCatalogue() {
  if (catalogueCache) return catalogueCache;
  const file = process.env.CATALOGUE_FILE || 'catalogue.pdf';
  const full = path.join(__dirname, '..', 'catalogue', path.basename(file));
  if (!fs.existsSync(full)) return null;
  catalogueCache = {
    name: process.env.CATALOGUE_NAME || 'Berg+Schmidt-India-Catalogue.pdf',
    contentType: 'application/pdf',
    bytes: fs.readFileSync(full),
  };
  return catalogueCache;
}

function clientIp(req) {
  const h = req.headers || {};
  const raw = h['x-azure-clientip'] || h['x-client-ip'] || (h['x-forwarded-for'] || '').split(',')[0];
  return String(raw || '').trim().replace(/:\d+$/, '');
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
  const ctype = String((req.headers || {})['content-type'] || '');
  if (!ctype.includes('application/json')) return reply(context, 415, { error: 'unsupported' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return reply(context, 400, { error: 'invalid', fields: [] });

  // Bots: filled the hidden field, or submitted faster than a person can type.
  // Answer as if it worked so they learn nothing.
  if (body.website || (Number(body.t) > 0 && Number(body.t) < MIN_FILL_MS)) {
    return reply(context, 200, { ok: true });
  }

  const v = validate(body);
  if (!v.ok) return reply(context, 400, { error: 'invalid', fields: v.fields });
  const { name, email, phone } = v.value;
  const emailLower = email.toLowerCase();
  const ipHash = store.hashIp(clientIp(req));

  if (store.enabled()) {
    try {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const hourAgo = new Date(Date.now() - 3600 * 1000);
      if (await store.countSince('emailLower', emailLower, dayAgo, EMAIL_PER_DAY) >= EMAIL_PER_DAY
        || await store.countSince('ipHash', ipHash, hourAgo, IP_PER_HOUR) >= IP_PER_HOUR) {
        return reply(context, 429, { error: 'too_many' });
      }
    } catch (err) {
      log.error('throttle check failed', err && err.message);
    }
  } else {
    log.warn('LEADS_TABLE_CONNECTION not set: requests are not stored or throttled');
  }

  let key = null;
  try {
    key = await store.insert({
      name, email, emailLower, phone, ipHash,
      userAgent: String((req.headers || {})['user-agent'] || '').slice(0, 300),
    });
  } catch (err) {
    log.error('lead insert failed', err && err.message);
  }

  const sender = process.env.MAIL_SENDER;
  const catalogue = loadCatalogue();
  let sent = false;
  let error = '';

  if (!catalogue) {
    error = 'catalogue file not uploaded yet';
  } else if (!sender) {
    error = 'MAIL_SENDER not set';
  } else {
    try {
      const m = copy.customer({ name });
      await sendMail({ from: sender, to: email, subject: m.subject, html: m.html, attachment: catalogue, saveToSentItems: true });
      sent = true;
    } catch (err) {
      error = 'send failed';
      log.error('catalogue send failed', err && err.message);
    }
  }

  if (sender && process.env.NOTIFY_TO) {
    try {
      const n = copy.notify({ name, email, phone, sent, error });
      await sendMail({ from: sender, to: process.env.NOTIFY_TO, subject: n.subject, html: n.html, replyTo: email, saveToSentItems: false });
    } catch (err) {
      log.error('notification failed', err && err.message);
    }
  }

  try {
    await store.setStatus(key, sent ? 'sent' : 'failed', error);
  } catch (err) {
    log.error('status update failed', err && err.message);
  }

  if (sent) return reply(context, 200, { ok: true });
  if (!catalogue) return reply(context, 503, { error: 'unavailable' });
  return reply(context, 502, { error: 'send_failed' });
};

module.exports._reset = () => { catalogueCache = null; };
