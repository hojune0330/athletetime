'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');
const config = require('../config');
const { isBlockedCollectionHost } = require('../../lib/crawlPolicy');

const DEFAULT_STORAGE_ROOT = path.join(config.dirs.data, 'sources', 'import', 'originals');
const DEFAULT_REPORT_DIR = path.join(config.dirs.root, '.ultra', 'docs', 'research');
const KAAF_YEAR_PAGE = 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=';
const RESULT_SLOT = '/FILEs_4/';
const SCHEDULE_ROOT = '/DATA/schedule/';
const FILE_EXTENSIONS = new Set(['.pdf', '.xls', '.xlsx', '.hwp', '.hwpx']);
const LIFE_SPORT_PATTERNS = [/생활체육/i, /대축전/i, /recordsport/i];

function buildYearPageUrls({ fromYear, toYear }) {
  const start = Number(fromYear);
  const end = Number(toYear);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
    throw Object.assign(new Error('Invalid year range'), { code: 'KAAF_HARVEST_INVALID_YEAR_RANGE' });
  }
  const urls = [];
  for (let year = start; year <= end; year += 1) {
    urls.push(`${KAAF_YEAR_PAGE}${year}`);
  }
  return urls;
}

function requestClient(url) {
  return url.protocol === 'https:' ? https : http;
}

function isLifeSportsValue(value) {
  return LIFE_SPORT_PATTERNS.some((pattern) => pattern.test(String(value || '')));
}

function normalizeDownloadUrl(rawHref, sourceUrl) {
  const trimmed = String(rawHref || '').trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^mailto:/i.test(trimmed)) return null;
  try {
    const normalized = new URL(trimmed.replace('https://www.kaaf.or.kr//DATA/', 'https://www.kaaf.or.kr/DATA/'), sourceUrl);
    normalized.hash = '';
    return normalized;
  } catch (_) {
    return null;
  }
}

function filenameFromUrl(url) {
  const pathname = url.pathname || '';
  const rawName = pathname.slice(pathname.lastIndexOf('/') + 1) || 'kaaf-result-file.bin';
  try {
    return decodeURIComponent(rawName);
  } catch (_) {
    return rawName;
  }
}

function extensionOf(filename) {
  return path.extname(String(filename || '')).toLowerCase();
}

function safeFilename(filename) {
  return path.basename(String(filename || 'kaaf-result-file.bin')).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') || 'kaaf-result-file.bin';
}

function yearFromUrl(url, fallbackYear) {
  const match = url.pathname.match(/\/DATA\/schedule\/(\d{4})\//i);
  return match ? Number(match[1]) : fallbackYear || null;
}

function extractHrefValues(html) {
  const values = [];
  const pattern = /\bhref\s*=\s*(["'])(.*?)\1/gi;
  let match = pattern.exec(String(html || ''));
  while (match) {
    values.push(match[2]);
    match = pattern.exec(String(html || ''));
  }
  return values;
}

function exclusion(reason, rawHref, details = {}) {
  return { reason, rawHref, ...details };
}

function classifyScheduleResultHref(rawHref, options = {}) {
  const sourceUrl = options.sourceUrl || KAAF_YEAR_PAGE;
  const url = normalizeDownloadUrl(rawHref, sourceUrl);
  if (!url) return { excluded: exclusion('invalid_or_script_link', rawHref) };

  const filename = filenameFromUrl(url);
  const hrefForPolicy = `${url.hostname}${url.pathname}${decodeURIComponent(url.search || '')} ${filename}`;

  if (isLifeSportsValue(rawHref) || isLifeSportsValue(filename) || isLifeSportsValue(hrefForPolicy)) {
    return { excluded: exclusion('life_sports_excluded', rawHref, { filename }) };
  }

  if (isBlockedCollectionHost(url.toString())) {
    return { excluded: exclusion('blocked_host', rawHref, { host: url.hostname }) };
  }

  if (!url.pathname.includes(SCHEDULE_ROOT) || !url.pathname.includes(RESULT_SLOT)) {
    return { excluded: exclusion('not_result_file_slot', rawHref, { filename }) };
  }

  if (!FILE_EXTENSIONS.has(extensionOf(filename))) {
    return { excluded: exclusion('unsupported_extension', rawHref, { filename }) };
  }

  return {
    candidate: {
      provider: '대한육상연맹',
      sourceClass: 'kaaf_schedule_result_attachment',
      sourceType: 'kaaf_schedule_result_attachment',
      collectionAction: 'download_file',
      title: filename,
      sourceUrl,
      downloadUrl: url.toString(),
      originalFilename: filename,
      year: yearFromUrl(url, options.year),
      licenseType: 'unknown_kaaf_public_schedule_attachment',
      reviewStatus: 'approved',
      extractionMethod: 'kaaf_internal_file_slot_4',
      robotsPosture: 'kaaf_public_schedule_attachment',
      notes: 'KAAF 국내경기 연간 페이지의 FILEs_4 결과파일 링크에서 수집한 원본 첨부입니다.',
    },
  };
}

function extractScheduleResultFiles(html, options = {}) {
  const candidates = [];
  const excluded = [];
  const seen = new Set();

  for (const rawHref of extractHrefValues(html)) {
    const result = classifyScheduleResultHref(rawHref, options);
    if (result.excluded) {
      excluded.push(result.excluded);
      continue;
    }

    const key = result.candidate.downloadUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(result.candidate);
  }

  return { candidates, excluded };
}

function fetchBuffer(rawUrl, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(rawUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw Object.assign(new Error('Download URL must use http or https'), { code: 'INVALID_COLLECTION_URL' });
      }
      if (isBlockedCollectionHost(url.toString())) {
        throw Object.assign(new Error('Blocked collection host'), { code: 'SOURCE_DOWNLOAD_BLOCKED' });
      }
    } catch (error) {
      reject(Object.assign(error, { code: error.code || 'INVALID_COLLECTION_URL' }));
      return;
    }

    const req = requestClient(url).get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(Object.assign(new Error(`Download failed with HTTP ${res.statusCode}`), {
          code: 'KAAF_HARVEST_HTTP_ERROR',
          statusCode: res.statusCode,
        }));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        body: Buffer.concat(chunks),
        mimeType: String(res.headers['content-type'] || '').split(';')[0] || null,
      }));
    });

    req.on('timeout', () => req.destroy(Object.assign(new Error('Download timed out'), {
      code: 'KAAF_HARVEST_TIMEOUT',
    })));
    req.on('error', reject);
  });
}

function fileStoragePath(storageRoot, batchName, index, filename) {
  const root = path.resolve(storageRoot);
  const batchDir = path.resolve(root, batchName);
  if (!batchDir.startsWith(`${root}${path.sep}`)) {
    throw Object.assign(new Error('Batch directory escaped storage root'), { code: 'KAAF_HARVEST_PATH_ESCAPE' });
  }
  const padded = String(index + 1).padStart(3, '0');
  const target = path.resolve(batchDir, `${padded}_${safeFilename(filename)}`);
  if (!target.startsWith(`${batchDir}${path.sep}`)) {
    throw Object.assign(new Error('File path escaped batch directory'), { code: 'KAAF_HARVEST_PATH_ESCAPE' });
  }
  return target;
}

function relativePrivatePath(filePath) {
  return path.relative(config.dirs.root, filePath).replace(/\\/g, '/');
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function writeReport(file, run) {
  const byExtension = run.files.reduce((counts, fileInfo) => {
    const ext = extensionOf(fileInfo.originalFilename) || '(none)';
    counts[ext] = (counts[ext] || 0) + 1;
    return counts;
  }, {});

  const lines = [
    `# KAAF 경기결과 원본 파일 수집 보고서 (${run.batchName})`,
    '',
    `- 실행시각: ${run.collectedAt}`,
    `- 후보: ${run.totalCandidates}`,
    `- 다운로드 성공: ${run.downloaded}`,
    `- 실패: ${run.failed}`,
    `- 제외: ${run.excludedCount}`,
    `- 저장 위치: ${run.storageRoot}`,
    '',
    '## 확장자',
    '',
    ...Object.entries(byExtension).map(([ext, count]) => `- ${ext}: ${count}`),
    '',
    '## 수집 원칙',
    '',
    '- 대한육상연맹 국내경기 연간 페이지의 `FILEs_4` 결과파일 링크만 수집했습니다.',
    '- 생활체육/recordsport 경로와 result.kaaf.or.kr 차단 표면은 제외했습니다.',
    '- 원본 파일 본문은 Git에 추적하지 않고, manifest에는 출처/파일명/hash/크기만 남겼습니다.',
  ];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
}

async function downloadScheduleResultFiles(candidates, options = {}) {
  const batchName = options.batchName || `kaaf-schedule-results-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const storageRoot = path.resolve(options.storageRoot || DEFAULT_STORAGE_ROOT);
  const reportDir = path.resolve(options.reportDir || DEFAULT_REPORT_DIR);
  const collectedAt = options.now || new Date().toISOString();
  const files = [];
  const errors = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const target = fileStoragePath(storageRoot, batchName, index, candidate.originalFilename);
    try {
      const { body, mimeType } = await fetchBuffer(candidate.downloadUrl, options.timeoutMs || 30000);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
      const sha256 = crypto.createHash('sha256').update(body).digest('hex');
      files.push({
        ...candidate,
        fileSize: body.length,
        mimeType,
        sha256,
        filePath: target,
        privateStoragePath: relativePrivatePath(target),
        downloadedAt: collectedAt,
      });
    } catch (error) {
      errors.push({
        downloadUrl: candidate.downloadUrl,
        originalFilename: candidate.originalFilename,
        code: error.code || 'KAAF_HARVEST_DOWNLOAD_FAILED',
        message: error.message,
      });
    }
  }

  const run = {
    ok: errors.length === 0,
    batchName,
    collectedAt,
    storageRoot,
    totalCandidates: candidates.length,
    downloaded: files.length,
    failed: errors.length,
    excludedCount: options.excludedCount || 0,
    files,
    errors,
  };
  const manifestPath = path.join(reportDir, `${batchName}-manifest.json`);
  const reportPath = path.join(reportDir, `${batchName}-report.md`);
  writeJson(manifestPath, run);
  writeReport(reportPath, run);
  return { ...run, manifestPath, reportPath };
}

function fetchText(rawUrl, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(rawUrl);
      if (isBlockedCollectionHost(url.toString())) {
        throw Object.assign(new Error('Blocked collection host'), { code: 'SOURCE_DOWNLOAD_BLOCKED' });
      }
    } catch (error) {
      reject(Object.assign(error, { code: error.code || 'INVALID_COLLECTION_URL' }));
      return;
    }

    const req = requestClient(url).get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(Object.assign(new Error(`Fetch failed with HTTP ${res.statusCode}`), {
          code: 'KAAF_HARVEST_PAGE_HTTP_ERROR',
          statusCode: res.statusCode,
        }));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('Fetch timed out'), { code: 'KAAF_HARVEST_TIMEOUT' })));
    req.on('error', reject);
  });
}

async function harvestYearPages(options = {}) {
  const pages = options.pageUrls || buildYearPageUrls(options);
  const candidates = [];
  const excluded = [];
  const pageResults = [];

  for (const sourceUrl of pages) {
    const html = await fetchText(sourceUrl, options.timeoutMs || 30000);
    const year = Number(new URL(sourceUrl).searchParams.get('currentYear')) || null;
    const extracted = extractScheduleResultFiles(html, { sourceUrl, year });
    candidates.push(...extracted.candidates);
    excluded.push(...extracted.excluded);
    pageResults.push({
      sourceUrl,
      year,
      candidates: extracted.candidates.length,
      excluded: extracted.excluded.length,
    });
  }

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.downloadUrl)) continue;
    seen.add(candidate.downloadUrl);
    unique.push(candidate);
  }

  return { candidates: unique, excluded, pages: pageResults };
}

module.exports = {
  DEFAULT_REPORT_DIR,
  DEFAULT_STORAGE_ROOT,
  buildYearPageUrls,
  downloadScheduleResultFiles,
  extractScheduleResultFiles,
  harvestYearPages,
};
