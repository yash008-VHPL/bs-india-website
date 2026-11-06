'use strict';
/*
 * Catalogue requests in Azure Table Storage.
 * Settings: LEADS_TABLE_CONNECTION (storage account connection string)
 *           LEADS_TABLE_NAME       (optional, default CatalogueRequests)
 *           IP_HASH_SALT           (random secret; without it no IP throttle)
 * PartitionKey = YYYY-MM (UTC), so time-bounded queries skip old partitions.
 */
const crypto = require('node:crypto');
const net = require('node:net');

let client = null;
let ensured = false;

function getClient() {
  if (client) return client;
  const conn = process.env.LEADS_TABLE_CONNECTION;
  if (!conn) return null;
  const { TableClient } = require('@azure/data-tables');
  client = TableClient.fromConnectionString(conn, process.env.LEADS_TABLE_NAME || 'CatalogueRequests');
  return client;
}

async function ensureTable(c) {
  if (ensured) return;
  await c.createTable(); // no-op if it already exists
  ensured = true;
}

/** IPv6 addresses are bucketed by /64 (one household or host usually holds a whole /64). */
function ipBucket(ip) {
  if (net.isIP(ip) !== 6) return ip;
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) return ip.slice(7);
  const [head, tail = ''] = ip.toLowerCase().split('%')[0].split('::');
  const h = head ? head.split(':') : [];
  const t = ip.includes('::') && tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h;
  return groups.slice(0, 4).map((g) => parseInt(g || '0', 16).toString(16)).join(':') + '::/64';
}

/** Salted hash; '' when no salt is configured (IP limit then off - logged by the caller). */
function hashIp(ip) {
  const salt = process.env.IP_HASH_SALT;
  if (!ip || !salt) return '';
  return crypto.createHash('sha256').update(`${salt}:${ipBucket(ip)}`).digest('hex').slice(0, 32);
}

const month = (d) => d.toISOString().slice(0, 7);
const TABLE_TIMEOUT_MS = 4000;
const signal = () => AbortSignal.timeout(TABLE_TIMEOUT_MS);

/**
 * Rows created after `since`, optionally matching column = value, leaving
 * out rows whose status is in `exclude`. Stops at `cap`.
 */
async function countSince({ column, value, since, cap, exclude = [] }) {
  const c = getClient();
  if (!c) return 0;
  await ensureTable(c);
  const { odata } = require('@azure/data-tables');
  let filter = odata`PartitionKey ge ${month(since)} and createdAt ge ${since}`;
  for (const st of exclude) filter += ' and ' + odata`status ne ${st}`;
  if (column === 'emailKey') filter += ' and ' + odata`emailKey eq ${value}`;
  else if (column === 'ipHash') filter += ' and ' + odata`ipHash eq ${value}`;
  else if (column) throw new Error(`unknown column ${column}`);
  let n = 0;
  for await (const _ of c.listEntities({ queryOptions: { filter, select: ['RowKey'] }, abortSignal: signal() })) {
    if (++n >= cap) break;
  }
  return n;
}

async function insert(lead) {
  const c = getClient();
  if (!c) return null;
  await ensureTable(c);
  const now = new Date();
  const entity = {
    status: 'received',
    ...lead,
    partitionKey: month(now),
    rowKey: `${now.toISOString().replace(/[:.]/g, '-')}_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: now,
  };
  await c.createEntity(entity, { abortSignal: signal() });
  return { partitionKey: entity.partitionKey, rowKey: entity.rowKey };
}

async function setStatus(key, status, error) {
  const c = getClient();
  if (!c || !key) return;
  await c.updateEntity({ ...key, status, error: error ? String(error).slice(0, 1000) : '' }, 'Merge', { abortSignal: signal() });
}

module.exports = {
  insert, setStatus, countSince, hashIp, ipBucket,
  enabled: () => !!process.env.LEADS_TABLE_CONNECTION,
  _reset: () => { client = null; ensured = false; },
};
