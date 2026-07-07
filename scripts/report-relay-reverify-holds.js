#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'data', 'results');
const LIFE_SPORT_COMPETITION_PATTERNS = [/생활체육/i, /마스터즈/i, /대축전/i, /recordsport/i];
const HOLD_STATUS = 'source_reverify_needed';

function isYearResultFile(filename) {
  return /^\d{4}\.json$/.test(filename);
}

function isPublicCompetition(competition) {
  const name = String(competition.competitionName || '');
  return !LIFE_SPORT_COMPETITION_PATTERNS.some((pattern) => pattern.test(name));
}

function isHeldEvent(event) {
  return Boolean(event && (event.qualityHold === true || event.resultsStatus === HOLD_STATUS));
}

function heldEventToReport(event) {
  return {
    event: event.event || event.eventName || '',
    tableType: event.tableType || '',
    resultsStatus: event.resultsStatus || '',
    qualityHold: event.qualityHold === true,
    qualityMessage: event.qualityMessage || '',
    heldResultCount: Number(event.heldResultCount || 0),
  };
}

function competitionToReport(filename, competition) {
  const heldEvents = (competition.events || []).filter(isHeldEvent).map(heldEventToReport);
  if (heldEvents.length === 0) return null;

  return {
    filename,
    year: Number(competition.year || filename.replace('.json', '')),
    competitionId: competition.competitionId || '',
    competitionName: competition.competitionName || '',
    heldEvents,
  };
}

function buildReport() {
  const files = fs.readdirSync(RESULTS_DIR).filter(isYearResultFile).sort();
  const items = [];

  for (const filename of files) {
    const competitions = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, filename), 'utf8'));
    for (const competition of competitions) {
      if (!isPublicCompetition(competition)) continue;
      const item = competitionToReport(filename, competition);
      if (item) items.push(item);
    }
  }

  const summary = items.reduce(
    (acc, item) => {
      const heldRows = item.heldEvents.reduce((sum, event) => sum + event.heldResultCount, 0);
      return {
        publicHeldCompetitions: acc.publicHeldCompetitions + 1,
        publicHeldEvents: acc.publicHeldEvents + item.heldEvents.length,
        publicHeldRows: acc.publicHeldRows + heldRows,
      };
    },
    { publicHeldCompetitions: 0, publicHeldEvents: 0, publicHeldRows: 0 },
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    blocked: {
      reason: 'source_files_or_dom_fixtures_required',
      required: [
        'original_result_file_or_html_per_competition',
        'relay_table_dom_fixture_with_rowspan_colspan',
        'fable_review_before_restoring_rows',
      ],
      note: 'Held rows are intentionally not reconstructed from polluted name/affiliation/record fields.',
    },
    items,
  };
}

function printMarkdown(report) {
  console.log('# Relay Source Recheck Holds');
  console.log('');
  console.log(`- Public held competitions: ${report.summary.publicHeldCompetitions}`);
  console.log(`- Public held event slices: ${report.summary.publicHeldEvents}`);
  console.log(`- Public held rows: ${report.summary.publicHeldRows}`);
  console.log(`- Blocked reason: ${report.blocked.reason}`);
  console.log('');
  console.log('| Year | Competition | Event slices | Held rows |');
  console.log('|---|---|---:|---:|');
  for (const item of report.items) {
    const heldRows = item.heldEvents.reduce((sum, event) => sum + event.heldResultCount, 0);
    console.log(`| ${item.year} | ${item.competitionName} (${item.competitionId}) | ${item.heldEvents.length} | ${heldRows} |`);
  }
}

function main() {
  const report = buildReport();
  if (process.argv.includes('--markdown')) {
    printMarkdown(report);
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
