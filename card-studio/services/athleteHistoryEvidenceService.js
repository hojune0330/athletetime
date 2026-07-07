'use strict';

const OVERSEAS_PATTERNS = Object.freeze([
  {
    pattern: /일본\s*디스턴스\s*챌린지/i,
    label: '일본 디스턴스 챌린지',
    queries: ['World Athletics 일본 디스턴스 챌린지 results', 'JAAF Distance Challenge results'],
  },
  {
    pattern: /오사카\s*오픈/i,
    label: '오사카 오픈 육상경기대회',
    queries: ['JAAF Osaka Open athletics results', 'World Athletics Osaka Open results'],
  },
  {
    pattern: /대만\s*오픈/i,
    label: '대만오픈 육상선수권대회',
    queries: ['Taiwan Open Athletics results', 'Chinese Taipei Athletics Open results'],
  },
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function splitLines(text) {
  return normalizeText(text).split('\n').map((line) => line.trim()).filter(Boolean);
}

function dateFromLine(line) {
  const match = String(line).match(/\b((?:19|20)\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function eventFromLine(line) {
  const match = String(line).match(/\b(\d{2,5}m|마라톤|하프마라톤|10km|5km)\b/i);
  return match ? match[1] : null;
}

function recordFromLine(line) {
  const withoutDate = String(line).replace(/\b(?:19|20)\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}\b/, ' ');
  const match = withoutDate.match(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b|\b\d{1,2}\.\d{2}\b/);
  return match ? match[0] : null;
}

function rankFromLine(line) {
  const match = String(line).match(/(?:^|\s)(\d{1,3})\s*위(?:\s|$)/);
  return match ? Number(match[1]) : null;
}

function hintForLine(line, options) {
  const source = OVERSEAS_PATTERNS.find((item) => item.pattern.test(line));
  if (!source) return null;
  return {
    sourceTier: 'athlete_history_discovery_hint',
    evidenceBasis: options.consentBasis || 'operator_manual_review',
    competitionName: source.label,
    date: dateFromLine(line),
    event: eventFromLine(line),
    record: recordFromLine(line),
    rank: rankFromLine(line),
    confirmationStatus: 'needs_external_confirmation',
    allowedNextStep: 'confirm_against_external_official_result',
    searchQueries: source.queries,
  };
}

function extractHistoryEvidenceHints(rawText, options = {}) {
  const hints = splitLines(rawText)
    .map((line) => hintForLine(line, options))
    .filter(Boolean);
  return {
    generatedAt: options.now || new Date().toISOString(),
    inputHandling: 'manual_text_review_sanitized',
    storagePolicy: 'restricted_identity_fields_and_raw_history_are_not_stored',
    hints,
  };
}

module.exports = {
  extractHistoryEvidenceHints,
};
