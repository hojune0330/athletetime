/**
 * 종목 타입 분류 모듈 (Event Type Classifier)
 * 
 * 종목명을 분석하여 트랙/필드/도로/복합 타입을 자동 판별합니다.
 * renderResultHtml에서 종목 특성에 맞는 레이아웃을 선택할 때 사용됩니다.
 * 
 * v1.0.0
 */

// ─── 종목 분류 사전 ─────────────────────────────

const TRACK_EVENTS = [
  '50m', '60m', '100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '10000m',
  '10,000m', '5,000m', '3,000m',
  '100mH', '110mH', '400mH', '3000mSC', '3,000mSC',
  '4x100m', '4x400m', '4×100m', '4×400m',
  '60mH', '80mH',
];

const FIELD_THROW_EVENTS = [
  '포환던지기', '원반던지기', '창던지기', '해머던지기',
  'Shot Put', 'Discus', 'Javelin', 'Hammer',
];

const FIELD_JUMP_EVENTS = [
  '높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기',
  'High Jump', 'Pole Vault', 'Long Jump', 'Triple Jump',
];

const ROAD_EVENTS = [
  '마라톤', '하프마라톤', '10km', '20km', '50km',
  '10Km', '20Km', '50Km',
  '경보', '10000m경보', '20000m경보', '10km경보', '20km경보', '50km경보',
  '10,000m경보', '20,000m경보',
  'Marathon', 'Half Marathon',
];

const COMBINED_EVENTS = [
  '10종경기', '7종경기', '5종경기',
  '십종경기', '칠종경기', '오종경기',
  'Decathlon', 'Heptathlon', 'Pentathlon',
];

// ─── 분류 엔진 ──────────────────────────────────

/**
 * 종목명에서 순수 종목을 추출 (부별/라운드 제거)
 */
function extractPureEvent(eventName) {
  if (!eventName) return '';
  return eventName
    .replace(/^(남자|여자|혼성)\s*/, '')
    .replace(/\s*(결승|예선|준결승|결선|[0-9]+조.*)$/, '')
    .trim();
}

/**
 * 종목 타입 분류
 * @returns {{ type: string, subType: string, unit: string, recordLabel: string }}
 */
function classifyEvent(eventName) {
  const pure = extractPureEvent(eventName).toLowerCase();
  const original = extractPureEvent(eventName);

  // 복합 종목
  for (const e of COMBINED_EVENTS) {
    if (pure.includes(e.toLowerCase())) {
      return { type: 'combined', subType: 'multi', unit: '점', recordLabel: '총점' };
    }
  }

  // 도로 종목
  for (const e of ROAD_EVENTS) {
    if (pure.includes(e.toLowerCase())) {
      return { type: 'road', subType: 'distance', unit: '', recordLabel: '기록' };
    }
  }

  // 필드 — 던지기
  for (const e of FIELD_THROW_EVENTS) {
    if (pure.includes(e.toLowerCase())) {
      return { type: 'field', subType: 'throw', unit: 'm', recordLabel: '기록 (m)' };
    }
  }

  // 필드 — 뛰기
  for (const e of FIELD_JUMP_EVENTS) {
    if (pure.includes(e.toLowerCase())) {
      const isHeight = pure.includes('높이') || pure.includes('장대') || pure.includes('high') || pure.includes('pole');
      return { type: 'field', subType: isHeight ? 'height' : 'distance', unit: 'm', recordLabel: '기록 (m)' };
    }
  }

  // 트랙 — 직접 매치 or m 단위 거리
  for (const e of TRACK_EVENTS) {
    if (pure.includes(e.toLowerCase())) {
      return { type: 'track', subType: 'sprint', unit: '', recordLabel: '기록' };
    }
  }

  // m 또는 mH, mSC 패턴으로 트랙 추정
  if (/\d+m(h|sc)?$/i.test(pure.replace(/,/g, ''))) {
    return { type: 'track', subType: 'sprint', unit: '', recordLabel: '기록' };
  }

  // 기본값: 트랙
  return { type: 'track', subType: 'default', unit: '', recordLabel: '기록' };
}

/**
 * 결과 데이터에 풍속이 필요한지 판별
 */
function needsWind(eventType) {
  if (!eventType) return false;
  // 트랙 단거리 + 필드 수평 뛰기만 풍속 표시
  return eventType.type === 'track' && eventType.subType === 'sprint'
    || eventType.type === 'field' && eventType.subType === 'distance';
}

module.exports = {
  classifyEvent,
  extractPureEvent,
  needsWind,
  TRACK_EVENTS,
  FIELD_THROW_EVENTS,
  FIELD_JUMP_EVENTS,
  ROAD_EVENTS,
  COMBINED_EVENTS,
};
