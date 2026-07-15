const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_VERSION = 1;

function fileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function createBackupManifest(filePath, now = new Date()) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error('Backup artifact must be a non-empty file');
  return {
    version: MANIFEST_VERSION,
    file: path.basename(filePath),
    bytes: stat.size,
    sha256: fileSha256(filePath),
    recordedAt: now.toISOString(),
    fileModifiedAt: stat.mtime.toISOString(),
  };
}

function verifyBackupManifest(filePath, manifest, options = {}) {
  const now = options.now || new Date();
  const maxAgeHours = options.maxAgeHours ?? 24;
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || maxAgeHours > 24) {
    throw new Error('Backup maximum age must be greater than 0 and no more than 24 hours');
  }
  if (manifest?.version !== MANIFEST_VERSION) throw new Error('Unsupported backup manifest version');
  if (manifest.file !== path.basename(filePath)) throw new Error('Backup artifact filename mismatch');
  const stat = fs.statSync(filePath);
  if (stat.size !== manifest.bytes) throw new Error('Backup artifact size mismatch');
  if (fileSha256(filePath) !== manifest.sha256) throw new Error('Backup artifact checksum mismatch');

  const recordedAt = Date.parse(manifest.recordedAt);
  if (!Number.isFinite(recordedAt)) throw new Error('Invalid backup manifest timestamp');
  const ageHours = (now.getTime() - recordedAt) / 3_600_000;
  const fileAgeHours = (now.getTime() - stat.mtimeMs) / 3_600_000;
  if (ageHours < -(5 / 60)) throw new Error('Backup manifest timestamp is in the future');
  if (fileAgeHours < -(5 / 60)) throw new Error('Backup artifact timestamp is in the future');
  if (ageHours > maxAgeHours) throw new Error(`Backup manifest is older than ${maxAgeHours} hours`);
  if (fileAgeHours > maxAgeHours) throw new Error(`Backup artifact is older than ${maxAgeHours} hours`);
  return {
    valid: true,
    bytes: stat.size,
    ageHours: Math.max(0, ageHours, fileAgeHours),
  };
}

function normalize(value) {
  return String(value || '').trim();
}

function suppressionKey(row) {
  return JSON.stringify([
    normalize(row.mode),
    normalize(row.athleteName),
    normalize(row.affiliation),
    normalize(row.competition),
    normalize(row.event),
  ]);
}

function countKeys(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = suppressionKey(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function compareShadowSuppressions(legacyRows, databaseRows) {
  const legacy = countKeys(legacyRows);
  const database = countKeys(databaseRows);
  let matchedCount = 0;
  let missingInDatabase = 0;
  let unexpectedInDatabase = 0;

  for (const [key, count] of legacy) {
    const matched = Math.min(count, database.get(key) || 0);
    matchedCount += matched;
    missingInDatabase += count - matched;
  }
  for (const [key, count] of database) {
    unexpectedInDatabase += count - Math.min(count, legacy.get(key) || 0);
  }
  return {
    legacyCount: legacyRows.length,
    databaseCount: databaseRows.length,
    matchedCount,
    missingInDatabase,
    unexpectedInDatabase,
    equal: missingInDatabase === 0 && unexpectedInDatabase === 0,
  };
}

function requireSecureBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('HTTPS is required for remote readiness checks');
  }
  return parsed;
}

async function checkReadiness(baseUrl, fetchImpl = global.fetch) {
  const parsed = requireSecureBaseUrl(baseUrl);
  const endpoint = new URL('/health', parsed);
  const response = await fetchImpl(endpoint, {
    headers: { accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
  rejectRedirect(response);
  const body = await response.json();
  const dataRights = body?.services?.dataRights;
  if (!response.ok || body?.status !== 'healthy' || dataRights !== 'ready') {
    throw new Error(`Deployment readiness check failed with HTTP ${response.status}`);
  }
  return { ready: true, status: response.status, dataRights };
}

function rejectRedirect(response) {
  if (response.status >= 300 && response.status < 400) {
    throw new Error('HTTP redirects are not allowed during rollout checks');
  }
  if (response.url) requireSecureBaseUrl(response.url);
}

async function checkRequestRoundTrip(baseUrl, fetchImpl = global.fetch, id = crypto.randomUUID()) {
  const parsed = requireSecureBaseUrl(baseUrl);
  const createResponse = await fetchImpl(new URL('/api/card-studio/data-requests', parsed), {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'correction',
      athleteName: `ROLLOUT-CHECK-${id}`,
      affiliation: 'SYNTHETIC',
      competition: 'SYNTHETIC',
      event: 'SYNTHETIC',
      reason: 'Post-deployment synthetic request-to-lookup smoke',
    }),
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
  rejectRedirect(createResponse);
  const created = await createResponse.json();
  const ticket = created?.data?.ticketId;
  if (createResponse.status !== 201 || !created?.success || typeof ticket !== 'string') {
    throw new Error(`Request smoke creation failed with HTTP ${createResponse.status}`);
  }

  const lookupResponse = await fetchImpl(
    new URL(`/api/card-studio/data-requests/${encodeURIComponent(ticket)}`, parsed),
    {
      headers: { accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    },
  );
  rejectRedirect(lookupResponse);
  const lookup = await lookupResponse.json();
  if (lookupResponse.status !== 200 || !lookup?.success || lookup?.data?.status !== 'received') {
    throw new Error(`Request smoke lookup failed with HTTP ${lookupResponse.status}`);
  }
  return { created: true, lookup: true, createStatus: 201, lookupStatus: 200 };
}

module.exports = {
  checkReadiness,
  checkRequestRoundTrip,
  compareShadowSuppressions,
  createBackupManifest,
  verifyBackupManifest,
};
