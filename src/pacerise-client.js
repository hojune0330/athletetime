/**
 * PaceRise 연동 클라이언트
 * 
 * pace-rise-node.com (실업육상연맹 오퍼레이터 시스템) API 클라이언트
 * 
 * ═══════════════════════════════════════════════════════════════
 * 
 * 지원 API 엔드포인트:
 *   GET /api/competitions          → 대회 목록
 *   GET /api/events?competition_id → 종목 목록 (조편성, 라운드 포함)
 *   GET /api/heats?event_id        → 조(heat) 목록
 *   GET /api/results?heat_id       → 경기 결과
 *   GET /api/athletes?competition_id → 선수 목록
 * 
 * 데이터 흐름:
 *   Competition → Events → Heats → Results
 *                                    └→ Athletes
 * 
 * 카테고리 분류:
 *   track          : 트랙 종목 (100m, 200m, 400m, 800m, ...)
 *   field_distance : 필드 거리 종목 (멀리뛰기, 세단뛰기, 투척)
 *   field_height   : 필드 높이 종목 (높이뛰기, 장대높이뛰기)
 *   relay          : 릴레이 (4x100m, 4x400m)
 *   combined       : 복합 종목 (10종, 7종)
 *   road           : 도로 종목 (마라톤, 10K 등)
 * 
 * ═══════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');

const PACERISE_BASE_URL = process.env.PACERISE_URL || 'https://pace-rise-node.com';
const REQUEST_TIMEOUT = 15000; // 15초
const CACHE_TTL = 60 * 1000;  // 1분 캐시

// ============================================
// 인메모리 캐시
// ============================================

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
  cache.clear();
}

// ============================================
// HTTP 클라이언트
// ============================================

/**
 * PaceRise API GET 요청
 * @param {string} endpoint - API 경로 (예: /api/competitions)
 * @param {Object} [params] - 쿼리 파라미터
 * @returns {Promise<any>} JSON 응답
 */
async function apiGet(endpoint, params = {}) {
  const url = new URL(endpoint, PACERISE_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const cacheKey = url.toString();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(url.toString(), {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AthleTime/4.0 (integration)',
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`PaceRise API ${res.statusCode}: ${body.substring(0, 200)}`));
            return;
          }
          const data = JSON.parse(body);
          setCache(cacheKey, data);
          resolve(data);
        } catch (e) {
          reject(new Error(`PaceRise API 파싱 오류: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`PaceRise 연결 오류: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('PaceRise API 타임아웃'));
    });
  });
}

// ============================================
// 대회 API
// ============================================

/**
 * 전체 대회 목록 조회
 * @returns {Promise<Array>} 대회 목록
 */
async function getCompetitions() {
  const data = await apiGet('/api/competitions');
  return Array.isArray(data) ? data : [];
}

/**
 * 특정 대회의 종목 목록 조회
 * @param {number} competitionId
 * @returns {Promise<Array>} 종목 목록
 */
async function getEvents(competitionId) {
  const data = await apiGet('/api/events', { competition_id: competitionId });
  return Array.isArray(data) ? data : [];
}

/**
 * 특정 종목의 heat(조) 목록 조회
 * @param {number} eventId
 * @returns {Promise<Array>} heat 목록
 */
async function getHeats(eventId) {
  const data = await apiGet('/api/heats', { event_id: eventId });
  return Array.isArray(data) ? data : [];
}

/**
 * 특정 heat의 경기 결과 조회
 * @param {number} heatId
 * @returns {Promise<Array>} 결과 목록
 */
async function getResults(heatId) {
  const data = await apiGet('/api/results', { heat_id: heatId });
  return Array.isArray(data) ? data : [];
}

/**
 * 특정 대회의 선수 목록 조회
 * @param {number} competitionId
 * @returns {Promise<Array>} 선수 목록
 */
async function getAthletes(competitionId) {
  const data = await apiGet('/api/athletes', { competition_id: competitionId });
  return Array.isArray(data) ? data : [];
}

// ============================================
// 데이터 정규화 유틸리티
// ============================================

/** 연맹 코드 → 한국어 라벨 */
const FEDERATION_LABELS = {
  'KTFL': '한국실업육상연맹',
  'KUAF': '한국대학육상연맹',
  '': '기타',
};

/** 카테고리 코드 → 한국어 라벨 */
const CATEGORY_LABELS = {
  'track': '트랙',
  'field_distance': '필드(거리)',
  'field_height': '필드(높이)',
  'relay': '릴레이',
  'combined': '복합',
  'road': '도로',
};

/** 라운드 상태 → 한국어 */
const STATUS_LABELS = {
  'completed': '완료',
  'in_progress': '진행중',
  'heats_generated': '조편성완료',
  'created': '생성됨',
  'active': '진행중',
};

/** 라운드 타입 → 한국어 */
const ROUND_LABELS = {
  'preliminary': '예선',
  'final': '결승',
  'semifinal': '준결승',
};

/**
 * 트랙 기록 포맷팅 (초 → 표시형식)
 * @param {number|null} seconds
 * @param {string} category
 * @returns {string}
 */
function formatRecord(seconds, category) {
  if (seconds === null || seconds === undefined) return '-';
  
  if (category === 'road') {
    // 도로 종목: H:MM:SS
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  
  if (category === 'field_distance' || category === 'field_height') {
    // 필드 종목: 거리(m)
    if (seconds === 0) return 'X'; // 파울
    return `${seconds}m`;
  }
  
  // 트랙 종목
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2);
    return `${m}:${s.padStart(5, '0')}`;
  }
  return seconds.toFixed(2);
}

/**
 * 필드 거리 종목 결과 정규화 (attempt별 → 선수별 최고기록)
 * @param {Array} rawResults - PaceRise 원본 results (attempt 포함)
 * @returns {Array} 선수별 정규화된 결과
 */
function normalizeFieldDistanceResults(rawResults) {
  const athleteMap = new Map();

  rawResults.forEach(r => {
    const key = r.event_entry_id;
    if (!athleteMap.has(key)) {
      athleteMap.set(key, {
        event_entry_id: key,
        name: r.name,
        bib_number: r.bib_number,
        team: r.team,
        remark: r.remark || '',
        status_code: r.status_code || '',
        attempts: [],
        best: null,
        bestWind: null,
      });
    }
    const athlete = athleteMap.get(key);
    const dist = r.distance_meters;
    athlete.attempts.push({
      attempt: r.attempt_number,
      distance: dist,
      wind: r.wind,
      isFoul: dist === 0 || dist === null,
    });
    // 최고 기록 업데이트
    if (dist !== null && dist > 0 && (athlete.best === null || dist > athlete.best)) {
      athlete.best = dist;
      athlete.bestWind = r.wind;
    }
  });

  // 최고 기록순 정렬
  const sorted = Array.from(athleteMap.values())
    .sort((a, b) => (b.best || 0) - (a.best || 0));

  return sorted.map((a, idx) => ({
    rank: idx + 1,
    name: a.name,
    bib_number: a.bib_number,
    team: a.team,
    record: a.best ? `${a.best}m` : '-',
    record_raw: a.best,
    wind: a.bestWind ? `${a.bestWind}` : null,
    remark: a.remark,
    status_code: a.status_code,
    attempts: a.attempts,
  }));
}

/**
 * 트랙/릴레이 결과 정규화
 * @param {Array} rawResults
 * @param {string} wind - heat 풍속
 * @returns {Array}
 */
function normalizeTrackResults(rawResults, wind) {
  const sorted = rawResults
    .filter(r => r.time_seconds !== null)
    .sort((a, b) => a.time_seconds - b.time_seconds);

  return sorted.map((r, idx) => ({
    rank: idx + 1,
    name: r.name,
    bib_number: r.bib_number,
    team: r.team,
    record: formatRecord(r.time_seconds, 'track'),
    record_raw: r.time_seconds,
    wind: wind || null,
    remark: r.remark || '',
    status_code: r.status_code || '',
  }));
}

/**
 * 도로 종목 결과 정규화
 * @param {Array} rawResults
 * @returns {Array}
 */
function normalizeRoadResults(rawResults) {
  const sorted = rawResults
    .filter(r => r.time_seconds !== null)
    .sort((a, b) => a.time_seconds - b.time_seconds);

  return sorted.map((r, idx) => ({
    rank: idx + 1,
    name: r.name,
    bib_number: r.bib_number,
    team: r.team,
    record: formatRecord(r.time_seconds, 'road'),
    record_raw: r.time_seconds,
    wind: null,
    remark: r.remark || '',
    status_code: r.status_code || '',
  }));
}

// ============================================
// 고수준 통합 함수
// ============================================

/**
 * 대회 전체 결과를 종합적으로 가져옵니다.
 * Competition → Events (결승만) → Heats → Results 순회
 * 
 * @param {number} competitionId
 * @param {Object} [options]
 * @param {boolean} [options.finalsOnly=false] - 결승만 가져올지
 * @param {string} [options.category] - 특정 카테고리만
 * @param {string} [options.gender] - 특정 성별만 (M/F)
 * @param {string} [options.status] - 특정 상태만 (completed/in_progress)
 * @returns {Promise<Object>} 정규화된 대회 결과
 */
async function getCompetitionResults(competitionId, options = {}) {
  const { finalsOnly = false, category, gender, status } = options;

  // 1. 대회 정보 가져오기
  const competitions = await getCompetitions();
  const competition = competitions.find(c => c.id === Number(competitionId));
  if (!competition) {
    throw new Error(`대회 ID ${competitionId}를 찾을 수 없습니다`);
  }

  // 2. 종목 목록
  let events = await getEvents(competitionId);
  
  if (finalsOnly) events = events.filter(e => e.round_type === 'final');
  if (category) events = events.filter(e => e.category === category);
  if (gender) events = events.filter(e => e.gender === gender);
  if (status) events = events.filter(e => e.round_status === status);

  // 3. 각 종목별 결과 수집 (병렬 처리, 동시 5개 제한)
  const CONCURRENCY = 5;
  const eventResults = [];

  // 종목을 CONCURRENCY 단위의 청크로 분할하여 병렬 처리
  for (let i = 0; i < events.length; i += CONCURRENCY) {
    const chunk = events.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (event) => {
        try {
          const heats = await getHeats(event.id);
          const heatResults = [];
          
          for (const heat of heats) {
            const rawResults = await getResults(heat.id);
            if (rawResults.length === 0) continue;

            let normalizedResults;
            if (event.category === 'field_distance' || event.category === 'field_height') {
              normalizedResults = normalizeFieldDistanceResults(rawResults);
            } else if (event.category === 'road') {
              normalizedResults = normalizeRoadResults(rawResults);
            } else {
              normalizedResults = normalizeTrackResults(rawResults, heat.wind);
            }

            heatResults.push({
              event_id: event.id,
              event_name: event.name,
              category: event.category,
              category_label: CATEGORY_LABELS[event.category] || event.category,
              gender: event.gender,
              round_type: event.round_type,
              round_label: ROUND_LABELS[event.round_type] || event.round_type,
              round_status: event.round_status,
              status_label: STATUS_LABELS[event.round_status] || event.round_status,
              heat_number: heat.heat_number,
              heat_name: heat.heat_name || heat.scoreboard_key || '',
              wind: heat.wind || null,
              video_url: event.video_url || '',
              memo: event.callroom_event_memo || '',
              results: normalizedResults,
              athletes_count: normalizedResults.length,
            });
          }
          return heatResults;
        } catch (err) {
          console.error(`[PaceRise] 종목 ${event.id} (${event.name}) 결과 수집 실패:`, err.message);
          return [];
        }
      })
    );
    chunkResults.forEach(results => eventResults.push(...results));
  }

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      start_date: competition.start_date,
      end_date: competition.end_date,
      venue: competition.venue,
      status: competition.status,
      status_label: STATUS_LABELS[competition.status] || competition.status,
      federation: competition.federation,
      federation_label: FEDERATION_LABELS[competition.federation] || competition.federation,
      video_url: competition.video_url || '',
    },
    events: eventResults,
    summary: {
      total_events: eventResults.length,
      total_athletes: eventResults.reduce((sum, e) => sum + e.athletes_count, 0),
      by_category: eventResults.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {}),
      by_status: eventResults.reduce((acc, e) => {
        acc[e.round_status] = (acc[e.round_status] || 0) + 1;
        return acc;
      }, {}),
    },
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 대회의 시간표/일정을 종목 memo(callroom_event_memo)에서 추출합니다.
 * PaceRise에는 별도 시간표 API가 없으므로, 종목 memo에서 시간 정보를 파싱합니다.
 * 
 * @param {number} competitionId
 * @returns {Promise<Object>} 시간표 데이터
 */
async function getCompetitionSchedule(competitionId) {
  const competitions = await getCompetitions();
  const competition = competitions.find(c => c.id === Number(competitionId));
  if (!competition) {
    throw new Error(`대회 ID ${competitionId}를 찾을 수 없습니다`);
  }

  const events = await getEvents(competitionId);
  
  // 시간표 구성: 종목 memo에서 시간 추출
  const schedule = [];
  const dateGroups = {};

  events.forEach(event => {
    const memo = event.callroom_event_memo || '';
    
    // "남자실업부  10시 20분" or "여자실업부  14시 40분" 등의 패턴
    const timeMatch = memo.match(/(\d{1,2})\s*시\s*(\d{1,2})\s*분/);
    const divMatch = memo.match(/(남자|여자)(실업부|대학부|고등부|중학부)?/);
    
    let scheduledTime = null;
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const mins = parseInt(timeMatch[2]);
      scheduledTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    const entry = {
      event_id: event.id,
      event_name: event.name,
      category: event.category,
      category_label: CATEGORY_LABELS[event.category] || event.category,
      gender: event.gender,
      gender_label: event.gender === 'M' ? '남자' : '여자',
      round_type: event.round_type,
      round_label: ROUND_LABELS[event.round_type] || event.round_type,
      round_status: event.round_status,
      status_label: STATUS_LABELS[event.round_status] || event.round_status,
      scheduled_time: scheduledTime,
      memo: memo,
      division: divMatch ? (divMatch[1] + (divMatch[2] || '')) : '',
      heat_count: event.heat_count,
      video_url: event.video_url || '',
      created_at: event.created_at,
    };

    schedule.push(entry);

    // 날짜별 그룹 (created_at 기준 - 대회 날짜와 매칭)
    const dateKey = event.created_at ? event.created_at.split(' ')[0] : 'unknown';
    if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
    dateGroups[dateKey].push(entry);
  });

  // 시간순 정렬
  schedule.sort((a, b) => {
    if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
    if (a.scheduled_time) return -1;
    if (b.scheduled_time) return 1;
    return (a.event_name || '').localeCompare(b.event_name || '');
  });

  // 각 날짜별도 정렬
  Object.keys(dateGroups).forEach(date => {
    dateGroups[date].sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      return 0;
    });
  });

  // 카테고리별 그룹 (날짜가 모두 동일할 때 대체 뷰 제공)
  const categoryGroups = {};
  const CATEGORY_ORDER = ['track', 'field_distance', 'field_height', 'relay', 'combined', 'road'];
  schedule.forEach(entry => {
    const key = entry.category;
    if (!categoryGroups[key]) categoryGroups[key] = [];
    categoryGroups[key].push(entry);
  });

  // 카테고리 내부 정렬: 이름 → 성별 → 라운드
  Object.values(categoryGroups).forEach(entries => {
    entries.sort((a, b) => {
      const nameComp = (a.event_name || '').localeCompare(b.event_name || '');
      if (nameComp !== 0) return nameComp;
      if (a.gender !== b.gender) return a.gender === 'M' ? -1 : 1;
      const roundOrder = { preliminary: 0, semifinal: 1, final: 2 };
      return (roundOrder[a.round_type] || 0) - (roundOrder[b.round_type] || 0);
    });
  });

  // 날짜가 한 개뿐인지 확인 → 프론트엔드에서 뷰 전환 기준
  const uniqueDates = Object.keys(dateGroups);
  const hasMultipleDates = uniqueDates.length > 1;

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      start_date: competition.start_date,
      end_date: competition.end_date,
      venue: competition.venue,
      status: competition.status,
      federation: competition.federation,
    },
    schedule,
    by_date: dateGroups,
    by_category: categoryGroups,
    has_multiple_dates: hasMultipleDates,
    total_events: schedule.length,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 대회의 선수 명단을 가져옵니다.
 * @param {number} competitionId
 * @returns {Promise<Object>} 정규화된 선수 명단
 */
async function getCompetitionAthletes(competitionId) {
  const competitions = await getCompetitions();
  const competition = competitions.find(c => c.id === Number(competitionId));
  if (!competition) {
    throw new Error(`대회 ID ${competitionId}를 찾을 수 없습니다`);
  }

  const athletes = await getAthletes(competitionId);
  
  // 팀(단체) 엔트리와 개인 선수 분리
  // bib_number가 null이고 name === team인 경우 팀 엔트리
  const individuals = [];
  const teams = new Set();

  athletes.forEach(a => {
    if (!a.bib_number && a.name === a.team) {
      teams.add(a.name);
    } else {
      individuals.push({
        id: a.id,
        name: a.name,
        bib_number: a.bib_number,
        team: a.team,
        gender: a.gender,
        gender_label: a.gender === 'M' ? '남자' : '여자',
        barcode: a.barcode || '',
        personal_best: a.personal_best || '',
      });
    }
  });

  // 팀별 그룹
  const byTeam = {};
  individuals.forEach(a => {
    if (!byTeam[a.team]) byTeam[a.team] = [];
    byTeam[a.team].push(a);
  });

  // 팀 목록: by_team 키(실제 선수가 있는 팀)를 기준으로 생성
  const allTeamNames = Object.keys(byTeam).sort();

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      venue: competition.venue,
      federation: competition.federation,
    },
    athletes: individuals,
    teams: allTeamNames,
    by_team: byTeam,
    total_athletes: individuals.length,
    total_teams: allTeamNames.length,
    fetched_at: new Date().toISOString(),
  };
}

// ============================================
// 건강 체크
// ============================================

/**
 * PaceRise 서버 연결 상태 확인
 * @returns {Promise<Object>}
 */
async function healthCheck() {
  try {
    const start = Date.now();
    const competitions = await apiGet('/api/competitions');
    const latency = Date.now() - start;
    return {
      status: 'connected',
      latency_ms: latency,
      competitions_count: Array.isArray(competitions) ? competitions.length : 0,
      base_url: PACERISE_BASE_URL,
      checked_at: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message,
      base_url: PACERISE_BASE_URL,
      checked_at: new Date().toISOString(),
    };
  }
}

// ============================================
// 모듈 내보내기
// ============================================

module.exports = {
  // 저수준 API
  getCompetitions,
  getEvents,
  getHeats,
  getResults,
  getAthletes,
  
  // 고수준 통합
  getCompetitionResults,
  getCompetitionSchedule,
  getCompetitionAthletes,
  
  // 유틸리티
  formatRecord,
  normalizeFieldDistanceResults,
  normalizeTrackResults,
  normalizeRoadResults,
  clearCache,
  healthCheck,
  
  // 상수
  FEDERATION_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  ROUND_LABELS,
};
