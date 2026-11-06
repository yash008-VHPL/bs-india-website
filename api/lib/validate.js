'use strict';
const net = require('node:net');

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
// Letters (any script), combining marks, ZWJ/ZWNJ (needed in several Indic
// scripts), spaces and . ' - only. No digits, and a dot may not be followed
// by a letter (initials "S. K." or "S.K" are fine, "evil.com" is not), so the
// name cannot carry a link or message into the email we send.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\u200c\u200d .'\-]{1,99}$/u;
const DOT_WORD = /\.\p{L}{2,}/u;

function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.normalize('NFC')
    .replace(/[\u2018\u2019\u02bc]/g, "'")          // smart apostrophes (iOS default)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Returns { ok, value, fields } - fields lists the invalid inputs.
 * Phone: 10-15 digits once spaces, dashes, brackets, dots and a leading + are removed.
 */
function validate(body) {
  const name = clean(body && body.name, 100);
  const email = clean(body && body.email, 254);
  const phoneRaw = clean(body && body.phone, 30);
  const digits = phoneRaw.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  const fields = [];
  if (!NAME_RE.test(name) || DOT_WORD.test(name)) fields.push('name');
  if (!EMAIL_RE.test(email)) fields.push('email');
  if (!/^\d{10,15}$/.test(digits)) fields.push('phone');
  return { ok: fields.length === 0, fields, value: { name, email, phone: phoneRaw } };
}

/** One key per real mailbox for throttling: no +tags; Gmail ignores dots. */
function emailKey(email) {
  let [local, domain] = String(email).toLowerCase().split('@');
  local = local.split('+')[0];
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/** First valid IP from a header value; strips a port from v4 and [v6]:port. */
function parseIp(raw) {
  for (let part of String(raw || '').split(',')) {
    part = part.trim();
    const v6 = part.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (v6) part = v6[1];
    else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(part)) part = part.replace(/:\d+$/, '');
    if (net.isIP(part)) return part;
  }
  return '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { validate, emailKey, parseIp, escapeHtml };
