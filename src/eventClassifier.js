/**
 * 종목 분류 모듈 (Single Source of Truth)
 *
 * 종목명에서 유형(track/field/marathon)을 판별합니다.
 * 프로젝트 전체에서 이 모듈 하나만 사용합니다.
 *
 * - templateEngine, normalizer, pipeline 등이 모두 이 모듈을 import
 * - 종목 추가/수정 시 이 파일 하나만 수정하면 됨
 */

// ============================================
// 종목 키워드 사전
// ============================================

const EVENT_KEYWORDS = {
  track: [
    '100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '10000m',
    '110m허들', '100m허들', '400m허들', '110mH', '100mH', '400mH',
    '계주', '릴레이', '장애물', '3000m장애물',
  ],
  field: [
    '높이뛰기', '멀리뛰기', '세단뛰기', '장대높이뛰기',
    '포환던지기', '원반던지기', '창던지기', '해머던지기',
    '투포환', '십종', '칠종', '7종', '10종',
    'HJ', 'LJ', 'TJ', 'PV', 'SP', 'DT', 'JT', 'HT',
  ],
  marathon: [
    '마라톤', '하프마라톤', '10km', '20km', '경보', '크로스컨트리',
    '하프', '풀코스', '5km로드', '10km로드',
  ],
};

// 바람 정보를 표시해야 하는 종목 키워드
// (200m 이하 트랙 + 멀리뛰기 + 세단뛰기)
const WIND_RELEVANT_KEYWORDS = [
  '100m', '200m', '110m허들', '100m허들', '110mH', '100mH',
  '멀리뛰기', '세단뛰기', 'LJ', 'TJ',
];

// 기록 단위가 미터(m)인 종목
const METER_UNIT_KEYWORDS = [
  '높이뛰기', '멀리뛰기', '세단뛰기', '장대높이뛰기',
  '포환던지기', '원반던지기', '창던지기', '해머던지기',
  '투포환', 'HJ', 'LJ', 'TJ', 'PV', 'SP', 'DT', 'JT', 'HT',
];

// ============================================
// 분류 함수들
// ============================================

/**
 * 종목명에서 유형을 분류합니다.
 * @param {string} eventName - 종목명 (예: "남자 100m 결선")
 * @returns {'track' | 'field' | 'marathon'}
 */
function classifyEvent(eventName) {
  const normalized = (eventName || '').replace(/\s/g, '');

  for (const kw of EVENT_KEYWORDS.marathon) {
    if (normalized.includes(kw)) return 'marathon';
  }
  for (const kw of EVENT_KEYWORDS.field) {
    if (normalized.includes(kw)) return 'field';
  }
  return 'track';
}

/**
 * 해당 종목이 바람 정보를 표시해야 하는지 판별합니다.
 * @param {string} eventName - 종목명
 * @returns {boolean}
 */
function needsWind(eventName) {
  const normalized = (eventName || '').replace(/\s/g, '');
  return WIND_RELEVANT_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * 해당 종목의 기록 단위가 미터(m)인지 판별합니다.
 * @param {string} eventName - 종목명
 * @returns {boolean}
 */
function usesMeterUnit(eventName) {
  const normalized = (eventName || '').replace(/\s/g, '');
  return METER_UNIT_KEYWORDS.some(kw => normalized.includes(kw));
}

module.exports = {
  EVENT_KEYWORDS,
  classifyEvent,
  needsWind,
  usesMeterUnit,
};
