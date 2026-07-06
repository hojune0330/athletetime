'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');
const config = require('../config');
const { isBlockedCollectionHost } = require('../../lib/crawlPolicy');
const sourceLedger = require('./sourceLedgerService');

const DEFAULT_STORAGE_ROOT = path.join(config.dirs.data, 'sources', 'import', 'originals');
const MAX_REDIRECTS = 3;

function notDownloadable(source) {
  if (!source) return 'SOURCE_NOT_FOUND';
  if (source.collectionAction !== 'download_file') return 'SOURCE_NOT_DOWNLOADABLE';
  if (source.reviewStatus === 'blocked' || source.robotsPosture === 'disallow_all') return 'SOURCE_DOWNLOAD_BLOCKED';
  if (source.reviewStatus !== 'approved') return 'SOURCE_DOWNLOAD_NOT_APPROVED';
  if (!source.downloadUrl) return 'SOURCE_DOWNLOAD_URL_MISSING';
  try {
    if (isBlockedCollectionHost(source.downloadUrl)) return 'SOURCE_DOWNLOAD_BLOCKED';
  } catch (error) {
    return error.code || 'INVALID_COLLECTION_URL';
  }
  return null;
}

function safeFilename(filename) {
  const base = path.basename(String(filename || 'source-file.bin'));
  return base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') || 'source-file.bin';
}

function assertSafeSourceId(sourceId) {
  if (!/^SRC-\d{8}-\d{4}$/.test(String(sourceId || ''))) {
    throw Object.assign(new Error('Source ID is not a safe ledger storage segment'), {
      code: 'SOURCE_DOWNLOAD_PATH_ESCAPE',
    });
  }
}

function requestClient(url) {
  return url.protocol === 'https:' ? https : http;
}

function assertRedirectAllowed(rawUrl) {
  if (isBlockedCollectionHost(rawUrl)) {
    throw Object.assign(new Error('Redirect target is blocked by collection policy'), {
      code: 'SOURCE_DOWNLOAD_BLOCKED',
    });
  }
}

function fetchToFile(rawUrl, targetPath, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(rawUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw Object.assign(new Error('Download URL must use http or https'), { code: 'INVALID_COLLECTION_URL' });
      }
    } catch (error) {
      reject(Object.assign(error, { code: error.code || 'INVALID_COLLECTION_URL' }));
      return;
    }

    const req = requestClient(url).get(url, { timeout: 30000 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        let nextUrl;
        try {
          nextUrl = new URL(res.headers.location, url).toString();
          assertRedirectAllowed(nextUrl);
        } catch (error) {
          reject(Object.assign(error, { code: error.code || 'INVALID_COLLECTION_URL' }));
          return;
        }
        fetchToFile(nextUrl, targetPath, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(Object.assign(new Error(`Download failed with HTTP ${res.statusCode}`), { code: 'SOURCE_DOWNLOAD_HTTP_ERROR', statusCode: res.statusCode }));
        return;
      }

      const hash = crypto.createHash('sha256');
      let bytes = 0;
      const out = fs.createWriteStream(targetPath);
      res.on('data', (chunk) => {
        bytes += chunk.length;
        hash.update(chunk);
      });
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => resolve({
          bytes,
          mimeType: String(res.headers['content-type'] || '').split(';')[0] || null,
          sha256: hash.digest('hex'),
        }));
      });
      out.on('error', reject);
    });

    req.on('timeout', () => req.destroy(Object.assign(new Error('Download timed out'), { code: 'SOURCE_DOWNLOAD_TIMEOUT' })));
    req.on('error', reject);
  });
}

function storagePaths(storageRoot, sourceId, originalFilename) {
  assertSafeSourceId(sourceId);
  const root = path.resolve(storageRoot);
  const sourceDir = path.resolve(root, sourceId);
  if (!sourceDir.startsWith(`${root}${path.sep}`)) {
    throw Object.assign(new Error('Resolved source directory escaped storage root'), {
      code: 'SOURCE_DOWNLOAD_PATH_ESCAPE',
    });
  }
  const filePath = path.resolve(sourceDir, safeFilename(originalFilename));
  if (!filePath.startsWith(`${sourceDir}${path.sep}`)) {
    throw Object.assign(new Error('Resolved source file path escaped source directory'), {
      code: 'SOURCE_DOWNLOAD_PATH_ESCAPE',
    });
  }
  return { sourceDir, filePath, tempPath: `${filePath}.tmp` };
}

async function downloadSource(sourceId, options = {}) {
  const source = sourceLedger.readSource(sourceId, options);
  const blockCode = notDownloadable(source);
  if (blockCode) return { ok: false, error: { code: blockCode, sourceId } };

  const storageRoot = options.storageRoot || DEFAULT_STORAGE_ROOT;
  let tempPath = null;

  try {
    const { sourceDir, filePath, tempPath: nextTempPath } = storagePaths(storageRoot, source.sourceId, source.originalFilename);
    tempPath = nextTempPath;
    fs.mkdirSync(sourceDir, { recursive: true });
    const result = await fetchToFile(source.downloadUrl, tempPath);
    fs.renameSync(tempPath, filePath);
    const privateStoragePath = path.relative(config.dirs.root, filePath).replace(/\\/g, '/');
    const updated = sourceLedger.updateSource(source.sourceId, {
      downloadStatus: 'downloaded',
      downloadedAt: options.now || new Date().toISOString(),
      privateStoragePath,
      sha256: result.sha256,
      fileSize: result.bytes,
      mimeType: result.mimeType,
      downloadError: null,
    }, options);
    return { ok: true, filePath, privateStoragePath, ...result, source: updated.source };
  } catch (error) {
    if (tempPath && fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
    sourceLedger.updateSource(source.sourceId, {
      downloadStatus: 'failed',
      downloadError: error.code || 'SOURCE_DOWNLOAD_FAILED',
    }, options);
    return { ok: false, error: { code: error.code || 'SOURCE_DOWNLOAD_FAILED', message: error.message } };
  }
}

module.exports = {
  DEFAULT_STORAGE_ROOT,
  downloadSource,
  safeFilename,
};
