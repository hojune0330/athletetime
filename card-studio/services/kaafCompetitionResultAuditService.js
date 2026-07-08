'use strict';

const https = require('https');
const { URL } = require('url');
const { isBlockedCollectionHost } = require('../../lib/crawlPolicy');
const harvester = require('./kaafScheduleResultHarvesterService');

const KAAF_YEAR_PAGE = 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=';

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code) => {
      const base = code.toLowerCase().startsWith('x') ? 16 : 10;
      const numeric = Number.parseInt(code.replace(/^x/i, ''), base);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : '';
    });
}

function textFromHtml(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRows(html) {
  return [...String(html || '').matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
}

function extractCells(rowHtml) {
  return [...String(rowHtml || '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function extractHref(html) {
  const match = String(html || '').match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  return match ? decodeEntities(match[2]) : null;
}

function detailUrlFromCell(cellHtml, sourceUrl) {
  const href = extractHref(cellHtml);
  if (!href) return null;
  try {
    return new URL(href, sourceUrl).toString();
  } catch (_) {
    return null;
  }
}

function includesQuery(rowText, query) {
  const terms = String(query || '')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return false;
  return terms.every((term) => rowText.includes(term));
}

function rowToMatch(rowHtml, options) {
  const cells = extractCells(rowHtml);
  if (cells.length < 5) return null;

  const rowText = textFromHtml(rowHtml);
  if (!includesQuery(rowText, options.query)) return null;

  const competitionName = textFromHtml(cells[1]);
  const result = harvester.extractScheduleResultFiles(rowHtml, {
    sourceUrl: options.sourceUrl,
    year: options.year,
  });

  const common = {
    competitionName,
    competitionPeriod: textFromHtml(cells[2]),
    venue: textFromHtml(cells[3]),
    detailUrl: detailUrlFromCell(cells[1], options.sourceUrl),
  };

  return {
    ...common,
    candidates: result.candidates.map((candidate) => ({
      ...candidate,
      ...common,
      title: `${competitionName} — ${candidate.originalFilename}`,
      notes: `${candidate.notes || ''} 대회명 기반 누락 감사에서 행 문맥으로 확인했습니다.`.trim(),
    })),
  };
}

function auditCompetitionResultRows(html, options = {}) {
  const matches = extractRows(html)
    .map((rowHtml) => rowToMatch(rowHtml, options))
    .filter(Boolean);
  const candidates = matches.flatMap((match) => match.candidates);
  const missingResultRows = matches
    .filter((match) => match.candidates.length === 0)
    .map(({ candidates: _candidates, ...match }) => ({
      ...match,
      reason: 'no_result_file_attachment',
    }));

  return {
    query: String(options.query || ''),
    sourceUrl: options.sourceUrl || null,
    year: options.year || null,
    matches,
    candidates,
    missingResultRows,
  };
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

    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(Object.assign(new Error(`Fetch failed with HTTP ${res.statusCode}`), {
          code: 'KAAF_COMPETITION_AUDIT_HTTP_ERROR',
          statusCode: res.statusCode,
        }));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('Fetch timed out'), {
      code: 'KAAF_COMPETITION_AUDIT_TIMEOUT',
    })));
    req.on('error', reject);
  });
}

async function auditCompetitionResults(options = {}) {
  const fromYear = Number(options.fromYear);
  const toYear = Number(options.toYear);
  const pages = options.pageUrls || harvester.buildYearPageUrls({ fromYear, toYear });
  const fetcher = options.fetchText || fetchText;
  const pageResults = [];

  for (const sourceUrl of pages) {
    const year = Number(new URL(sourceUrl).searchParams.get('currentYear')) || null;
    const html = await fetcher(sourceUrl, options.timeoutMs || 30000);
    pageResults.push(auditCompetitionResultRows(html, {
      query: options.query,
      sourceUrl,
      year,
    }));
  }

  return {
    query: String(options.query || ''),
    fromYear,
    toYear,
    pages: pageResults,
    candidates: pageResults.flatMap((page) => page.candidates),
    missingResultRows: pageResults.flatMap((page) => page.missingResultRows),
  };
}

module.exports = {
  KAAF_YEAR_PAGE,
  auditCompetitionResultRows,
  auditCompetitionResults,
  textFromHtml,
};
