'use strict';

const COMPETITIONS = Object.freeze([
  {
    aliases: [
      '\uC77C\uBCF8 \uB514\uC2A4\uD134\uC2A4 \uCC4C\uB9B0\uC9C0',
      'Japan Distance Challenge',
      'JAAF Distance Challenge',
    ],
    label: '\uC77C\uBCF8 \uB514\uC2A4\uD134\uC2A4 \uCC4C\uB9B0\uC9C0',
    queries: [
      'World Athletics Japan Distance Challenge results',
      'World Athletics HOKUREN Distance Challenge results',
      'JAAF Distance Challenge results',
      'HOKUREN Distance Challenge results',
      'Japan Distance Challenge athletics results',
    ],
  },
  {
    aliases: [
      '\uC624\uC0AC\uCE74 \uC624\uD508',
      '\uC624\uC0AC\uCE74\uC624\uD508',
      'Osaka Open',
      'Osaka Open Athletics',
    ],
    label: '\uC624\uC0AC\uCE74 \uC624\uD508 \uC721\uC0C1\uACBD\uAE30\uB300\uD68C',
    queries: [
      'JAAF Osaka Open athletics results',
      'World Athletics Osaka Open results',
      'Osaka Open Athletics results',
      'World Athletics EDION Distance Challenge in Osaka results',
      'EDION Distance Challenge in Osaka results',
      '\u5927\u962A\u30AA\u30FC\u30D7\u30F3 \u9678\u4E0A \u7D50\u679C',
    ],
  },
  {
    aliases: [
      '\uB300\uB9CC\uC624\uD508',
      '\uB300\uB9CC \uC624\uD508',
      '\uB300\uB9CC\uC624\uD508 \uC721\uC0C1\uC120\uC218\uAD8C\uB300\uD68C',
      'Taiwan Open',
      'Chinese Taipei Athletics Open',
    ],
    label: '\uB300\uB9CC\uC624\uD508 \uC721\uC0C1\uC120\uC218\uAD8C\uB300\uD68C',
    queries: [
      'Taiwan Open Athletics results',
      'Chinese Taipei Athletics Open results',
      'World Athletics Taiwan Open results',
    ],
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findCompetition(line) {
  return COMPETITIONS.find((competition) => competition.aliases.some((alias) => {
    const compactLine = String(line).replace(/\s+/g, '');
    const compactAlias = String(alias).replace(/\s+/g, '');
    const pattern = new RegExp(escapeRegExp(compactAlias), 'i');
    return pattern.test(compactLine);
  })) || null;
}

function dateFromLine(line) {
  const match = String(line).match(/\b((?:19|20)\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function eventFromLine(line) {
  const match = String(line).match(/\b(\d{2,5}m|marathon|half marathon|10km|5km|\uB9C8\uB77C\uD1A4|\uD558\uD504\uB9C8\uB77C\uD1A4)\b/i);
  return match ? match[1] : null;
}

function recordFromLine(line) {
  const withoutDate = String(line).replace(/\b(?:19|20)\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}\b/, ' ');
  const match = withoutDate.match(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b|\b\d{1,2}\.\d{2}\b/);
  return match ? match[0] : null;
}

function rankFromLine(line) {
  const match = String(line).match(/(?:^|\s)(\d{1,3})\s*(?:\uC704|place|st|nd|rd|th)(?:\s|$)/i);
  return match ? Number(match[1]) : null;
}

function hintForLine(line, options) {
  const competition = findCompetition(line);
  if (!competition) return null;
  return {
    sourceTier: 'athlete_history_discovery_hint',
    evidenceBasis: options.consentBasis || 'operator_manual_review',
    competitionName: competition.label,
    date: dateFromLine(line),
    event: eventFromLine(line),
    record: recordFromLine(line),
    rank: rankFromLine(line),
    confirmationStatus: 'needs_external_confirmation',
    allowedNextStep: 'confirm_against_external_official_result',
    searchQueries: competition.queries,
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
    updateMode: 'operator_managed_watchlist_only',
    rankingPolicy: 'rankings_are_manually_updated_by_owner_or_operator',
    hints,
  };
}

module.exports = {
  extractHistoryEvidenceHints,
};
