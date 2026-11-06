'use strict';
/*
 * Catalogue requests in Azure Table Storage.
 * Settings: LEADS_TABLE_CONNECTION (storage account connection string)
 *           LEADS_TABLE_NAME       (optional, default CatalogueRequests)
 *           IP_HASH_SALT           (random secret; without it no IP throttle)
 * PartitionKey = YYYY-MM (UTC), so time-bounded queries skip old partitions.
 */
const crypto = require('node:crypto');

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

/** Salted hash; '' when no salt is configured (IP throttle then off). */
function hashIp(ip) {
  const salt = process.env.IP_HASH_SALT;
  if (!ip || !salt) return '';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

const month = (d) => d.toISOString().slice(0, 7);

/**
 * Rows created after `since` that count towards limits (not failed, not
 * suspect), optionally matching column = value. Stops at `cap`.
 */
async function countSince({ column, value, since, cap }) {
  const c = getClient();
  if (!c) return 0;
  await ensureTable(c);
  const { odata } = require('@azure/data-tables');
  let filter = odata`PartitionKey ge ${month(since)} and createdAt ge ${since} and status ne ${'failed'} and status ne ${'suspect'}`;
  if (column === 'emailKey') filter += ' and ' + odata`emailKey eq ${value}`;
  else if (column === 'ipHash') filter += ' and ' + odata`ipHash eq ${value}`;
  else if (column) throw new Error(`unknown column ${column}`);
  let n = 0;
  for await (const _ of c.listEntities({ queryOptions: { filter, select: ['RowKey'] } })) {
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
  await c.createEntity(entity);
  return { partitionKey: entity.partitionKey, rowKey: entity.rowKey };
}

async function setStatus(key, status, error) {
  const c = getClient();
  if (!c || !key) return;
  await c.updateEntity({ ...key, status, error: error ? String(error).slice(0, 1000) : '' }, 'Merge');
}

module.exports = {
  insert, setStatus, countSince, hashIp,
  enabled: () => !!process.env.LEADS_TABLE_CONNECTION,
  _reset: () => { client = null; ensured = false; },
};
