'use strict';
/*
 * Microsoft Graph mail sender (client-credentials flow).
 *
 * The app registration must NOT be granted tenant-wide Mail.Send. Scope it to
 * the one sender mailbox with Exchange Online RBAC for Applications
 * ("Application Mail.Send" role on a management scope that contains only
 * that mailbox). See api/README.md.
 *
 * Attachments:
 *   < 3 MB  -> single sendMail call with the file inline (base64)
 *   >= 3 MB -> draft + attachment upload session + send (Graph's large-file
 *              route; up to 150 MB, but keep the catalogue small - many
 *              receiving servers reject mail over ~10-20 MB)
 */

const GRAPH = 'https://graph.microsoft.com/v1.0';
const INLINE_LIMIT = 3 * 1024 * 1024;   // Graph's large-attachment threshold
const CHUNK = 320 * 1024 * 9;          // 2.8 MiB, under the 4 MB per-request cap
const TIMEOUT_MS = 20000;

let cachedToken = null;

function cfg() {
  const { GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET } = process.env;
  if (!GRAPH_TENANT_ID || !GRAPH_CLIENT_ID || !GRAPH_CLIENT_SECRET) {
    throw new Error('Graph settings missing (GRAPH_TENANT_ID / GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET)');
  }
  return { tenant: GRAPH_TENANT_ID, clientId: GRAPH_CLIENT_ID, secret: GRAPH_CLIENT_SECRET };
}

async function timedFetch(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getToken() {
  if (cachedToken && cachedToken.exp > Date.now() + 120000) return cachedToken.value;
  const { tenant, clientId, secret } = cfg();
  const r = await timedFetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  if (!r.ok) throw new Error(`Graph token request failed: ${r.status} ${await safeText(r)}`);
  const j = await r.json();
  cachedToken = { value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}

async function safeText(r) {
  try { return (await r.text()).slice(0, 500); } catch { return ''; }
}

async function graph(method, path, body) {
  const token = await getToken();
  const r = await timedFetch(`${GRAPH}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Graph ${method} ${path.split('?')[0]} failed: ${r.status} ${await safeText(r)}`);
  return r;
}

/**
 * @param {object} p
 * @param {string} p.from      sender mailbox (UPN or address)
 * @param {string} p.to        recipient address
 * @param {string} p.subject
 * @param {string} p.html      HTML body
 * @param {string} [p.replyTo]
 * @param {{name:string, contentType:string, bytes:Buffer}} [p.attachment]
 * @param {boolean} [p.saveToSentItems]
 */
async function sendMail({ from, to, subject, html, replyTo, attachment, saveToSentItems = true }) {
  const user = `/users/${encodeURIComponent(from)}`;
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  if (replyTo) message.replyTo = [{ emailAddress: { address: replyTo } }];

  if (!attachment || attachment.bytes.length < INLINE_LIMIT) {
    if (attachment) {
      message.attachments = [{
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.name,
        contentType: attachment.contentType,
        contentBytes: attachment.bytes.toString('base64'),
      }];
    }
    await graph('POST', `${user}/sendMail`, { message, saveToSentItems });
    return;
  }

  // Large attachment: draft, upload session, send.
  const draft = await (await graph('POST', `${user}/messages`, message)).json();
  const msgPath = `${user}/messages/${encodeURIComponent(draft.id)}`;
  try {
    const size = attachment.bytes.length;
    const session = await (await graph('POST', `${msgPath}/attachments/createUploadSession`, {
      AttachmentItem: { attachmentType: 'file', name: attachment.name, size, contentType: attachment.contentType },
    })).json();

    for (let start = 0; start < size; start += CHUNK) {
      const end = Math.min(start + CHUNK, size) - 1;
      const chunk = attachment.bytes.subarray(start, end + 1);
      // The upload URL carries its own auth; an Authorization header makes it fail.
      const r = await timedFetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': String(chunk.length),
          'content-range': `bytes ${start}-${end}/${size}`,
        },
        body: chunk,
      });
      if (!r.ok) throw new Error(`Attachment upload failed at byte ${start}: ${r.status} ${await safeText(r)}`);
    }
    await graph('POST', `${msgPath}/send`);
  } catch (err) {
    // Do not leave a half-built draft in the sender's mailbox.
    try { await graph('DELETE', msgPath); } catch { /* best effort */ }
    throw err;
  }
}

module.exports = { sendMail, _reset: () => { cachedToken = null; }, INLINE_LIMIT, CHUNK };
