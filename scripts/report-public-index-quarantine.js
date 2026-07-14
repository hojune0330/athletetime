#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const recordAnalyticsService = require('../card-studio/services/recordAnalyticsService');
const currentSearchService = require('../card-studio/services/searchService');
const compatibilitySearchService = require('../src/services/searchService');
const insightService = require('../card-studio/services/insightService');
const {
  assessPublicIndexEvent,
  assessPublicIndexRow,
  isRelayEvent,
} = require('../card-studio/services/publicIndexQualityService');

const ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'data', 'results');
const SAMPLE_LIMIT = 24;

function scanQuarantine() {
  const eventSamples = [];
  const rowCandidates = [];
  const reasons = {};
  let quarantinedEventCount = 0;
  let quarantinedRowCount = 0;

  const filenames = fs.readdirSync(RESULTS_DIR)
    .filter((filename) => /^\d{4}\.json$/.test(filename))
    .sort();

  for (const filename of filenames) {
    const competitions = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, filename), 'utf8'));
    for (const competition of competitions) {
      const competitionName = String(competition.competitionName || competition.meta?.competition_name || '');
      for (const event of competition.events || []) {
        const eventLabel = String(event.event || '');
        const eventAssessment = assessPublicIndexEvent(eventLabel);
        if (!eventAssessment.indexable) {
          quarantinedEventCount += 1;
          if (eventSamples.length < SAMPLE_LIMIT) {
            eventSamples.push({ filename, competition: competitionName, event: eventLabel, reason: eventAssessment.reason });
          }
        }

        for (const row of event.results || []) {
          const rowAssessment = assessPublicIndexRow({ eventLabel, row });
          if (rowAssessment.indexable) continue;
          quarantinedRowCount += 1;
          reasons[rowAssessment.reason] = (reasons[rowAssessment.reason] || 0) + 1;
          rowCandidates.push({
            filename,
            competition: competitionName,
            event: eventLabel,
            name: String(row.name || ''),
            affiliation: String(row.affiliation || ''),
            reason: rowAssessment.reason,
          });
        }
      }
    }
  }

  const sortedRowCandidates = rowCandidates.sort((a, b) => (
      Number(!/\s/.test(a.name)) - Number(!/\s/.test(b.name))
      || a.filename.localeCompare(b.filename)
      || a.competition.localeCompare(b.competition)
      || a.event.localeCompare(b.event)
      || a.name.localeCompare(b.name)
  ));
  const reasonSamples = [...new Map(sortedRowCandidates.map((sample) => [sample.reason, sample])).values()];
  const rowSamples = [...reasonSamples, ...sortedRowCandidates]
    .filter((sample, index, samples) => samples.indexOf(sample) === index)
    .slice(0, SAMPLE_LIMIT);

  return {
    quarantinedEventCount,
    quarantinedRowCount,
    quarantinedRows: sortedRowCandidates,
    reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b))),
    samples: { events: eventSamples, rows: rowSamples },
  };
}

function summarizeServiceAudit(audit) {
  const sortedRows = audit.quarantinedRows.slice().sort((a, b) => (
    String(a.filename || '').localeCompare(String(b.filename || ''))
    || String(a.competition || '').localeCompare(String(b.competition || ''))
    || String(a.event || '').localeCompare(String(b.event || ''))
    || String(a.name || '').localeCompare(String(b.name || ''))
  ));
  return {
    inspectedEvents: audit.inspectedEvents,
    inspectedRows: audit.inspectedRows,
    selectedRows: audit.selectedRows,
    quarantinedRowCount: sortedRows.length,
    samples: sortedRows.slice(0, SAMPLE_LIMIT),
  };
}

function auditExposure({
  analyticsService = recordAnalyticsService,
  currentSearchService: currentSearch = currentSearchService,
  compatibilitySearchService: compatibilitySearch = compatibilitySearchService,
  profileService = insightService,
} = {}) {
  const index = analyticsService.getIndex();
  const analyticsRecords = index.records.filter((record) => !assessPublicIndexRow({
    eventLabel: record.rawEvent,
    row: { name: record.name },
  }).indexable).length;
  const indexedEventKeys = new Set(index.records.map((record) => record.eventKey));
  const filters = analyticsService.getFilters().events.filter((event) => (
    !assessPublicIndexEvent(event.label).indexable
    || isRelayEvent(event.label)
    || !indexedEventKeys.has(event.key)
  )).length;
  const currentAudit = summarizeServiceAudit(currentSearch.auditPublicIndexEligibility());
  const compatibilityAudit = summarizeServiceAudit(compatibilitySearch.auditPublicIndexEligibility());
  const insightAudit = summarizeServiceAudit(profileService.auditPublicIndexEligibility());
  const searchRows = currentAudit.quarantinedRowCount + compatibilityAudit.quarantinedRowCount;

  return {
    analyticsRecords,
    filters,
    searchRows,
    insightRows: insightAudit.quarantinedRowCount,
    search: {
      current: currentAudit,
      compatibility: compatibilityAudit,
    },
    insights: insightAudit,
  };
}

function main() {
  const enforce = process.argv.includes('--enforce');
  const json = process.argv.includes('--json');
  const scan = scanQuarantine();
  const { quarantinedRows, ...publicScan } = scan;
  const exposures = auditExposure();
  const report = {
    ...publicScan,
    exposureCount: exposures.analyticsRecords + exposures.filters + exposures.searchRows + exposures.insightRows,
    exposures,
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write([
      `Quarantined events: ${report.quarantinedEventCount}`,
      `Quarantined rows: ${report.quarantinedRowCount}`,
      `Public exposures: ${report.exposureCount}`,
    ].join('\n') + '\n');
  }

  if (enforce && report.exposureCount > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  auditExposure,
  scanQuarantine,
};
