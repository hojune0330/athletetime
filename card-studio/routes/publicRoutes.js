const crypto = require('crypto');
const express = require('express');

const config = require('../config');
const competitionService = require('../services/competitionService');
const dataRequestService = require('../services/dataRequestService');
const insightService = require('../services/insightService');
const searchService = require('../services/searchService');
const dataRightsPolicy = require('../dataRightsPolicy');
const { competitionLimiter, dataRequestLimiter, publicLimiter, searchLimiter } = require('../middleware/rateLimiter');
const { createResultEventsHandler } = require('./resultEventsRoute');
const recordAnalyticsRoutes = require('./recordAnalyticsRoutes');
const profileCardPublicRoutes = require('./profileCardPublicRoutes');
const { sendPublicServiceError } = require('./publicErrorResponse');

const router = express.Router();

function stableAthleteId(name, affiliation) {
  const key = `${String(name || '').trim()}|${String(affiliation || '').trim()}`;
  if (key === '|') return '';
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

router.get('/search/competitions', publicLimiter, (req, res) => {
  return res.json({ success: true, data: searchService.getCompetitions() });
});

router.get('/search', searchLimiter, (req, res) => {
  const { q, type, comp, context } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
  }
  const sanitizedQuery = q.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 100);
  if (sanitizedQuery.length < 2) {
    return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
  }
  const validTypes = ['name', 'affiliation', 'all'];
  return res.json({
    success: true,
    data: searchService.search({
      query: sanitizedQuery,
      type: validTypes.includes(type) ? type : 'all',
      competition: comp || undefined,
      contextRows: parseInt(context, 10) || 3,
    }),
  });
});

router.get('/insights/featured', publicLimiter, (req, res) => {
  try {
    const profiles = insightService.getFeaturedProfiles(req.query.limit);
    return res.json({ success: true, data: profiles, total: profiles.length });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/insights/search', searchLimiter, (req, res) => {
  try {
    const query = String(req.query.q || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 100);
    if (query.length < 2) {
      return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
    }
    const profiles = insightService.searchProfiles(query, req.query.limit);
    return res.json({ success: true, data: profiles, total: profiles.length });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/insights/athlete/:id', publicLimiter, (req, res) => {
  try {
    const profile = insightService.getProfileById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: '선수 기록을 찾을 수 없습니다.' });
    return res.json({ success: true, data: profile });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.use('/analytics', recordAnalyticsRoutes);
router.use('/profile-card', profileCardPublicRoutes);

router.get('/competitions', competitionLimiter, (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const competitions = competitionService.getCompetitions(year, {
      category: req.query.category || undefined,
      status: req.query.status || undefined,
      search: req.query.search || undefined,
    });
    return res.json({ success: true, year, total: competitions.length, data: competitions });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/competitions/current', competitionLimiter, (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    return res.json({ success: true, data: competitionService.getCurrentCompetitions(year) });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/competitions/calendar', competitionLimiter, (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    return res.json({ success: true, year, data: competitionService.getCalendarView(year) });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/competitions/:id', competitionLimiter, (req, res) => {
  try {
    const competition = competitionService.getCompetitionById(req.params.id);
    if (!competition) return res.status(404).json({ success: false, error: '대회를 찾을 수 없습니다.' });
    return res.json({ success: true, data: competition });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/results/competitions', publicLimiter, (req, res) => {
  try {
    const yearFilter = req.query.year ? String(req.query.year) : null;
    const enriched = searchService.getCompetitions().map((competition) => ({
      ...competition,
      year: competition.year || (competition.period ? competition.period.split('-')[0] : ''),
    }));
    const data = yearFilter ? enriched.filter((competition) => competition.year === yearFilter) : enriched;
    const years = [...new Set(enriched.map((competition) => competition.year).filter(Boolean))].sort().reverse();
    return res.json({ success: true, data, years, total: data.length });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/results/:filename/events', publicLimiter, createResultEventsHandler({
  config,
  dataRequestService,
  dataRightsPolicy,
  stableAthleteId,
}));

router.get('/data-policy', publicLimiter, (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        version: dataRightsPolicy.DATA_RIGHTS_POLICY_VERSION,
        positioning: dataRightsPolicy.SERVICE_POSITIONING,
        disclaimer: dataRightsPolicy.SERVICE_POSITIONING.short,
        sourceTiers: dataRightsPolicy.SOURCE_TIERS,
        fieldPolicy: dataRightsPolicy.FIELD_POLICY,
        correction: dataRightsPolicy.CORRECTION,
        generatedOrderNotice: dataRightsPolicy.GENERATED_ORDER_NOTICE,
        prohibitedPublicClaims: dataRightsPolicy.PROHIBITED_PUBLIC_CLAIMS,
      },
    });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.post('/data-requests', dataRequestLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const result = await dataRequestService.submitPublicRequest(req.body || {});
    if (!result.ok) return res.status(400).json({ success: false, error: result.error });
    return res.status(201).json({
      success: true,
      data: {
        ticketId: result.ticketId,
        status: result.status,
        receivedAt: result.receivedAt,
        message: '요청이 접수되었습니다. 접수 번호로 처리 상태를 확인하실 수 있습니다.',
      },
    });
  } catch (error) {
    const unavailable = ['DATA_RIGHTS_UNAVAILABLE', 'CONTACT_ENCRYPTION_UNAVAILABLE'].includes(error.code);
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: unavailable ? '현재 요청을 안전하게 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.' : '요청 처리 중 오류가 발생했습니다.',
    });
  }
});

router.get('/data-requests/:ticketId', publicLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const status = await dataRequestService.getStatusByTicket(req.params.ticketId);
    if (!status) return res.status(404).json({ success: false, error: '해당 접수 번호를 찾을 수 없습니다.' });
    return res.json({ success: true, data: status });
  } catch (error) {
    const unavailable = ['DATA_RIGHTS_UNAVAILABLE', 'LEGACY_TICKET_LOOKUP_UNAVAILABLE'].includes(error.code);
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: '처리 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
