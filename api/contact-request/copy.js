'use strict';
/*
 * Internal notification wording for website enquiries. Goes only to the BSI
 * leads inbox; nothing is sent to the visitor.
 * Brand rules: "Berg+Schmidt" with no spaces; normal dashes, no em dashes.
 */
const { escapeHtml } = require('../lib/validate');

const TYPE_LABEL = {
  enquiry: 'Product enquiry',
  tds: 'Technical data sheet',
  pricing: 'Pricing / availability',
  technical: 'Technical support',
  partnership: 'Distribution / partnership',
  other: 'Other',
};

const row = (k, v) => `<tr><td valign="top"><b>${k}</b></td><td>${v}</td></tr>`;

const notify = ({ name, company, email, phone, product, type, message, flagged }) => ({
  subject: `${flagged ? '[CHECK] ' : ''}Website enquiry - ${TYPE_LABEL[type] || 'Enquiry'}${company ? ` - ${company}` : ''}`,
  html: `<p>New enquiry from www.berg-schmidt.co.in/contact. Reply to this email to answer the sender directly.</p>
<p style="color:#777">The sender's email address is not verified. Do not open links in the message unless you recognise the sender.</p>
${flagged ? '<p style="color:#B71C42"><b>Submitted faster than a person usually types. Check it is genuine before replying.</b></p>' : ''}
<table cellpadding="4" style="border-collapse:collapse">
${row('Name', escapeHtml(name))}
${row('Company / Farm', escapeHtml(company || '-'))}
${row('Email', escapeHtml(email))}
${row('Phone / WhatsApp', escapeHtml(phone || '-'))}
${row('Product', escapeHtml(product || '-'))}
${row('Enquiry type', escapeHtml(TYPE_LABEL[type] || type))}
${row('Message', escapeHtml(message).replace(/\n/g, '<br>'))}
</table>`,
});

module.exports = { notify, TYPE_LABEL };
