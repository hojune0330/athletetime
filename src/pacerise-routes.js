/**
 * PaceRise API 라우터
 * 
 * pace-rise-node.com (실업육상연맹 오퍼레이터) 데이터를 
 * AthleTime 프론트엔드에 제공하는 프록시/정규화 API
 * 
 * ═══════════════════════════════════════════════════════════════
 * 엔드포인트:
 *   GET /api/pacerise/health           → 연결 상태 확인
 *   GET /api/pacerise/competitions     → 대회 목록
 *   GET /api/pacerise/competitions/:id → 대회 상세 (종목 포함)
 *   GET /api/pacerise/competitions/:id/results    → 대회 전체 결과
 *   GET /api/pacerise/competitions/:id/schedule   → 대회 시간표
 *   GET /api/pacerise/competitions/:id/athletes   → 대회 선수 명단
 *   GET /api/pacerise/events/:eventId/results     → 특정 종목 결과
 *   GET /api/pacerise/live                        → 현재 진행중 대회 요약
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const pacerise = require('./pacerise-client');

// ============================================
// 에러 핸들러 래퍼
// ============================================

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// GET /health - PaceRise 연결 상태
// ============================================

router.get('/health', asyncHandler(async (req, res) => {
  const health = await pacerise.healthCheck();
  res.json({ success: true, ...health });
}));

// ============================================
// GET /competitions - 전체 대회 목록
// ============================================

router.get('/competitions', asyncHandler(async (req, res) => {
  const { status, federation } = req.query;
  
  let competitions = await pacerise.getCompetitions();

  // 필터링
  if (status) {
    competitions = competitions.filter(c => c.status === status);
  }
  if (federation) {
    competitions = competitions.filter(c => c.federation === federation);
  }

  // 정규화
  const normalized = competitions.map(c => ({
    id: c.id,
    name: c.name,
    start_date: c.start_date,
    end_date: c.end_date,
    venue: c.venue,
    status: c.status,
    status_label: pacerise.STATUS_LABELS[c.status] || c.status,
    federation: c.federation,
    federation_label: pacerise.FEDERATION_LABELS[c.federation] || c.federation || '기타',
    video_url: c.video_url || '',
    created_at: c.created_at,
  }));

  // 날짜순 정렬 (최신 먼저)
  normalized.sort((a, b) => {
    const dateA = new Date(a.start_date);
    const dateB = new Date(b.start_date);
    return dateB - dateA;
  });

  res.json({
    success: true,
    competitions: normalized,
    total: normalized.length,
    source: 'pace-rise-node.com',
  });
}));

// ============================================
// GET /competitions/:id - 대회 상세 (종목 목록 포함)
// ============================================

router.get('/competitions/:id', asyncHandler(async (req, res) => {
  const competitionId = Number(req.params.id);
  const { category, gender, round_type, round_status } = req.query;

  const competitions = await pacerise.getCompetitions();
  const competition = competitions.find(c => c.id === competitionId);
  
  if (!competition) {
    return res.status(404).json({ success: false, error: '대회를 찾을 수 없습니다' });
  }

  let events = await pacerise.getEvents(competitionId);

  // 필터링
  if (category) events = events.filter(e => e.category === category);
  if (gender) events = events.filter(e => e.gender === gender);
  if (round_type) events = events.filter(e => e.round_type === round_type);
  if (round_status) events = events.filter(e => e.round_status === round_status);

  // 종목 정규화
  const normalizedEvents = events.map(e => ({
    id: e.id,
    name: e.name,
    category: e.category,
    category_label: pacerise.CATEGORY_LABELS[e.category] || e.category,
    gender: e.gender,
    gender_label: e.gender === 'M' ? '남자' : '여자',
    round_type: e.round_type,
    round_label: pacerise.ROUND_LABELS[e.round_type] || e.round_type,
    round_status: e.round_status,
    status_label: pacerise.STATUS_LABELS[e.round_status] || e.round_status,
    heat_count: e.heat_count,
    video_url: e.video_url || '',
    memo: e.callroom_event_memo || '',
    sort_order: e.sort_order,
  }));

  // sort_order로 정렬
  normalizedEvents.sort((a, b) => a.sort_order - b.sort_order);

  // 카테고리별 그룹
  const byCategory = {};
  normalizedEvents.forEach(e => {
    const key = e.category_label;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(e);
  });

  // 요약 통계
  const summary = {
    total: normalizedEvents.length,
    completed: normalizedEvents.filter(e => e.round_status === 'completed').length,
    in_progress: normalizedEvents.filter(e => e.round_status === 'in_progress').length,
    pending: normalizedEvents.filter(e => e.round_status === 'heats_generated' || e.round_status === 'created').length,
  };

  res.json({
    success: true,
    competition: {
      id: competition.id,
      name: competition.name,
      start_date: competition.start_date,
      end_date: competition.end_date,
      venue: competition.venue,
      status: competition.status,
      status_label: pacerise.STATUS_LABELS[competition.status] || competition.status,
      federation: competition.federation,
      federation_label: pacerise.FEDERATION_LABELS[competition.federation] || competition.federation,
      video_url: competition.video_url || '',
    },
    events: normalizedEvents,
    by_category: byCategory,
    summary,
  });
}));

// ============================================
// GET /competitions/:id/results - 대회 전체 결과
// ============================================

router.get('/competitions/:id/results', asyncHandler(async (req, res) => {
  const competitionId = Number(req.params.id);
  const { finals_only, category, gender, status } = req.query;

  const data = await pacerise.getCompetitionResults(competitionId, {
    finalsOnly: finals_only === 'true',
    category: category || undefined,
    gender: gender || undefined,
    status: status || undefined,
  });

  res.json({
    success: true,
    ...data,
  });
}));

// ============================================
// GET /competitions/:id/schedule - 대회 시간표
// ============================================

router.get('/competitions/:id/schedule', asyncHandler(async (req, res) => {
  const competitionId = Number(req.params.id);
  const data = await pacerise.getCompetitionSchedule(competitionId);

  res.json({
    success: true,
    ...data,
  });
}));

// ============================================
// GET /competitions/:id/athletes - 대회 선수 명단
// ============================================

router.get('/competitions/:id/athletes', asyncHandler(async (req, res) => {
  const competitionId = Number(req.params.id);
  const { team, gender } = req.query;

  const data = await pacerise.getCompetitionAthletes(competitionId);

  // 추가 필터링
  let athletes = data.athletes;
  if (team) athletes = athletes.filter(a => a.team === team);
  if (gender) athletes = athletes.filter(a => a.gender === gender);

  res.json({
    success: true,
    competition: data.competition,
    athletes,
    teams: data.teams,
    by_team: team ? { [team]: athletes } : data.by_team,
    total_athletes: athletes.length,
    total_teams: data.total_teams,
    fetched_at: data.fetched_at,
  });
}));

// ============================================
// GET /events/:eventId/results - 특정 종목 결과
// ============================================

router.get('/events/:eventId/results', asyncHandler(async (req, res) => {
  const eventId = Number(req.params.eventId);
  const { competition_id } = req.query;

  // 종목 정보를 가져오기 위해 competition_id가 있으면 이벤트 검색
  let eventInfo = null;
  if (competition_id) {
    const events = await pacerise.getEvents(Number(competition_id));
    eventInfo = events.find(e => e.id === eventId);
  }

  const heats = await pacerise.getHeats(eventId);
  
  if (heats.length === 0) {
    return res.json({
      success: true,
      event_id: eventId,
      event: eventInfo ? {
        name: eventInfo.name,
        category: eventInfo.category,
        category_label: pacerise.CATEGORY_LABELS[eventInfo.category] || eventInfo.category,
        gender: eventInfo.gender,
        gender_label: eventInfo.gender === 'M' ? '남자' : '여자',
        round_type: eventInfo.round_type,
        round_label: pacerise.ROUND_LABELS[eventInfo.round_type] || eventInfo.round_type,
        round_status: eventInfo.round_status,
        status_label: pacerise.STATUS_LABELS[eventInfo.round_status] || eventInfo.round_status,
      } : {},
      heats: [],
      total_results: 0,
    });
  }

  const heatResults = [];
  for (const heat of heats) {
    const rawResults = await pacerise.getResults(heat.id);
    
    // 결과를 종목 카테고리에 맞게 정규화
    let normalizedResults;
    if (eventInfo) {
      if (eventInfo.category === 'field_distance' || eventInfo.category === 'field_height') {
        normalizedResults = pacerise.normalizeFieldDistanceResults(rawResults);
      } else if (eventInfo.category === 'road') {
        normalizedResults = pacerise.normalizeRoadResults(rawResults);
      } else {
        normalizedResults = pacerise.normalizeTrackResults(rawResults, heat.wind);
      }
    } else {
      // competition_id가 없으면 기본적으로 트랙으로 처리하되 원본도 포함
      normalizedResults = pacerise.normalizeTrackResults(rawResults, heat.wind);
    }

    heatResults.push({
      heat_id: heat.id,
      heat_number: heat.heat_number,
      heat_name: heat.heat_name || heat.scoreboard_key || '',
      wind: heat.wind || null,
      results: normalizedResults,
      athletes_count: normalizedResults.length,
    });
  }

  res.json({
    success: true,
    event_id: eventId,
    event: eventInfo ? {
      name: eventInfo.name,
      category: eventInfo.category,
      category_label: pacerise.CATEGORY_LABELS[eventInfo.category] || eventInfo.category,
      gender: eventInfo.gender,
      gender_label: eventInfo.gender === 'M' ? '남자' : '여자',
      round_type: eventInfo.round_type,
      round_label: pacerise.ROUND_LABELS[eventInfo.round_type] || eventInfo.round_type,
      round_status: eventInfo.round_status,
      status_label: pacerise.STATUS_LABELS[eventInfo.round_status] || eventInfo.round_status,
      video_url: eventInfo.video_url || '',
    } : {},
    heats: heatResults,
    total_results: heatResults.reduce((sum, h) => sum + h.athletes_count, 0),
  });
}));

// ============================================
// GET /live - 현재 진행중 대회 요약 (실시간)
// ============================================

router.get('/live', asyncHandler(async (req, res) => {
  const competitions = await pacerise.getCompetitions();
  const activeComps = competitions.filter(c => c.status === 'active');

  if (activeComps.length === 0) {
    return res.json({
      success: true,
      has_live: false,
      competitions: [],
      message: '현재 진행중인 대회가 없습니다',
    });
  }

  const liveData = [];

  for (const comp of activeComps) {
    const events = await pacerise.getEvents(comp.id);
    
    const completed = events.filter(e => e.round_status === 'completed');
    const inProgress = events.filter(e => e.round_status === 'in_progress');
    const pending = events.filter(e => e.round_status === 'heats_generated' || e.round_status === 'created');

    // 최근 완료된 종목의 결과 (최대 3개)
    const recentCompleted = completed
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);

    const recentResults = [];
    for (const event of recentCompleted) {
      try {
        const heats = await pacerise.getHeats(event.id);
        if (heats.length > 0) {
          const results = await pacerise.getResults(heats[0].id);
          if (results.length > 0) {
            // 상위 3명만
            const topResults = (event.category === 'field_distance' || event.category === 'field_height')
              ? pacerise.normalizeFieldDistanceResults(results).slice(0, 3)
              : event.category === 'road'
                ? pacerise.normalizeRoadResults(results).slice(0, 3)
                : pacerise.normalizeTrackResults(results, heats[0].wind).slice(0, 3);

            recentResults.push({
              event_name: event.name,
              gender: event.gender,
              gender_label: event.gender === 'M' ? '남자' : '여자',
              round_type: event.round_type,
              category: event.category,
              wind: heats[0].wind || null,
              top3: topResults,
            });
          }
        }
      } catch (err) {
        // 개별 종목 오류는 무시
      }
    }

    liveData.push({
      competition: {
        id: comp.id,
        name: comp.name,
        venue: comp.venue,
        start_date: comp.start_date,
        end_date: comp.end_date,
        federation: comp.federation,
        federation_label: pacerise.FEDERATION_LABELS[comp.federation] || comp.federation,
        video_url: comp.video_url || '',
      },
      progress: {
        total: events.length,
        completed: completed.length,
        in_progress: inProgress.length,
        pending: pending.length,
        percentage: events.length > 0 ? Math.round((completed.length / events.length) * 100) : 0,
      },
      current_events: inProgress.map(e => ({
        id: e.id,
        name: e.name,
        gender: e.gender === 'M' ? '남자' : '여자',
        category: e.category,
        round_type: e.round_type,
      })),
      recent_results: recentResults,
    });
  }

  res.json({
    success: true,
    has_live: true,
    competitions: liveData,
    fetched_at: new Date().toISOString(),
  });
}));

// ============================================
// 에러 핸들러
// ============================================

router.use((err, req, res, next) => {
  console.error('[PaceRise API Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'PaceRise 데이터 조회 중 오류가 발생했습니다',
    source: 'pace-rise-node.com',
  });
});

module.exports = router;
