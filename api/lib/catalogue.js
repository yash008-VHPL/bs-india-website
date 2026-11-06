'use strict';
/*
 * The catalogue PDF lives in a PRIVATE blob container, not in the repo
 * (the repo is public) and not in public/ (downloadable without the form).
 * Settings: LEADS_TABLE_CONNECTION (same storage account)
 *           CATALOGUE_CONTAINER (default "catalogue"), CATALOGUE_BLOB (default "catalogue.pdf")
 *           CATALOGUE_NAME (attachment file name shown to the customer)
 * Cached for 10 minutes, so replacing the blob takes effect within that time
 * (a first upload within 1 minute).
 */
const { checkAttachmentSize } = require('./graph');

const TTL_MS = 10 * 60 * 1000;
const ERROR_TTL_MS = 60 * 1000;
let cache = null;   // { at, value } or { at, error }

async function loadCatalogue() {
  if (cache && cache.error && cache.at > Date.now() - ERROR_TTL_MS) throw cache.error;
  // A missing catalogue is re-checked after 1 minute, a loaded one after 10.
  if (cache && !cache.error && cache.at > Date.now() - (cache.value ? TTL_MS : ERROR_TTL_MS)) return cache.value;
  try {
    return await fetchCatalogue();
  } catch (err) {
    cache = { at: Date.now(), error: err };
    throw err;
  }
}

async function fetchCatalogue() {
  const conn = process.env.LEADS_TABLE_CONNECTION;
  if (!conn) return null;
  const { BlobServiceClient } = require('@azure/storage-blob');
  const blob = BlobServiceClient.fromConnectionString(conn)
    .getContainerClient(process.env.CATALOGUE_CONTAINER || 'catalogue')
    .getBlobClient(process.env.CATALOGUE_BLOB || 'catalogue.pdf');
  let bytes;
  try {
    bytes = await blob.downloadToBuffer(0, undefined, { abortSignal: AbortSignal.timeout(10000) });
  } catch (err) {
    if (err && (err.statusCode === 404 || err.code === 'BlobNotFound' || err.code === 'ContainerNotFound')) {
      cache = { at: Date.now(), value: null };
      return null;
    }
    throw err;
  }
  if (bytes.length === 0) {
    cache = { at: Date.now(), value: null };
    return null;
  }
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('Catalogue blob is not a PDF');
  checkAttachmentSize(bytes.length);
  const value = {
    name: process.env.CATALOGUE_NAME || 'Berg+Schmidt-India-Catalogue.pdf',
    contentType: 'application/pdf',
    bytes,
  };
  cache = { at: Date.now(), value };
  return value;
}

module.exports = { loadCatalogue, _set: (v) => { cache = v === undefined ? null : { at: Date.now(), value: v }; } };
