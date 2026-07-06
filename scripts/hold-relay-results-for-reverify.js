#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const {
  hasRelayResultTextPollution,
  isRelayCompetitionText,
  toRelayQualityHoldEvent,
} = require('../card-studio/services/relayResultQualityService');

const ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'data', 'results');
const LIFE_SPORT_COMPETITION_PATTERNS = [/생활체육/i, /마스터즈/i, /대축전/i, /recordsport/i];

function isYearResultFile(filename) {
  return /^\d{4}\.json$/.test(filename);
}

function shouldHoldEvent(event, competitionName) {
  if (LIFE_SPORT_COMPETITION_PATTERNS.some((pattern) => pattern.test(String(competitionName || '')))) {
    return false;
  }
  if (!isRelayCompetitionText(competitionName, event.event)) return false;
  const results = event.results || [];
  if (event.resultsStatus === 'source_reverify_needed') return true;
  return results.some(hasRelayResultTextPollution);
}

function holdRelayEventsInCompetition(competition) {
  let heldEvents = 0;
  let heldRows = 0;
  const events = (competition.events || []).map((event) => {
    if (!shouldHoldEvent(event, competition.competitionName)) return event;
    heldEvents += 1;
    heldRows += Array.isArray(event.results) ? event.results.length : 0;
    return toRelayQualityHoldEvent(event);
  });

  return {
    competition: { ...competition, events },
    heldEvents,
    heldRows,
  };
}

function holdRelayEventsInFile(filename, writeChanges) {
  const filePath = path.join(RESULTS_DIR, filename);
  const original = fs.readFileSync(filePath, 'utf8');
  const competitions = JSON.parse(original);
  let heldEvents = 0;
  let heldRows = 0;

  const nextCompetitions = competitions.map((competition) => {
    const result = holdRelayEventsInCompetition(competition);
    heldEvents += result.heldEvents;
    heldRows += result.heldRows;
    return result.competition;
  });

  const next = `${JSON.stringify(nextCompetitions, null, 2)}\n`;
  if (writeChanges && next !== original) {
    fs.writeFileSync(filePath, next);
  }

  return { filename, changed: next !== original, heldEvents, heldRows };
}

function main() {
  const writeChanges = process.argv.includes('--write');
  const files = fs.readdirSync(RESULTS_DIR).filter(isYearResultFile).sort();
  const results = files.map((filename) => holdRelayEventsInFile(filename, writeChanges));
  const summary = results.reduce(
    (acc, item) => ({
      changedFiles: acc.changedFiles + (item.changed ? 1 : 0),
      heldEvents: acc.heldEvents + item.heldEvents,
      heldRows: acc.heldRows + item.heldRows,
    }),
    { changedFiles: 0, heldEvents: 0, heldRows: 0 },
  );

  console.log(JSON.stringify({ write: writeChanges, summary, files: results }, null, 2));
}

main();
