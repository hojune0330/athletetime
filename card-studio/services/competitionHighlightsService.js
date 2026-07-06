/**
 * 대회 볼거리 서비스 (Competition Highlights)
 *
 * 야구/축구 중계 자막처럼, 대회 결과에서 "이야깃거리"를 찾아 보여준다.
 * 원칙:
 *  - AI 생성이 아닌 100% 규칙 기반. 수집된 결과 행에서만 도출한다.
 *  - 입력은 이미 노출 정책(비공개 마스킹, qualityHold)이 적용된
 *    "공개 가능한 이벤트 목록"이어야 한다. (resultEventsRoute의 mapVisibleEvent 출력)
 *  - 앞날을 점치거나 우열을 매기는 표현을 쓰지 않는다. 있었던 사실만 말한다.
 *
 * 하이라이트 유형:
 *  - record        : 한국신/대회신/부별신/대회타이 기록 등장
 *  - photo_finish  : 1·2위 기록 차이가 근소한 트랙 승부
 *  - sweep         : 같은 소속이 한 종목 1~3위를 모두 차지
 *  - multi_winner  : 한 대회에서 두 종목 이상 1위
 *  - crowd         : 참가자가 가장 많았던 종목
 */

const RECORD_LABELS = Object.freeze({
  '한국신': { title: '한국신기록이 나왔어요', priority: 0 },
  '대회신': { title: '대회신기록이 나왔어요', priority: 1 },
  '부별신': { title: '부별 신기록이 나왔어요', priority: 2 },
  '대회타이': { title: '대회 타이기록이 나왔어요', priority: 3 },
});

const MAX_HIGHLIGHTS = 6;
const PHOTO_FINISH_SPRINT_GAP = 0.05; // 초 (400m 이하급 짧은 기록)
const PHOTO_FINISH_DISTANCE_GAP = 0.3; // 초 (그 외 트랙)
const CROWD_MIN_ATHLETES = 24;

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

/** 신기록 하이라이트 */
function findRecordHighlights(events) {
  const found = [];
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    for (const row of event.results) {
      if (!isCleanRow(row)) continue;
      const label = String(row.newRecord || '').trim();
      const spec = RECORD_LABELS[label];
      if (!spec) continue;
      found.push({
        type: 'record',
        priority: spec.priority,
        title: spec.title,
        detail: `${event.event} — ${row.name}${row.affiliation ? ` (${row.affiliation})` : ''} ${row.record}`,
        eventName: event.event,
      });
    }
  }
  // 한국신 > 대회신 > 부별신 > 타이 순으로, 같은 급이면 앞선 종목 순
  return found.sort((a, b) => a.priority - b.priority);
}

/** 박빙 승부 (트랙/마라톤: 기록이 작을수록 좋은 종목만) */
function findPhotoFinishHighlights(events) {
  const found = [];
  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    if (event.eventType !== 'track' && event.eventType !== 'marathon') continue;
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
    const gapLabel = gap === 0 ? '기록상 동률' : `${gap.toFixed(2)}초 차이`;
    found.push({
      type: 'photo_finish',
      priority: 4,
      title: '마지막까지 갈린 승부',
      detail: `${event.event} — 1·2위가 ${gapLabel} (${first.record} / ${second.record})`,
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
      detail: `${event.event} — ${affiliations[0]} 소속이 1·2·3위 모두 차지`,
      eventName: event.event,
    });
  }
  return found;
}

/** 한 대회 다관왕 (두 종목 이상 1위) */
function findMultiWinnerHighlights(events) {
  const winners = new Map(); // key: name|affiliation → { name, affiliation, events: [] }
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
      title: `${unique.length}관왕이 나왔어요`,
      detail: `${winner.name}${winner.affiliation ? ` (${winner.affiliation})` : ''} — ${unique.slice(0, 3).join(', ')}${unique.length > 3 ? ' 외' : ''}`,
      eventName: unique[0],
    });
  }
  return found.sort((a, b) => b.detail.length - a.detail.length).slice(0, 2);
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
    detail: `${biggest.event.event} — ${biggest.count}명이 함께 겨뤘어요`,
    eventName: biggest.event.event,
  }];
}

/**
 * 공개 가능한 이벤트 목록에서 볼거리를 도출한다.
 * @param {Array} events resultEventsRoute.mapVisibleEvent 출력 배열 (마스킹/홀드 적용 완료)
 * @returns {Array<{type,title,detail,eventName}>} 우선순위 정렬, 최대 MAX_HIGHLIGHTS개
 */
function buildCompetitionHighlights(events) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const all = [
    ...findRecordHighlights(events),
    ...findPhotoFinishHighlights(events),
    ...findSweepHighlights(events),
    ...findMultiWinnerHighlights(events),
    ...findCrowdHighlight(events),
  ];

  return all
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_HIGHLIGHTS)
    .map(({ type, title, detail, eventName }) => ({ type, title, detail, eventName }));
}

module.exports = {
  buildCompetitionHighlights,
  recordToSeconds,
  MAX_HIGHLIGHTS,
};
