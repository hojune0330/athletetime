/**
 * 대회 볼거리 서비스 (Competition Highlights) v2
 *
 * 야구/축구 중계 자막처럼, 대회 결과에서 "이야깃거리"를 찾아 보여준다.
 * 원칙:
 *  - AI 생성이 아닌 100% 규칙 기반. 수집된 결과 행에서만 도출한다.
 *  - 입력은 이미 노출 정책(비공개 마스킹, qualityHold)이 적용된
 *    "공개 가능한 이벤트 목록"이어야 한다. (resultEventsRoute의 mapVisibleEvent 출력)
 *  - 앞날을 점치거나 우열을 매기는 표현을 쓰지 않는다. 있었던 사실만 말한다.
 *
 * v2 추가 (역대 회차 맥락 + 형식):
 *  - 같은 대회 시리즈의 과거 회차(history)와 비교하는 하이라이트
 *  - 각 하이라이트에 stat(강조 숫자) 필드 — 중계 자막처럼 핵심 수치를 크게
 *
 * 하이라이트 유형:
 *  - record        : 한국신/대회신/부별신/대회타이 기록 등장
 *  - series_best   : 이 대회 역대 우승 기록 중 가장 빠른 기록 (다년도 비교)
 *  - streak        : 같은 선수의 연속 우승 (다년도 비교)
 *  - vs_last       : 직전 회차 우승 기록과의 차이 (다년도 비교)
 *  - photo_finish  : 1·2위 기록 차이가 근소한 트랙 승부
 *  - champion      : 종목 우승 (종목 수가 적은 로드 대회 전용)
 *  - sweep         : 같은 소속이 한 종목 1~3위를 모두 차지
 *  - multi_winner  : 한 대회에서 두 종목 이상 1위
 *  - crowd         : 참가자가 가장 많았던 종목
 */

const RECORD_LABELS = Object.freeze({
  '한국신': { title: '한국신기록', priority: 0 },
  '대회신': { title: '대회신기록', priority: 1 },
  '부별신': { title: '부별 신기록', priority: 2 },
  '대회타이': { title: '대회 타이기록', priority: 3 },
});

const MAX_HIGHLIGHTS = 8;
const PHOTO_FINISH_SPRINT_GAP = 0.05; // 초 (400m 이하급 짧은 기록)
const PHOTO_FINISH_DISTANCE_GAP = 0.3; // 초 (그 외 트랙)
const CROWD_MIN_ATHLETES = 24;
const CHAMPION_MAX_EVENTS = 6; // 종목이 이 수 이하인 대회(로드 대회)에서만 우승 하이라이트
const MAX_HISTORY_EDITIONS = 5; // 비교에 쓸 과거 회차 수

const BAD_NOTES = new Set(['불참', '기권', 'NM', '실격', '제한시간초과', 'DNS', 'DNF', 'DQ']);

// 혼성경기(10종/7종 등) 세부 종목은 한 선수가 연속 출전하므로 다관왕 집계에서 제외
const COMBINED_EVENT_PATTERN = /\(\s*(?:10종|7종|5종|혼성)\s*\)|\b(?:10종|7종|5종)경기\b/;

/** "2:05:20" | "11.20" | "4:59.78" → 초 (파싱 불가 시 null) */
function recordToSeconds(record) {
  if (!record || typeof record !== 'string') return null;
  const trimmed = record.trim();
  if (!/^[\d:.]+$/.test(trimmed)) return null;
  const parts = trimmed.split(':');
  if (parts.length > 3) return null;
  let seconds = 0;
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isFinite(value)) return null;
    seconds = seconds * 60 + value;
  }
  return seconds;
}

/** 초 차이 → 사람이 읽는 문구 ("47초", "1분 12초", "0.04초") */
function formatGap(seconds) {
  const abs = Math.abs(seconds);
  if (abs < 1) return `${abs.toFixed(2)}초`;
  if (abs < 60) return abs % 1 === 0 ? `${abs}초` : `${abs.toFixed(1)}초`;
  const minutes = Math.floor(abs / 60);
  const rest = Math.round(abs % 60);
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

/** 대회 시리즈 이름 정규화 — 연도/회차 제거 ("제42회 코오롱..." ↔ "제41회 코오롱...") */
function normalizeSeriesName(name) {
  return String(name || '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/제\s*\d+\s*회/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCleanRow(row) {
  if (!row || !row.name || !row.record) return false;
  if (row.suppressed) return false;
  if (row.note && BAD_NOTES.has(String(row.note).trim())) return false;
  return true;
}

function isEligibleEvent(event) {
  if (!event) return false;
  if (event.qualityHold) return false; // 품질 홀드 이벤트는 볼거리 계산에서 제외
  if (!Array.isArray(event.results) || event.results.length === 0) return false;
  return true;
}

function winnerOf(event) {
  if (!isEligibleEvent(event)) return null;
  return event.results.filter(isCleanRow).find((row) => Number(row.rank) === 1) || null;
}

/** 시간형 종목(작을수록 좋은 기록)인지 */
function isTimeBasedEvent(event) {
  return event.eventType === 'track' || event.eventType === 'marathon';
}

// ============================================
// 단일 회차 규칙
// ============================================

/** 신기록 하이라이트 — 같은 종목·같은 급의 신기록은 한 카드로 묶는다 */
function findRecordHighlights(events) {
  const grouped = new Map(); // `${event}|${label}` → { spec, event, rows: [] }
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    for (const row of event.results) {
      if (!isCleanRow(row)) continue;
      const label = String(row.newRecord || '').trim();
      const spec = RECORD_LABELS[label];
      if (!spec) continue;
      const key = `${event.event}|${label}`;
      if (!grouped.has(key)) grouped.set(key, { spec, event, rows: [] });
      grouped.get(key).rows.push(row);
    }
  }

  const found = [];
  for (const { spec, event, rows } of grouped.values()) {
    // 대표는 최상위 순위(보통 가장 좋은 기록)
    const lead = rows.slice().sort((a, b) => Number(a.rank || 99) - Number(b.rank || 99))[0];
    const others = rows.length - 1;
    found.push({
      type: 'record',
      priority: spec.priority,
      title: others > 0 ? `${spec.title}이 ${rows.length}명 나왔어요` : `${spec.title}이 나왔어요`,
      stat: lead.record,
      detail: `${event.event} — ${lead.name}${lead.affiliation ? ` (${lead.affiliation})` : ''}${others > 0 ? ` 외 ${others}명` : ''}`,
      eventName: event.event,
    });
  }
  return found.sort((a, b) => a.priority - b.priority);
}

/** 박빙 승부 (트랙/마라톤: 기록이 작을수록 좋은 종목만) */
function findPhotoFinishHighlights(events) {
  const found = [];
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    if (!isTimeBasedEvent(event)) continue;
    const clean = event.results.filter(isCleanRow);
    const first = clean.find((row) => Number(row.rank) === 1);
    const second = clean.find((row) => Number(row.rank) === 2);
    if (!first || !second) continue;
    const t1 = recordToSeconds(first.record);
    const t2 = recordToSeconds(second.record);
    if (t1 === null || t2 === null) continue;
    const gap = Math.abs(t2 - t1);
    const threshold = t1 <= 70 ? PHOTO_FINISH_SPRINT_GAP : PHOTO_FINISH_DISTANCE_GAP;
    if (gap > threshold) continue;
    found.push({
      type: 'photo_finish',
      priority: 4,
      title: '마지막까지 갈린 승부',
      stat: gap === 0 ? '동률' : `${formatGap(gap)} 차`,
      detail: `${event.event} — 1위 ${first.record} / 2위 ${second.record}`,
      eventName: event.event,
    });
  }
  return found;
}

/** 종목 우승 (종목 수가 적은 로드 대회 전용 — 트랙 대회에서는 스팸 방지) */
function findChampionHighlights(events) {
  const eligible = events.filter(isEligibleEvent);
  if (eligible.length === 0 || eligible.length > CHAMPION_MAX_EVENTS) return [];
  const found = [];
  for (const event of eligible) {
    const winner = winnerOf(event);
    if (!winner) continue;
    found.push({
      type: 'champion',
      priority: 4.5,
      title: `${event.event.replace(/\s*결승\s*$/, '')} 우승`,
      stat: winner.record,
      detail: `${winner.name}${winner.affiliation ? ` (${winner.affiliation})` : ''}`,
      eventName: event.event,
    });
  }
  return found;
}

/** 같은 소속 1~3위 싹쓸이 */
function findSweepHighlights(events) {
  const found = [];
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    const clean = event.results.filter(isCleanRow);
    const podium = [1, 2, 3].map((rank) => clean.find((row) => Number(row.rank) === rank));
    if (podium.some((row) => !row)) continue;
    const affiliations = podium.map((row) => String(row.affiliation || '').trim());
    if (affiliations.some((a) => !a)) continue;
    if (affiliations[0] !== affiliations[1] || affiliations[1] !== affiliations[2]) continue;
    found.push({
      type: 'sweep',
      priority: 5,
      title: '한 팀이 시상대를 채웠어요',
      stat: '1·2·3위',
      detail: `${event.event} — ${affiliations[0]} 소속이 모두 차지`,
      eventName: event.event,
    });
  }
  return found;
}

/** 한 대회 다관왕 (두 종목 이상 1위) */
function findMultiWinnerHighlights(events) {
  const winners = new Map();
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    if (COMBINED_EVENT_PATTERN.test(String(event.event || ''))) continue;
    for (const row of event.results) {
      if (!isCleanRow(row)) continue;
      if (Number(row.rank) !== 1) continue;
      const key = `${row.name}|${row.affiliation || ''}`;
      if (!winners.has(key)) {
        winners.set(key, { name: row.name, affiliation: row.affiliation || '', events: [] });
      }
      winners.get(key).events.push(event.event);
    }
  }
  const found = [];
  for (const winner of winners.values()) {
    const unique = [...new Set(winner.events)];
    if (unique.length < 2) continue;
    found.push({
      type: 'multi_winner',
      priority: 6,
      title: `${winner.name}${winner.affiliation ? ` (${winner.affiliation})` : ''}`,
      stat: `${unique.length}관왕`,
      detail: `${unique.slice(0, 3).join(', ')}${unique.length > 3 ? ' 외' : ''} 우승`,
      eventName: unique[0],
    });
  }
  return found.sort((a, b) => b.stat.localeCompare(a.stat)).slice(0, 2);
}

/** 참가자가 가장 많았던 종목 */
function findCrowdHighlight(events) {
  let biggest = null;
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    const count = event.results.filter(isCleanRow).length;
    if (count < CROWD_MIN_ATHLETES) continue;
    if (!biggest || count > biggest.count) biggest = { event, count };
  }
  if (!biggest) return [];
  return [{
    type: 'crowd',
    priority: 7,
    title: '가장 붐빈 종목',
    stat: `${biggest.count}명`,
    detail: `${biggest.event.event} — 함께 겨뤘어요`,
    eventName: biggest.event.event,
  }];
}

// ============================================
// 역대 회차 비교 규칙 (history)
// ============================================

/**
 * history: 과거 회차 배열 (최신 회차 먼저)
 *   [{ year: '2025', events: [mapVisibleEvent...] }, ...]
 * 반환: series_best / vs_last / streak 하이라이트
 */
function findHistoryHighlights(events, history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const editions = history.slice(0, MAX_HISTORY_EDITIONS);
  const found = [];

  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    const winner = winnerOf(event);
    if (!winner) continue;

    // 같은 종목의 과거 우승 기록 수집 (최신 회차 먼저)
    const pastWinners = [];
    for (const edition of editions) {
      const pastEvent = (edition.events || []).find((e) => e.event === event.event);
      const pastWinner = pastEvent ? winnerOf(pastEvent) : null;
      pastWinners.push(pastWinner ? { year: edition.year, winner: pastWinner } : null);
    }
    const known = pastWinners.filter(Boolean);
    if (known.length === 0) continue;

    // --- streak: 직전 회차부터 같은 이름+소속 연속 우승 ---
    let streak = 1;
    for (const past of pastWinners) {
      if (!past) break;
      if (past.winner.name === winner.name && (past.winner.affiliation || '') === (winner.affiliation || '')) {
        streak += 1;
      } else {
        break;
      }
    }
    if (streak >= 2) {
      found.push({
        type: 'streak',
        priority: 2.5,
        title: `${winner.name}${winner.affiliation ? ` (${winner.affiliation})` : ''}`,
        stat: `${streak}회 연속 우승`,
        detail: `${event.event} — 수집된 회차 기준`,
        eventName: event.event,
      });
    }

    // --- 시간형 종목의 기록 비교 ---
    if (!isTimeBasedEvent(event)) continue;
    const currentSeconds = recordToSeconds(winner.record);
    if (currentSeconds === null) continue;

    const pastTimes = known
      .map((past) => ({ year: past.year, seconds: recordToSeconds(past.winner.record), record: past.winner.record }))
      .filter((p) => p.seconds !== null);
    if (pastTimes.length === 0) continue;

    // series_best: 수집된 모든 회차 우승 기록보다 빠름
    const fastestPast = pastTimes.reduce((min, p) => (p.seconds < min.seconds ? p : min), pastTimes[0]);
    const isSeriesBest = currentSeconds < fastestPast.seconds;
    if (isSeriesBest && pastTimes.length >= 2) {
      found.push({
        type: 'series_best',
        priority: 1.5,
        title: '이 대회 역대 우승 기록 중 가장 빨라요',
        stat: winner.record,
        detail: `${event.event} — ${winner.name}, 종전 최고 ${fastestPast.record} (${fastestPast.year}) · 수집된 ${pastTimes.length + 1}개 회차 기준`,
        eventName: event.event,
      });
      continue; // series_best가 있으면 같은 종목 vs_last는 중복이라 생략
    }

    // vs_last: 직전 회차 우승 기록과의 차이
    const lastEdition = pastWinners.find(Boolean);
    if (!lastEdition) continue;
    const lastSeconds = recordToSeconds(lastEdition.winner.record);
    if (lastSeconds === null) continue;
    const diff = lastSeconds - currentSeconds; // 양수 = 올해가 빠름
    if (Math.abs(diff) < 0.01) continue;
    found.push({
      type: 'vs_last',
      priority: 3.5,
      title: diff > 0 ? '지난 회차 우승 기록보다 빨라졌어요' : '지난 회차 우승 기록보다 느렸어요',
      stat: `${formatGap(diff)} ${diff > 0 ? '단축' : '차이'}`,
      detail: `${event.event} — 올해 ${winner.record} / ${lastEdition.year} ${lastEdition.winner.record}`,
      eventName: event.event,
    });
  }

  return found;
}

// ============================================
// 조립
// ============================================

/**
 * 공개 가능한 이벤트 목록에서 볼거리를 도출한다.
 * @param {Array} events resultEventsRoute.mapVisibleEvent 출력 배열 (마스킹/홀드 적용 완료)
 * @param {Object} [options]
 * @param {Array}  [options.history] 같은 대회 시리즈 과거 회차 (최신 먼저):
 *                 [{ year, events: [mapVisibleEvent...] }]
 * @returns {Array<{type,title,stat,detail,eventName}>} 우선순위 정렬, 최대 MAX_HIGHLIGHTS개
 */
function buildCompetitionHighlights(events, options = {}) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const primary = [
    ...findRecordHighlights(events),
    ...findHistoryHighlights(events, options.history),
    ...findPhotoFinishHighlights(events),
    ...findSweepHighlights(events),
    ...findMultiWinnerHighlights(events),
    ...findCrowdHighlight(events),
  ];

  // champion(우승 요약)은 보조 카드 — 이미 다른 이야깃거리가 있는 종목은 생략
  const coveredEvents = new Set(primary.map((h) => h.eventName));
  const champions = findChampionHighlights(events).filter((h) => !coveredEvents.has(h.eventName));

  return [...primary, ...champions]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_HIGHLIGHTS)
    .map(({ type, title, stat, detail, eventName }) => ({ type, title, stat, detail, eventName }));
}

module.exports = {
  buildCompetitionHighlights,
  recordToSeconds,
  normalizeSeriesName,
  formatGap,
  MAX_HIGHLIGHTS,
};
