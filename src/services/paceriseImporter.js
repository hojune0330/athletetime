/**
 * PaceRise → KAAF Raw JSON 임포터
 * 
 * pace-rise-node.com(실업육상연맹) API에서 결승 데이터를 가져와
 * KAAF raw JSON 형식으로 변환하여 data/raw/ 에 저장합니다.
 * 
 * 기존 SearchService, ResultsTab, ProfileCard 파이프라인이
 * 추가 수정 없이 PaceRise 데이터를 처리할 수 있도록 합니다.
 * 
 * 저장 규칙:
 *   - 결승(final) 데이터만 저장
 *   - 파일명: {timestamp}_pr_{대회명}_raw.json
 *   - source 태그: "pacerise"
 * 
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const prClient = require('../pacerise-client');

// 성별 코드 → 한국어
const GENDER_MAP = { M: '남자', F: '여자', X: '혼성' };

// 라운드 → 한국어
const ROUND_MAP = { final: '결승', preliminary: '예선', semifinal: '준결승' };

/**
 * 특정 대회의 결승 데이터를 가져와 KAAF raw JSON 형식으로 변환합니다.
 * 
 * @param {number} competitionId - PaceRise 대회 ID
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=false] - true면 저장 안 하고 결과만 반환
 * @returns {Promise<Object>} { success, filepath, eventCount, athleteCount, competition }
 */
async function importCompetition(competitionId, options = {}) {
  const { dryRun = false } = options;

  // 1. 대회 정보 가져오기
  const competitions = await prClient.getCompetitions();
  const comp = competitions.find(c => c.id === Number(competitionId));
  if (!comp) {
    throw new Error(`PaceRise 대회 ID ${competitionId}를 찾을 수 없습니다`);
  }

  // completed 또는 active 대회 임포트 가능 (진행 중 대회도 중간 결과 가져오기)
  if (comp.status !== 'completed' && comp.status !== 'active') {
    throw new Error(`대회 "${comp.name}"이(가) 아직 시작되지 않았습니다 (status: ${comp.status})`);
  }

  console.log(`[PaceRise Importer] 대회: ${comp.name} (ID: ${comp.id})`);

  // 2. 결승 종목만 가져오기
  const allEvents = await prClient.getEvents(competitionId);
  const finalEvents = allEvents.filter(e => e.round_type === 'final');
  console.log(`[PaceRise Importer] 전체 ${allEvents.length}개 종목 중 결승 ${finalEvents.length}개 처리`);

  // 3. 각 종목의 결과 수집
  const kaafEvents = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < finalEvents.length; i += CONCURRENCY) {
    const chunk = finalEvents.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(event => processEvent(event, comp))
    );
    chunkResults.forEach(events => {
      if (events) kaafEvents.push(...events);
    });
  }

  // 4. KAAF raw JSON 구조로 조립
  const year = comp.start_date ? comp.start_date.split('-')[0] : String(new Date().getFullYear());
  const period = formatPeriod(comp.start_date, comp.end_date);

  // 종목에 날짜가 비어있으면 대회 시작일로 채움
  kaafEvents.forEach(ev => {
    if (!ev.date && comp.start_date) {
      ev.date = comp.start_date;
    }
  });

  const rawJson = {
    meta: {
      competition_name: comp.name,
      competition: comp.name,
      year,
      period,
      date: period,
      venue: comp.venue || '',
      source_url: `https://pace-rise-node.com`,
      pacerise_id: comp.id,
      crawled_at: new Date().toISOString(),
    },
    events: kaafEvents,
  };

  // 5. 저장
  if (!dryRun) {
    const filepath = saveRawJson(rawJson, comp.name);
    const athleteCount = kaafEvents.reduce((sum, e) => sum + (e.results ? e.results.length : 0), 0);
    console.log(`[PaceRise Importer] 저장 완료: ${filepath} (${kaafEvents.length}개 종목, ${athleteCount}명)`);

    return {
      success: true,
      filepath,
      eventCount: kaafEvents.length,
      athleteCount,
      competition: comp.name,
    };
  }

  return {
    success: true,
    filepath: null,
    eventCount: kaafEvents.length,
    athleteCount: kaafEvents.reduce((sum, e) => sum + (e.results ? e.results.length : 0), 0),
    competition: comp.name,
    data: rawJson,
  };
}

/**
 * 단일 종목(Event)을 처리합니다.
 * 하나의 Event에 여러 Heat가 있을 수 있으므로 Heat별로 분리합니다.
 */
async function processEvent(event, competition) {
  try {
    const heats = await prClient.getHeats(event.id);
    if (heats.length === 0) return null;

    const results = [];

    for (const heat of heats) {
      const rawResults = await prClient.getResults(heat.id);
      if (rawResults.length === 0) continue;

      // 이벤트명 조합
      const genderLabel = GENDER_MAP[event.gender] || '';
      const roundLabel = ROUND_MAP[event.round_type] || event.round_type;
      let eventName = `${genderLabel} ${event.name} ${roundLabel}`;

      // 결승인데 heat가 여러 개면 (드문 경우) heat 번호 추가
      if (heats.length > 1) {
        eventName += ` ${heat.heat_number}조`;
      }
      eventName = eventName.trim();

      // wind 정규화: "0.3 m/s" → "0.3"
      const windStr = normalizeWind(heat.wind);

      // 결과 정규화 (카테고리별 분기)
      let normalizedResults;
      if (event.category === 'field_distance' || event.category === 'field_height') {
        normalizedResults = convertFieldResults(rawResults, event.category);
      } else {
        normalizedResults = convertTrackResults(rawResults, event.category);
      }

      results.push({
        competition: competition.name,
        event: eventName,
        date: competition.start_date || '',
        venue: competition.venue || '',
        wind: windStr,
        results: normalizedResults,
      });
    }

    return results;
  } catch (err) {
    console.error(`[PaceRise Importer] 종목 ${event.id} (${event.name}) 처리 실패:`, err.message);
    return null;
  }
}

/**
 * 트랙/릴레이 결과를 KAAF 형식으로 변환
 */
function convertTrackResults(rawResults, category) {
  // time_seconds 기준 정렬
  const valid = rawResults.filter(r => r.time_seconds !== null && r.time_seconds !== undefined);
  const sorted = valid.sort((a, b) => a.time_seconds - b.time_seconds);

  return sorted.map((r, idx) => ({
    rank: idx + 1,
    name: r.name || r.team || '', // 릴레이는 name이 없고 team만 있음
    affiliation: r.team || '',
    record: formatTrackRecord(r.time_seconds),
  }));
}

/**
 * 필드 종목 결과를 KAAF 형식으로 변환
 * PaceRise의 attempt 구조를 선수별 최고기록으로 집계
 */
function convertFieldResults(rawResults, category) {
  const athleteMap = new Map();

  rawResults.forEach(r => {
    const key = r.event_entry_id || `${r.name}_${r.team}`;
    if (!athleteMap.has(key)) {
      athleteMap.set(key, {
        name: r.name || '',
        team: r.team || '',
        best: null,
        statusCode: r.status_code || '',
      });
    }
    const athlete = athleteMap.get(key);
    const dist = r.distance_meters;
    if (dist !== null && dist !== undefined && dist > 0) {
      if (athlete.best === null || dist > athlete.best) {
        athlete.best = dist;
      }
    }
    // DNS/DNF 등 status 유지
    if (r.status_code) athlete.statusCode = r.status_code;
  });

  const sorted = Array.from(athleteMap.values())
    .sort((a, b) => (b.best || 0) - (a.best || 0));

  return sorted.map((a, idx) => ({
    rank: a.best ? idx + 1 : 0,
    name: a.name,
    affiliation: a.team,
    record: a.best ? String(a.best) : (a.statusCode || '-'),
  }));
}

/**
 * 시간(초)을 KAAF 포맷으로 변환
 * - 60초 미만: "10.81"
 * - 60초 이상: "3:52.75" (분:초.밀리초)
 */
function formatTrackRecord(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) {
    return seconds.toFixed(2);
  }
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(2);
  return `${min}:${sec.padStart(5, '0')}`;
}

/**
 * 바람 값 정규화: "0.3 m/s" → "0.3", null → ""
 */
function normalizeWind(wind) {
  if (!wind) return '';
  return String(wind).replace(/\s*m\/s\s*/i, '').trim();
}

/**
 * 기간 포맷: "2026-03-27" + "2026-03-29" → "2026-03-27 ~ 2026-03-29"
 */
function formatPeriod(start, end) {
  if (!start) return '';
  if (!end || start === end) return start;
  return `${start} ~ ${end}`;
}

/**
 * Raw JSON을 data/raw/ 디렉토리에 저장
 */
function saveRawJson(data, competitionName) {
  const rawDir = config.dirs.raw;
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = competitionName.replace(/[^가-힣a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const filename = `${timestamp}_pr_${safeName}_raw.json`;
  const filepath = path.join(rawDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return filepath;
}

/**
 * 모든 완료된 대회를 한 번에 임포트합니다.
 * 이미 임포트된 대회는 건너뜁니다.
 * 
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - true면 이미 임포트된 것도 재임포트
 * @returns {Promise<Array>} 임포트 결과 배열
 */
async function importAll(options = {}) {
  const { force = false } = options;

  const competitions = await prClient.getCompetitions();
  const completed = competitions.filter(c => c.status === 'completed');

  console.log(`[PaceRise Importer] 완료된 대회 ${completed.length}개 발견`);

  // 이미 임포트된 대회 확인
  const existingFiles = getExistingPaceriseFiles();
  const existingIds = new Set(existingFiles.map(f => f.paceriseId).filter(Boolean));

  const results = [];
  for (const comp of completed) {
    if (!force && existingIds.has(comp.id)) {
      console.log(`[PaceRise Importer] 건너뜀 (이미 존재): ${comp.name}`);
      results.push({ competition: comp.name, status: 'skipped', reason: 'already_exists' });
      continue;
    }

    try {
      const result = await importCompetition(comp.id);
      results.push({ ...result, status: 'imported' });
    } catch (err) {
      console.error(`[PaceRise Importer] 임포트 실패: ${comp.name}:`, err.message);
      results.push({ competition: comp.name, status: 'error', error: err.message });
    }
  }

  return results;
}

/**
 * 기존 PaceRise 임포트 파일 목록 조회
 */
function getExistingPaceriseFiles() {
  const rawDir = config.dirs.raw;
  if (!fs.existsSync(rawDir)) return [];

  return fs.readdirSync(rawDir)
    .filter(f => f.includes('_pr_') && f.endsWith('_raw.json'))
    .map(filename => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(rawDir, filename), 'utf-8'));
        return {
          filename,
          competition: data.meta?.competition_name || '',
          paceriseId: data.meta?.pacerise_id || null,
          year: data.meta?.year || '',
          importedAt: data.meta?.crawled_at || '',
        };
      } catch {
        return { filename, competition: '', paceriseId: null };
      }
    });
}

module.exports = {
  importCompetition,
  importAll,
  getExistingPaceriseFiles,
};
