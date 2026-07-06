/**
 * 공개 API 라우트 (Public Routes)
 * 
 * 인증 없이 접근 가능한 엔드포인트입니다.
 * 프로필 카드, 모듈러 빌더, 대회 조회, 검색 등
 * 일반 사용자와 누구에게나 공개되는 기능입니다.
 * 
 * ═══════════════════════════════════════════════════════════════
 * 엔드포인트 목록 (15개)
 * ═══════════════════════════════════════════════════════════════
 * 
 * [검색]
 * GET  /search/competitions       - 검색 가능 대회 목록
 * GET  /search                    - 선수/소속 검색
 * 
 * [프로필 카드 - 공개]
 * GET  /profile-card/search       - 프로필 카드용 선수 기록 검색
 * POST /profile-card/generate     - 프로필 카드 이미지 생성
 * GET  /profile-card/templates    - 사용 가능 템플릿 목록
 * GET  /profile-card/layouts      - 사용 가능 레이아웃
 * GET  /profile-card/presets      - 모듈러 프리셋 목록
 * GET  /profile-card/presets/:id/options - 프리셋 토글 옵션
 * POST /profile-card/generate-modular   - 모듈러 카드 생성
 * POST /profile-card/preview-html       - 모듈러 프리뷰 HTML
 * 
 * [대회 참조 정보 - 공개 읽기 전용]
 * GET  /competitions              - 연도별 대회 목록
 * GET  /competitions/current      - 현재/직전/다음 대회
 * GET  /competitions/calendar     - 캘린더 뷰 데이터
 * GET  /competitions/:id          - 대회 상세 정보
 * 
 * [경기 결과 - 공개]
 * GET  /results/competitions      - 결과 보유 대회 목록 (연도별)
 * GET  /results/:filename/events  - 대회별 전 종목 결과
 * 
 * [법적 고지]
 * GET  /data-policy               - 데이터 사용 정책
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const config = require('../config');
const searchService = require('../services/searchService');
const profileCardService = require('../services/profileCardService');
const competitionService = require('../services/competitionService');

// 미들웨어
const { searchLimiter, generateLimiter, competitionLimiter, publicLimiter } = require('../middleware/rateLimiter');

// ============================================
// 검색 (Search)
// ============================================

router.get('/search/competitions', publicLimiter, (req, res) => {
  const competitions = searchService.getCompetitions();
  res.json({ success: true, data: competitions });
});

router.get('/search', searchLimiter, (req, res) => {
  const { q, type, comp, context } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
  }

  const validTypes = ['name', 'affiliation', 'all'];
  const searchType = validTypes.includes(type) ? type : 'all';

  // 쿼리 무독화 (제어문자 제거, 길이 제한)
  const sanitizedQuery = q.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 100);

  if (sanitizedQuery.length < 2) {
    return res.status(400).json({ success: false, error: '검색어는 2글자 이상 입력해주세요.' });
  }

  const result = searchService.search({
    query: sanitizedQuery,
    type: searchType,
    competition: comp || undefined,
    contextRows: parseInt(context) || 3,
  });

  res.json({ success: true, data: result });
});

// ============================================
// 프로필 카드 (Profile Card - 공개)
// ============================================

router.get('/profile-card/search', searchLimiter, (req, res) => {
  const { q, type } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: '선수명을 2글자 이상 입력해주세요.' });
  }

  const sanitizedQuery = q.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 100);
  const validTypes = ['name', 'affiliation', 'all'];
  const searchType = validTypes.includes(type) ? type : 'name';

  const records = profileCardService.searchAthleteRecords(sanitizedQuery, searchType);
  res.json({ success: true, data: records });
});

router.post('/profile-card/generate', generateLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const { photo, photoMimeType, athleteRecord, layout, ratio, theme, comment } = req.body || {};

    if (!photo) {
      return res.status(400).json({ success: false, error: '사진을 업로드해주세요.' });
    }
    if (!athleteRecord || !athleteRecord.name) {
      return res.status(400).json({ success: false, error: '선수 기록을 선택해주세요.' });
    }

    const base64Data = photo.replace(/^data:[^;]+;base64,/, '');
    const photoBuffer = Buffer.from(base64Data, 'base64');

    if (photoBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: '사진 크기는 10MB 이하여야 합니다.' });
    }

    const result = await profileCardService.generate({
      photoBuffer,
      photoMimeType: photoMimeType || 'image/jpeg',
      athleteRecord,
      layout: layout || 'stamp',
      ratio: ratio || '1:1',
      theme: theme || 'dark',
      comment: comment || '',
    });

    const imageBase64 = result.imageBuffer.toString('base64');
    res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${imageBase64}`,
        filename: result.filename,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    console.error('프로필 카드 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message || '카드 생성 중 오류가 발생했습니다.' });
  }
});

router.get('/profile-card/templates', publicLimiter, (req, res) => {
  try {
    const fs = require('fs');
    const templatesDir = path.join(__dirname, '../../templates/profile-card');

    if (!fs.existsSync(templatesDir)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(templatesDir)
      .filter(f => f.endsWith('.html'))
      .map(f => {
        const id = f.replace('.html', '');
        const isV2 = id.endsWith('-v2');
        const base = isV2 ? id.replace('-v2', '') : id;
        return {
          id,
          filename: f,
          name: base.charAt(0).toUpperCase() + base.slice(1) + (isV2 ? ' V2' : ''),
          version: isV2 ? 2 : 1,
          path: `/templates/profile-card/${f}`
        };
      });

    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/profile-card/layouts', publicLimiter, (req, res) => {
  const layouts = profileCardService.getAvailableLayouts();
  res.json({ success: true, data: layouts });
});

router.get('/profile-card/presets', publicLimiter, (req, res) => {
  const presets = profileCardService.getModularPresets();
  res.json({ success: true, data: presets });
});

router.get('/profile-card/presets/:presetId/options', publicLimiter, (req, res) => {
  const options = profileCardService.getToggleOptions(req.params.presetId);
  if (options.length === 0) {
    return res.status(404).json({ success: false, error: '프리셋을 찾을 수 없거나 토글 가능한 요소가 없습니다.' });
  }
  res.json({ success: true, data: options });
});

router.post('/profile-card/generate-modular', generateLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const { photo, photoMimeType, athleteRecord, preset, ratio, overrides, comment } = req.body || {};

    if (!photo) {
      return res.status(400).json({ success: false, error: '사진을 업로드해주세요.' });
    }
    if (!athleteRecord || !athleteRecord.name) {
      return res.status(400).json({ success: false, error: '선수 기록을 선택해주세요.' });
    }
    if (!preset) {
      return res.status(400).json({ success: false, error: '프리셋을 선택해주세요.' });
    }

    const base64Data = photo.replace(/^data:[^;]+;base64,/, '');
    const photoBuffer = Buffer.from(base64Data, 'base64');

    if (photoBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: '사진 크기는 10MB 이하여야 합니다.' });
    }

    const result = await profileCardService.generate({
      photoBuffer,
      photoMimeType: photoMimeType || 'image/jpeg',
      athleteRecord,
      layout: preset,
      ratio: ratio || '1:1',
      theme: 'dark',
      comment: comment || '',
      overrides: overrides || {},
    });

    const imageBase64 = result.imageBuffer.toString('base64');
    res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${imageBase64}`,
        filename: result.filename,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    console.error('모듈러 카드 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message || '카드 생성 중 오류가 발생했습니다.' });
  }
});

router.post('/profile-card/preview-html', publicLimiter, express.json({ limit: '1mb' }), (req, res) => {
  try {
    const { preset, ratio, overrides, data } = req.body || {};
    if (!preset) {
      return res.status(400).json({ success: false, error: '프리셋을 선택해주세요.' });
    }

    const cardEngine = require('../card-engine');
    const dimensions = cardEngine.getRatioDimensions(ratio || '1:1');

    const cardData = {
      width: dimensions.width,
      height: dimensions.height,
      photoUrl: data?.photoUrl || '',
      competition: data?.competition || '',
      event: data?.event || '',
      date: data?.date || '',
      venue: data?.venue || '',
      name: data?.name || '',
      affiliation: data?.affiliation || '',
      rank: data?.rank || '-',
      record: data?.record || '',
      recordUnit: data?.recordUnit || '',
      wind: data?.wind || '',
      hasWind: !!data?.hasWind && !!data?.wind,
      comment: data?.comment || '',
      hasComment: !!(data?.comment),
    };

    const html = cardEngine.render(preset, cardData, overrides || {});
    res.json({ success: true, data: { html } });
  } catch (error) {
    console.error('모듈러 프리뷰 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 대회 참조 정보 (Competitions - 읽기 전용 공개)
// ============================================

router.get('/competitions', competitionLimiter, (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const options = {
      category: req.query.category || undefined,
      status: req.query.status || undefined,
      search: req.query.search || undefined
    };
    const competitions = competitionService.getCompetitions(year, options);
    res.json({ success: true, year, total: competitions.length, data: competitions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/competitions/current', competitionLimiter, (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const current = competitionService.getCurrentCompetitions(year);
    res.json({ success: true, data: current });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/competitions/calendar', competitionLimiter, (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const calendar = competitionService.getCalendarView(year);
    res.json({ success: true, year, data: calendar });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/competitions/:id', competitionLimiter, (req, res) => {
  try {
    const comp = competitionService.getCompetitionById(req.params.id);
    if (!comp) {
      return res.status(404).json({ success: false, error: '대회를 찾을 수 없습니다.' });
    }
    // 공개 API에서는 stats와 rawFiles를 제외 (관리자 전용)
    res.json({ success: true, data: comp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// 경기 결과 (Results - 공개)
// ============================================

/**
 * 결과 보유 대회 목록 (연도 필터 지원)
 * GET /results/competitions?year=2025
 */
router.get('/results/competitions', publicLimiter, (req, res) => {
  try {
    const competitions = searchService.getCompetitions();
    const yearFilter = req.query.year ? String(req.query.year) : null;
    
    const enriched = competitions.map(c => {
      // source 태그 판별: 파일명에 _pr_ 포함 여부 또는 meta.source 확인
      const isPacerise = c.filename && c.filename.includes('_pr_');
      return {
        ...c,
        year: c.year || (c.period ? c.period.split('-')[0] : ''),
        source: isPacerise ? 'pacerise' : 'kaaf',
        sourceLabel: isPacerise ? '실업' : '',
      };
    });
    
    const filtered = yearFilter 
      ? enriched.filter(c => c.year === yearFilter)
      : enriched;
    
    // 연도 목록도 함께 반환
    const years = [...new Set(enriched.map(c => c.year).filter(Boolean))].sort().reverse();
    
    res.json({ success: true, data: filtered, years, total: filtered.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 대회별 전 종목 결과
 * GET /results/:filename/events?eventType=track
 */
router.get('/results/:filename/events', publicLimiter, (req, res) => {
  try {
    const fs = require('fs');
    const rawDir = config.dirs.raw;
    const filename = req.params.filename;
    
    // 보안: 경로 탈출 방지
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: '잘못된 파일명입니다.' });
    }
    
    const filePath = path.join(rawDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '대회 결과를 찾을 수 없습니다.' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const meta = data.meta || {};
    const events = (data.events || []).map(ev => {
      const { classifyEvent, needsWind } = require('../eventClassifier');
      return {
        event: ev.event,
        division: ev.division || null,
        date: ev.date || '',
        wind: ev.wind || null,
        hasWind: needsWind(ev.event),
        eventType: classifyEvent(ev.event),
        results: (ev.results || []).map(r => ({
          rank: r.rank,
          name: r.name,
          affiliation: r.affiliation || '',
          record: r.record,
          wind: r.wind || null,
          note: r.note || '',
          newRecord: r.newRecord || '',
        })),
        totalAthletes: (ev.results || []).length,
      };
    });
    
    // 종목 유형 필터 (선택)
    const eventTypeFilter = req.query.eventType;
    const filtered = eventTypeFilter 
      ? events.filter(e => e.eventType === eventTypeFilter)
      : events;
    
    res.json({
      success: true,
      data: {
        meta: {
          competition: meta.competition_name || '',
          year: meta.year || '',
          period: meta.period || '',
          venue: meta.venue || '',
          source: meta.source || 'kaaf',
          sourceLabel: meta.source === 'pacerise' ? '실업' : '',
          sourceUrl: meta.source_url || '',
          collectedAt: meta.crawled_at || '',
        },
        events: filtered,
        totalEvents: filtered.length,
        totalAthletes: filtered.reduce((sum, e) => sum + e.totalAthletes, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// 법적 고지 (Data Policy)
// ============================================

router.get('/data-policy', publicLimiter, (req, res) => {
  try {
    const policy = require('../DATA_POLICY');
    res.json({
      success: true,
      data: {
        version: policy.DATA_POLICY_VERSION,
        date: policy.DATA_POLICY_DATE,
        positioning: 'AthleteTime은 공개 경기기록을 색인하고 정리하는 비공식 기록 탐색 서비스입니다.',
        disclaimer: policy.DISCLAIMER,
        usageTypes: policy.DATA_USAGE_TYPE,
        riskLevels: policy.CONTENT_RISK_LEVEL,
        legalReferences: policy.LEGAL_REFERENCES
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
