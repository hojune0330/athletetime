const fs = require('fs');
const path = require('path');

const { classifyEvent, needsWind } = require('../eventClassifier');
const resultsStore = require('../services/resultsStore');
const {
  HOLD_MESSAGE,
  HOLD_STATUS,
  isResultEventOnQualityHold,
} = require('../services/relayResultQualityService');
const {
  buildCompetitionHighlights,
  normalizeSeriesName,
} = require('../services/competitionHighlightsService');

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

/**
 * 같은 대회 시리즈의 과거 회차를 찾아 history로 만든다 (최신 먼저, 현재 회차 제외).
 * 과거 회차 이벤트에도 동일한 노출 정책(마스킹/홀드)을 적용해 비교한다.
 */
function buildSeriesHistory(currentFilename, currentMeta, dependencies) {
  try {
    const seriesKey = normalizeSeriesName(currentMeta.competition_name || '');
    if (!seriesKey) return [];
    const currentYear = Number(currentMeta.year || 0);

    const pastEditions = resultsStore
      .listCompetitions()
      .filter((comp) => comp.filename !== currentFilename)
      .filter((comp) => normalizeSeriesName(comp.competition) === seriesKey)
      .filter((comp) => !currentYear || Number(comp.year || 0) < currentYear)
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0));

    const history = [];
    for (const past of pastEditions.slice(0, 5)) {
      const raw = resultsStore.getRawByFilename(past.filename);
      if (!raw) continue;
      const context = {
        competitionName: raw.meta.competition_name || '',
        dataRequestService: dependencies.dataRequestService,
        provenance: undefined,
        stableAthleteId: dependencies.stableAthleteId,
      };
      history.push({
        year: String(past.year || ''),
        events: (raw.events || []).map((event) => mapVisibleEvent(event, context)),
      });
    }
    return history;
  } catch (error) {
    return []; // 맥락 실패는 볼거리 없음으로 강등 — 결과 응답 자체는 유지
  }
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

      // 대회 볼거리: 마스킹/홀드가 끝난 공개 이벤트 + 같은 시리즈 과거 회차 맥락
      const history = buildSeriesHistory(filename, meta, dependencies);
      const highlights = buildCompetitionHighlights(events, { history });

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
          highlights,
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
