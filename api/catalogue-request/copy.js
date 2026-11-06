'use strict';
/*
 * Email wording. Edit here only - BSI to approve before go-live.
 * Brand rules: "Berg+Schmidt" with no spaces; normal dashes, no em dashes.
 */
const { escapeHtml } = require('../lib/validate');

const customer = ({ name }) => ({
  subject: 'Berg+Schmidt India product catalogue',
  html: `<p>Dear ${escapeHtml(name)},</p>
<p>Thank you for your interest in Berg+Schmidt India. Our product catalogue is attached.</p>
<p>Berg+Schmidt India<br><a href="https://www.berg-schmidt.co.in">www.berg-schmidt.co.in</a></p>
<p style="color:#888;font-size:12px">You received this email because this address was entered on our catalogue request form. If that was not you, please ignore this email.</p>`,
});

const notify = ({ name, email, phone, sent, error }) => ({
  subject: `Catalogue request - ${name}`,
  html: `<p>New catalogue request from www.berg-schmidt.co.in/catalogue</p>
<table cellpadding="4" style="border-collapse:collapse">
<tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
<tr><td><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
<tr><td><b>Phone</b></td><td>${escapeHtml(phone)}</td></tr>
<tr><td><b>Catalogue sent</b></td><td>${sent ? 'Yes' : `No - ${escapeHtml(error || 'unknown error')}`}</td></tr>
</table>`,
});

module.exports = { customer, notify };
