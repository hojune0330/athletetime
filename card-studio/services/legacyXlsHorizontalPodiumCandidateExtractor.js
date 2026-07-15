'use strict';

const divisionHierarchyService = require('./divisionHierarchyService');
const { sanitizeReportString } = require('./legacyReportSafety');

function compact(value) {
  return String(value || '').replace(/\s+/gu, ' ').trim();
}

function normalized(value) {
  return compact(value).replace(/\s+/gu, '').toLowerCase();
}

function isNameHeader(value) {
  return /^(성명|이름|선수명|name)$/u.test(normalized(value));
}

function isAffiliationHeader(value) {
  return /^(소속|소속명|시도|시도명|국가|nat|team)$/u.test(normalized(value));
}

function isRecordHeader(value) {
  return /^(기록|기록계|종합기록|rec|record|mark)$/u.test(normalized(value));
}

function parseRank(value, fallback) {
  const text = compact(value);
  const match = text.match(/(\d+)/u);
  return match ? Number(match[1]) : fallback;
}

function formatSeconds(seconds) {
  const rounded = Math.round(seconds * 100) / 100;
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded - minutes * 60;
  const secondText = remaining.toFixed(2).replace(/\.00$/u, '');
  return minutes > 0 ? `${minutes}:${secondText.padStart(5, '0')}` : secondText;
}

function normalizeRecordCell(value) {
  const text = compact(value);
  if (!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/iu.test(text)) return text;
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric <= 0) return text;
  if (numeric >= 1) {
    if (!text.includes('.') || text.split('.')[1].length <= 3) return text;
    return (Math.round(numeric * 1000) / 1000).toFixed(3).replace(/0+$/u, '').replace(/\.$/u, '');
  }
  return formatSeconds(numeric * 86400);
}

function detectRankGroups(rows, headerRowIndex) {
  const header = (rows[headerRowIndex] || []).map(compact);
  const rankRow = (rows[headerRowIndex - 1] || []).map(compact);
  const groups = [];
  for (let column = 0; column < header.length - 2; column += 1) {
    if (isNameHeader(header[column]) && isAffiliationHeader(header[column + 1]) && isRecordHeader(header[column + 2])) {
      groups.push({
        rank: parseRank(rankRow[column], groups.length + 1),
        nameColumn: column,
        affiliationColumn: column + 1,
        recordColumn: column + 2,
      });
    }
  }
  return groups;
}

function looksLikeDivisionLabel(value) {
  const text = compact(value);
  if (!text || /대회|경기대회|육상|기간|종합기록|종합성적|신기록/u.test(text)) return false;
  return /(?:남자|여자|남|여|고등|중학|초등|대학|일반|실업|U\d{2}|마스터즈|부)$/u.test(text);
}

function singleCell(row) {
  const values = (row || []).map(compact).filter(Boolean);
  return values.length === 1 ? values[0] : '';
}

function firstTitle(rows) {
  for (const row of rows.slice(0, 8)) {
    const value = singleCell(row);
    if (value && /대회|경기/u.test(value)) return value;
  }
  return '';
}

function extractHorizontalPodiumCandidates({
  sheet,
  sheetSummary,
  year,
  competitionName,
  source,
}) {
  const rows = sheet.rows || [];
  const candidates = [];
  let currentDivision = looksLikeDivisionLabel(sheet.name) ? compact(sheet.name) : '';
  let rankGroups = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const only = singleCell(row);
    if (looksLikeDivisionLabel(only)) {
      currentDivision = only;
      rankGroups = [];
      continue;
    }

    const nextGroups = detectRankGroups(rows, index);
    if (nextGroups.length >= 2) {
      rankGroups = nextGroups;
      continue;
    }
    if (!rankGroups.length) continue;

    const event = compact(row[sheetSummary.eventColumnHint || 0]);
    if (!event || event === '풍향풍속' || normalized(event) === '종목') continue;
    const division = currentDivision || compact(sheet.name) || '부문 미상';
    const divisionMeta = divisionHierarchyService.normalizeDivision(division);

    for (const group of rankGroups) {
      const name = compact(row[group.nameColumn]);
      const affiliation = compact(row[group.affiliationColumn]);
      const record = normalizeRecordCell(row[group.recordColumn]);
      if (!name || !affiliation || !record) continue;
      candidates.push({
        year: Number(year),
        competitionName: sanitizeReportString(competitionName || firstTitle(rows) || '대회명 미상'),
        division: sanitizeReportString(division),
        divisionMeta,
        event: sanitizeReportString(`${division} ${event}`),
        rank: group.rank,
        name: sanitizeReportString(name),
        affiliation: sanitizeReportString(affiliation),
        record: sanitizeReportString(record),
        note: '',
        newRecord: '',
        source,
      });
    }
  }

  return candidates;
}

module.exports = {
  extractHorizontalPodiumCandidates,
  firstTitle,
  looksLikeDivisionLabel,
};
