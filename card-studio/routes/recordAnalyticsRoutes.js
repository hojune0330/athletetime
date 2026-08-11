const express = require('express');

const { publicLimiter, searchLimiter } = require('../middleware/rateLimiter');
const recordAnalyticsService = require('../services/recordAnalyticsService');
const dataQualityService = require('../services/dataQualityService');
const anonymousInsightsService = require('../services/anonymousInsightsService');
const identityShadowService = require('../services/identityShadowService');
const zeroResultSearchService = require('../services/zeroResultSearchService');
const dataRightsPolicy = require('../dataRightsPolicy');
const { CATEGORY_ORDER: TEAM_CATEGORIES } = require('../services/teamCategoryService');
const { createRecordWorkspaceRouter } = require('./recordWorkspaceRoutes');

const TEAM_CONTRACT_VERSION = 1;

async function tryRecordZeroResultSearch(query) {
  try {
    return await zeroResultSearchService.recordZeroResultSearch({ query, surface: 'records' });
  } catch {
    return null;
  }
}

const router = express.Router();

router.get('/filters', publicLimiter, (req, res) => {
  try {
    res.json({ success: true, data: recordAnalyticsService.getFilters() });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/popular-events', publicLimiter, (req, res) => {
  try {
    const data = recordAnalyticsService.getPopularEvents({
      season: req.query.season,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/insights', publicLimiter, (req, res) => {
  try {
    const data = anonymousInsightsService.getAnonymousInsights({
      season: req.query.season,
      limit: req.query.limit,
      minGroupSize: req.query.minGroupSize,
      windowDays: req.query.windowDays,
    });
    res.json({ success: true, data });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/data-quality', publicLimiter, (req, res) => {
  try {
    res.json({ success: true, data: dataQualityService.getDataQualityReport() });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/identity/shadow-cluster', publicLimiter, (req, res) => {
  try {
    const data = identityShadowService.getShadowCluster({ athleteKey: req.query.athleteKey });
    res.json({ success: true, data });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/records/search', searchLimiter, async (req, res) => {
  try {
    const query = String(req.query.q || '')
      .trim()
      .replace(/[\x00-\x1f\x7f]/g, '')
      .slice(0, 100);
    if (query.length < 2) {
      return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
    }
    const athletes = recordAnalyticsService.searchAthletes(query, req.query.limit);
    if (athletes.length === 0) await tryRecordZeroResultSearch(query);
    return res.json({
      success: true,
      data: athletes,
      total: athletes.length,
      dataRights: dataRightsPolicy.RESPONSE_NOTICE,
    });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/teams/search', searchLimiter, (req, res) => {
  try {
    const query = String(req.query.q || '')
      .trim()
      .replace(/[\x00-\x1f\x7f]/g, '')
      .slice(0, 100);
    if (query.length < 2) {
      return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
    }
    const category = cleanQuery(req.query.category, 30).toLowerCase();
    if (category && !TEAM_CATEGORIES.includes(category)) {
      return invalidTeamRequest(res, 'INVALID_TEAM_CATEGORY', '지원하지 않는 팀 종류예요.');
    }
    const limit = parseBoundedInteger(req.query.limit, 20, 1, 30);
    if (limit === null) {
      return invalidTeamRequest(res, 'INVALID_TEAM_LIMIT', '한 번에 1개부터 30개 팀까지 볼 수 있어요.');
    }
    const teams = recordAnalyticsService
      .searchTeamStatistics(query, limit, { category })
      .map(toPublicTeamSearchSummary);
    return res.json({
      success: true,
      contractVersion: TEAM_CONTRACT_VERSION,
      data: teams,
      total: teams.length,
      dataRights: dataRightsPolicy.RESPONSE_NOTICE,
    });
  } catch {
    return internalTeamError(res);
  }
});

router.get('/teams/:teamKey', publicLimiter, (req, res) => {
  try {
    const teamKey = cleanQuery(req.params.teamKey, 40).toLowerCase();
    if (!/^[a-f0-9]{16}$/u.test(teamKey)) {
      return invalidTeamRequest(res, 'INVALID_TEAM_KEY', '팀 주소가 올바르지 않아요.');
    }
    const category = cleanQuery(req.query.category, 30).toLowerCase();
    if (category && !TEAM_CATEGORIES.includes(category)) {
      return invalidTeamRequest(res, 'INVALID_TEAM_CATEGORY', '지원하지 않는 팀 종류예요.');
    }
    const scope = cleanQuery(req.query.scope, 20).toLowerCase() || 'latest';
    if (!['latest', 'all'].includes(scope)) {
      return invalidTeamRequest(res, 'INVALID_TEAM_SCOPE', '기간 범위가 올바르지 않아요.');
    }
    const season = req.query.season === undefined
      ? null
      : parseBoundedInteger(req.query.season, null, 1900, new Date().getFullYear() + 1);
    if (req.query.season !== undefined && season === null) {
      return invalidTeamRequest(res, 'INVALID_TEAM_SEASON', '시즌 연도가 올바르지 않아요.');
    }
    const detail = recordAnalyticsService.getTeamStatistics(teamKey, { category, scope, season });
    if (!detail) {
      return res.status(404).json({ success: false, code: 'TEAM_NOT_FOUND', error: '조건에 맞는 팀 기록을 찾지 못했어요.' });
    }
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json({
      success: true,
      contractVersion: TEAM_CONTRACT_VERSION,
      data: detail,
      dataRights: dataRightsPolicy.RESPONSE_NOTICE,
    });
  } catch {
    return internalTeamError(res);
  }
});

router.get('/records/zero-result-summary', publicLimiter, async (req, res) => {
  try {
    return res.json({
      success: true,
      data: await zeroResultSearchService.getZeroResultSearchSummary({ limit: req.query.limit }),
    });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/athletes/:athleteKey', publicLimiter, (req, res) => {
  try {
    const profile = recordAnalyticsService.getAthleteSummary(req.params.athleteKey);
    if (!profile) {
      return res.status(404).json({ success: false, error: '선수 기록을 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: profile, dataRights: dataRightsPolicy.RESPONSE_NOTICE });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.get('/season-records', publicLimiter, (req, res) => {
  try {
    const table = recordAnalyticsService.getSeasonRecords({
      season: req.query.season,
      eventKey: req.query.eventKey,
      divisionKey: req.query.divisionKey,
      athleteKey: req.query.athleteKey,
      limit: req.query.limit,
    });
    return res.json({ success: true, data: table, dataRights: dataRightsPolicy.RESPONSE_NOTICE });
  } catch {
    return internalAnalyticsError(res);
  }
});

router.use('/record-workspaces', createRecordWorkspaceRouter());

function toPublicTeamSearchSummary(team) {
  return {
    teamKey: team.teamKey,
    teamLabel: team.teamLabel,
    selectedCategory: team.selectedCategory,
    primaryCategory: team.primaryCategory,
    categoryEvidence: team.categoryEvidence,
    categoryBreakdown: team.categoryBreakdown,
    athleteCount: team.athleteCount,
    resultCount: team.resultCount,
    competitionCount: team.competitionCount,
    eventCount: team.eventCount,
    confirmedPodiumCount: team.confirmedPodiumCount,
    indexedImprovementCount: team.indexedImprovementCount,
    firstSeason: team.firstSeason,
    latestSeason: team.latestSeason,
    latestDate: team.latestDate,
    coverageDisclaimer: team.coverageDisclaimer,
  };
}

function cleanQuery(value, max) {
  return String(value || '')
    .trim()
    .replace(/[\x00-\x1f\x7f]/gu, '')
    .slice(0, max);
}

function parseBoundedInteger(value, fallback, min, max) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim();
  if (!/^\d+$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function invalidTeamRequest(res, code, error) {
  return res.status(400).json({ success: false, code, error });
}

function internalTeamError(res) {
  return internalAnalyticsError(res, '팀 통계를 불러오지 못했어요.');
}

function internalAnalyticsError(res, error = '기록 정보를 불러오지 못했어요.') {
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error });
}

module.exports = router;
