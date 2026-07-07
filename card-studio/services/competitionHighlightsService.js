/**
 * 대회 볼거리 서비스 (Competition Highlights) v3
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
 * v3 추가 (국제부/국내부 구분):
 *  - 한국 국제 마라톤은 외국 초청 선수(소속=국가명)와 국내 선수가 한 종목에
 *    섞여 있다. 국내 육상 팬 관점에서는 "국내부 1위"가 별도의 이야깃거리다.
 *  - 소속이 국가명인 행을 국제부 선수로 판별하고, 국제 필드가 있는 종목에서는
 *    국내부 1위 카드 + 국내부 기준 역대 비교(series_best/streak/vs_last)를 따로 만든다.
 *
 * 하이라이트 유형:
 *  - record            : 한국신/대회신/부별신/대회타이 기록 등장
 *  - series_best       : 이 대회 역대 우승 기록 중 가장 빠른 기록 (다년도 비교, 국내부 변형 포함)
 *  - domestic_champion : 국제 필드가 섞인 종목의 국내부 1위
 *  - streak            : 같은 선수의 연속 우승 (다년도 비교, 국내부 변형 포함)
 *  - vs_last           : 직전 회차 우승 기록과의 차이 (다년도 비교, 국내부 변형 포함)
 *  - photo_finish      : 1·2위 기록 차이가 근소한 트랙 승부
 *  - champion          : 종목 우승 (종목 수가 적은 로드 대회 전용)
 *  - sweep             : 같은 소속이 한 종목 1~3위를 모두 차지
 *  - multi_winner      : 한 대회에서 두 종목 이상 1위
 *  - crowd             : 참가자가 가장 많았던 종목
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

// ============================================
// 국제부/국내부 판별
// ============================================
// 한국 국제 마라톤에서 외국 초청 선수는 소속(affiliation)이 국가명으로 수집된다.
// 수집 데이터 전수 조사에서 실제로 등장한 국가명 + 표기 변형을 명시적으로 나열한다.
const COUNTRY_AFFILIATIONS = new Set([
  '케냐', '에티오피아', '몽골', '모로코', '일본', '우간다', '중국', '바레인',
  '홍콩', '홍콩차이나', '에리트레아', '라트비아', '탄자니아', '타이페이(대만)', '대만',
  '미국', '레소토', '우크라이나', '오스트레일리아', '호주', '인도', '나미비아',
  '루마니아', '미얀마', '우즈베키스탄', '튀르키예', '터키', '인도네시아', '뉴질랜드',
  '노르웨이', '페루', '캐나다', '멕시코', '브라질', '네덜란드', '아일랜드', '폴란드',
  '리투아니아', '르완다', '잠비아', '싱가포르', '스위스', '키르키즈스탄', '키르기스스탄',
  '오스트리아', '스웨덴', '조지아', '이스라엘', '프랑스', '독일', '영국', '스페인',
  '이탈리아', '러시아', '벨라루스', '카자흐스탄', '북한', '태국', '베트남', '필리핀',
  '말레이시아', '캄보디아', '라오스', '네팔', '스리랑카', '방글라데시', '파키스탄',
  '이란', '이라크', '사우디아라비아', '카타르', '아랍에미리트', '요르단', '시리아',
  '남아프리카공화국', '나이지리아', '가나', '세네갈', '알제리', '튀니지', '이집트',
  '지부티', '소말리아', '부룬디', '짐바브웨', '보츠와나', '말라위', '모잠비크',
  '앙골라', '콩고', '카메룬', '코트디부아르', '핀란드', '덴마크', '벨기에', '포르투갈',
  '체코', '슬로바키아', '헝가리', '불가리아', '세르비아', '크로아티아', '슬로베니아',
  '에스토니아', '몰도바', '아르헨티나', '칠레', '콜롬비아', '에콰도르', '볼리비아',
  '우루과이', '파라과이', '베네수엘라', '쿠바', '자메이카', '바하마', '트리니다드토바고',
]);

/**
 * 국제부(외국 초청) 선수 행인지 판별.
 * 소속이 국가명이거나 "케냐-코오롱"처럼 국가명으로 시작하는 혼합 표기면 국제부로 본다.
 */
function isInternationalRow(row) {
  const affiliation = String((row && row.affiliation) || '').trim();
  if (!affiliation) return false;
  if (COUNTRY_AFFILIATIONS.has(affiliation)) return true;
  const head = affiliation.split('-')[0].trim();
  return head !== affiliation && COUNTRY_AFFILIATIONS.has(head);
}

/** 국제부/국내부가 한 종목에 섞여 있는지 (국제 선수 1명 이상 + 국내 선수 1명 이상) */
function hasInternationalField(event) {
  if (!isEligibleEvent(event)) return false;
  let intl = false;
  let domestic = false;
  for (const row of event.results) {
    if (!isCleanRow(row)) continue;
    if (isInternationalRow(row)) intl = true;
    else domestic = true;
    if (intl && domestic) return true;
  }
  return false;
}

/** 국내부 1위 (순위가 가장 높은 국내 선수) */
function domesticWinnerOf(event) {
  if (!isEligibleEvent(event)) return null;
  const domestic = event.results
    .filter(isCleanRow)
    .filter((row) => !isInternationalRow(row) && Number.isFinite(Number(row.rank)))
    .sort((a, b) => Number(a.rank) - Number(b.rank));
  return domestic[0] || null;
}

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

const DOMESTIC_CHAMPION_MAX = 4; // 국제 종목이 많은 트랙 대회에서 국내부 카드 스팸 방지

/**
 * 국제 필드가 섞인 종목의 국내부 1위 카드.
 * 외국 선수가 우승해 전체 1위와 국내부 1위가 다른 경우에만 만든다.
 * (국내 선수가 전체 1위면 우승 자체가 이야기이므로 별도 카드는 중복)
 */
function findDomesticChampionHighlights(events) {
  const found = [];
  for (const event of events) {
    if (!hasInternationalField(event)) continue;
    const overall = winnerOf(event);
    const domestic = domesticWinnerOf(event);
    if (!domestic) continue;
    if (overall && overall.name === domestic.name && (overall.affiliation || '') === (domestic.affiliation || '')) {
      continue; // 국내 선수가 전체 우승 — 국내부 카드 불필요
    }
    const overallRank = Number(domestic.rank);
    found.push({
      type: 'domestic_champion',
      priority: 2.2,
      title: `${domestic.name}${domestic.affiliation ? ` (${domestic.affiliation})` : ''}`,
      stat: domestic.record,
      detail: `${event.event} 국내부 1위${Number.isFinite(overallRank) && overallRank > 1 ? ` — 전체 ${overallRank}위` : ''}`,
      eventName: event.event,
    });
  }
  // 전체 순위가 높은(외국 우승자 바로 뒤까지 따라붙은) 국내 선수부터
  return found
    .sort((a, b) => {
      const rankOf = (h) => {
        const match = h.detail.match(/전체 (\d+)위/);
        return match ? Number(match[1]) : 99;
      };
      return rankOf(a) - rankOf(b);
    })
    .slice(0, DOMESTIC_CHAMPION_MAX);
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
 * 한 종목의 역대 회차 비교 (범위 공통 로직)
 * scope: { label: '' | ' 국내부', pick: (event) => winnerRow|null }
 */
function compareEventWithHistory(event, editions, scope, found) {
  const winner = scope.pick(event);
  if (!winner) return;

  // 같은 종목의 과거 우승 기록 수집 (최신 회차 먼저)
  const pastWinners = [];
  for (const edition of editions) {
    const pastEvent = (edition.events || []).find((e) => e.event === event.event);
    const pastWinner = pastEvent ? scope.pick(pastEvent) : null;
    pastWinners.push(pastWinner ? { year: edition.year, winner: pastWinner } : null);
  }
  const known = pastWinners.filter(Boolean);
  if (known.length === 0) return;

  const scopeSuffix = scope.label; // '' 또는 ' 국내부'

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
      stat: `${streak}회 연속${scopeSuffix ? ' 국내부' : ''} 우승`,
      detail: `${event.event}${scopeSuffix} — 수집된 회차 기준`,
      eventName: event.event,
    });
  }

  // --- 시간형 종목의 기록 비교 ---
  if (!isTimeBasedEvent(event)) return;
  const currentSeconds = recordToSeconds(winner.record);
  if (currentSeconds === null) return;

  const pastTimes = known
    .map((past) => ({ year: past.year, seconds: recordToSeconds(past.winner.record), record: past.winner.record }))
    .filter((p) => p.seconds !== null);
  if (pastTimes.length === 0) return;

  // series_best: 수집된 모든 회차 우승 기록보다 빠름
  const fastestPast = pastTimes.reduce((min, p) => (p.seconds < min.seconds ? p : min), pastTimes[0]);
  const isSeriesBest = currentSeconds < fastestPast.seconds;
  if (isSeriesBest && pastTimes.length >= 2) {
    found.push({
      type: 'series_best',
      priority: scopeSuffix ? 1.7 : 1.5,
      title: scopeSuffix
        ? '이 대회 역대 국내부 1위 기록 중 가장 빨라요'
        : '이 대회 역대 우승 기록 중 가장 빨라요',
      stat: winner.record,
      detail: `${event.event}${scopeSuffix} — ${winner.name}, 종전 최고 ${fastestPast.record} (${fastestPast.year}) · 수집된 ${pastTimes.length + 1}개 회차 기준`,
      eventName: event.event,
    });
    return; // series_best가 있으면 같은 범위 vs_last는 중복이라 생략
  }

  // vs_last: 직전 회차 우승 기록과의 차이
  const lastEdition = pastWinners.find(Boolean);
  if (!lastEdition) return;
  const lastSeconds = recordToSeconds(lastEdition.winner.record);
  if (lastSeconds === null) return;
  const diff = lastSeconds - currentSeconds; // 양수 = 올해가 빠름
  if (Math.abs(diff) < 0.01) return;
  found.push({
    type: 'vs_last',
    priority: scopeSuffix ? 3.7 : 3.5,
    title: diff > 0
      ? `지난 회차${scopeSuffix ? ' 국내부 1위' : ' 우승'} 기록보다 빨라졌어요`
      : `지난 회차${scopeSuffix ? ' 국내부 1위' : ' 우승'} 기록보다 느렸어요`,
    stat: `${formatGap(diff)} ${diff > 0 ? '단축' : '차이'}`,
    detail: `${event.event}${scopeSuffix} — 올해 ${winner.record} / ${lastEdition.year} ${lastEdition.winner.record}`,
    eventName: event.event,
  });
}

/**
 * history: 과거 회차 배열 (최신 회차 먼저)
 *   [{ year: '2025', events: [mapVisibleEvent...] }, ...]
 * 반환: series_best / vs_last / streak 하이라이트
 *  - 전체 기준 비교는 항상 수행
 *  - 국제 필드가 섞인 종목은 국내부 기준 비교를 추가 수행
 */
function findHistoryHighlights(events, history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const editions = history.slice(0, MAX_HISTORY_EDITIONS);
  const found = [];

  const overallScope = { label: '', pick: winnerOf };
  const domesticScope = { label: ' 국내부', pick: domesticWinnerOf };

  for (const event of events) {
    if (!isEligibleEvent(event)) continue;
    compareEventWithHistory(event, editions, overallScope, found);
    if (hasInternationalField(event)) {
      // 국내부 우승자가 전체 우승자와 다를 때만 별도 비교 (전체=국내면 중복)
      const overall = winnerOf(event);
      const domestic = domesticWinnerOf(event);
      if (domestic && (!overall || overall.name !== domestic.name)) {
        compareEventWithHistory(event, editions, domesticScope, found);
      }
    }
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
    ...findDomesticChampionHighlights(events),
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
  isInternationalRow,
  MAX_HIGHLIGHTS,
};
