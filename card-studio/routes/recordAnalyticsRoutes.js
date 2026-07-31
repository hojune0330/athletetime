const express = require('express');

const { publicLimiter, searchLimiter } = require('../middleware/rateLimiter');
const recordAnalyticsService = require('../services/recordAnalyticsService');
const dataQualityService = require('../services/dataQualityService');
const anonymousInsightsService = require('../services/anonymousInsightsService');
const identityShadowService = require('../services/identityShadowService');
const zeroResultSearchService = require('../services/zeroResultSearchService');
const dataRightsPolicy = require('../dataRightsPolicy');
const { createRecordWorkspaceRouter } = require('./recordWorkspaceRoutes');

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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/popular-events', publicLimiter, (req, res) => {
  try {
    const data = recordAnalyticsService.getPopularEvents({
      season: req.query.season,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/data-quality', publicLimiter, (req, res) => {
  try {
    res.json({ success: true, data: dataQualityService.getDataQualityReport() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/identity/shadow-cluster', publicLimiter, (req, res) => {
  try {
    const data = identityShadowService.getShadowCluster({ athleteKey: req.query.athleteKey });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/records/search', searchLimiter, async (req, res) => {
  try {
    const query = String(req.query.q || '')
      .trim()
      .replace(/[\x00-\x1f\x7f]/g, '')
      .slice(0, 100);
    if (query.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters.' });
    }
    const athletes = recordAnalyticsService.searchAthletes(query, req.query.limit);
    if (athletes.length === 0) await tryRecordZeroResultSearch(query);
    return res.json({
      success: true,
      data: athletes,
      total: athletes.length,
      dataRights: dataRightsPolicy.RESPONSE_NOTICE,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/teams/search', searchLimiter, (req, res) => {
  try {
    const query = String(req.query.q || '')
      .trim()
      .replace(/[\x00-\x1f\x7f]/g, '')
      .slice(0, 100);
    if (query.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters.' });
    }
    const teams = recordAnalyticsService.searchTeamStatistics(query, req.query.limit);
    return res.json({
      success: true,
      data: teams,
      total: teams.length,
      dataRights: dataRightsPolicy.RESPONSE_NOTICE,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/records/zero-result-summary', publicLimiter, async (req, res) => {
  try {
    return res.json({
      success: true,
      data: await zeroResultSearchService.getZeroResultSearchSummary({ limit: req.query.limit }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/athletes/:athleteKey', publicLimiter, (req, res) => {
  try {
    const profile = recordAnalyticsService.getAthleteSummary(req.params.athleteKey);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Athlete analytics profile not found.' });
    }
    return res.json({ success: true, data: profile, dataRights: dataRightsPolicy.RESPONSE_NOTICE });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.use('/record-workspaces', createRecordWorkspaceRouter());

module.exports = router;
