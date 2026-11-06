'use strict';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

function clean(v, max) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/**
 * Returns { ok, value, fields } - fields lists the invalid inputs.
 * Phone: 10-15 digits once spaces, dashes, brackets and a leading + are removed.
 */
function validate(body) {
  const name = clean(body && body.name, 100);
  const email = clean(body && body.email, 254);
  const phoneRaw = clean(body && body.phone, 30);
  const digits = phoneRaw.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  const fields = [];
  if (name.length < 2) fields.push('name');
  if (!EMAIL_RE.test(email)) fields.push('email');
  if (!/^\d{10,15}$/.test(digits)) fields.push('phone');
  return { ok: fields.length === 0, fields, value: { name, email, phone: phoneRaw } };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { validate, escapeHtml };
