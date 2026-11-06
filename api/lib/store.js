'use strict';
/*
 * Catalogue requests in Azure Table Storage.
 * Setting: LEADS_TABLE_CONNECTION (storage account connection string)
 *          LEADS_TABLE_NAME       (optional, default CatalogueRequests)
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

function hashIp(ip) {
  if (!ip) return '';
  const salt = process.env.IP_HASH_SALT || process.env.GRAPH_CLIENT_ID || 'bsi';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/** Count rows matching a column value created after `since`. Stops at `cap`. */
async function countSince(column, value, since, cap) {
  const c = getClient();
  if (!c || !value) return 0;
  await ensureTable(c);
  const { odata } = require('@azure/data-tables');
  const filter = column === 'emailLower'
    ? odata`emailLower eq ${value} and createdAt ge ${since}`
    : odata`ipHash eq ${value} and createdAt ge ${since}`;
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
    partitionKey: now.toISOString().slice(0, 7),                    // YYYY-MM
    rowKey: `${now.toISOString().replace(/[:.]/g, '-')}_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: now,
    status: 'received',
    ...lead,
  };
  await c.createEntity(entity);
  return { partitionKey: entity.partitionKey, rowKey: entity.rowKey };
}

async function setStatus(key, status, error) {
  const c = getClient();
  if (!c || !key) return;
  await c.updateEntity({ ...key, status, error: error ? String(error).slice(0, 1000) : '' }, 'Merge');
}

module.exports = { insert, setStatus, countSince, hashIp, enabled: () => !!process.env.LEADS_TABLE_CONNECTION, _reset: () => { client = null; ensured = false; } };
