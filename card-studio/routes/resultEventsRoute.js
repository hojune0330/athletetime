const fs = require('fs');
const path = require('path');

const { classifyEvent, needsWind } = require('../eventClassifier');
const resultsStore = require('../services/resultsStore');
const {
  HOLD_MESSAGE,
  HOLD_STATUS,
  isResultEventOnQualityHold,
} = require('../services/relayResultQualityService');

const MASKED_NAME = '비공개 요청 처리 중';

function readResultData(filename, rawDir) {
  const data = resultsStore.getRawByFilename(filename);
  if (data) {
    return resultsStore.isPublicResultFilename(filename) ? data : null;
  }

  const filePath = path.join(rawDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function mapHeldEvent(event) {
  return {
    event: event.event,
    division: event.division || null,
    date: event.date || '',
    wind: event.wind || null,
    hasWind: needsWind(event.event),
    eventType: classifyEvent(event.event),
    tableType: event.tableType || 'relay',
    resultsStatus: event.resultsStatus || HOLD_STATUS,
    qualityHold: true,
    qualityMessage: event.qualityMessage || HOLD_MESSAGE,
    heldResultCount: Number(event.heldResultCount || 0),
    results: [],
    totalAthletes: 0,
  };
}

function mapVisibleRow(row, context) {
  const suppression = context.dataRequestService.checkSuppression({
    name: row.name,
    affiliation: row.affiliation,
    competition: context.competitionName,
  });

  if (suppression === 'remove') return null;

  const masked = suppression === 'mask';
  return {
    rank: row.rank,
    name: masked ? MASKED_NAME : row.name,
    affiliation: masked ? '' : (row.affiliation || ''),
    record: masked ? '' : row.record,
    wind: masked ? null : (row.wind || null),
    note: masked ? '' : (row.note || ''),
    newRecord: masked ? '' : (row.newRecord || ''),
    athleteId: masked ? undefined : context.stableAthleteId(row.name, row.affiliation),
    provenance: masked ? undefined : context.provenance,
    suppressed: masked ? 'mask' : undefined,
  };
}

function mapVisibleEvent(event, context) {
  if (isResultEventOnQualityHold(event)) return mapHeldEvent(event);

  const results = (event.results || [])
    .map((row) => mapVisibleRow(row, context))
    .filter(Boolean);

  return {
    event: event.event,
    division: event.division || null,
    date: event.date || '',
    wind: event.wind || null,
    hasWind: needsWind(event.event),
    eventType: classifyEvent(event.event),
    results,
    totalAthletes: results.length,
  };
}

function createResultEventsHandler(dependencies) {
  return (req, res) => {
    try {
      const filename = req.params.filename;

      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ success: false, error: '잘못된 파일명입니다.' });
      }

      const data = readResultData(filename, dependencies.config.dirs.raw);
      if (!data) {
        return res.status(404).json({ success: false, error: '대회 결과를 찾을 수 없습니다.' });
      }

      const meta = data.meta || {};
      const provenance = dependencies.dataRightsPolicy.publicResultProvenance({
        provider: 'KAAF',
        sourceId: filename,
        sourceUrl: meta.source_url || '',
        capturedAt: meta.crawled_at || '',
      });

      const context = {
        competitionName: meta.competition_name || '',
        dataRequestService: dependencies.dataRequestService,
        provenance,
        stableAthleteId: dependencies.stableAthleteId,
      };
      const events = (data.events || []).map((event) => mapVisibleEvent(event, context));
      const eventTypeFilter = req.query.eventType;
      const filtered = eventTypeFilter
        ? events.filter((event) => event.eventType === eventTypeFilter)
        : events;

      return res.json({
        success: true,
        data: {
          meta: {
            competition: meta.competition_name || '',
            year: meta.year || '',
            period: meta.period || '',
            venue: meta.venue || '',
            source: 'kaaf',
            sourceLabel: provenance.sourceLabel,
            sourceUrl: meta.source_url || '',
            collectedAt: meta.crawled_at || '',
            sourceTier: provenance.sourceTier,
            scopeNotice: provenance.scopeNotice,
            correctionUrl: provenance.correctionUrl,
          },
          events: filtered,
          totalEvents: filtered.length,
          totalAthletes: filtered.reduce((sum, event) => sum + event.totalAthletes, 0),
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };
}

module.exports = {
  createResultEventsHandler,
};
