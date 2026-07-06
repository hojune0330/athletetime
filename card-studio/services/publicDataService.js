/**
 * publicDataService.js — 공공데이터포털 연동(골격) · S1
 *
 * 데이터 출처: 공공데이터포털 "대한체육회_선수등록정보" (data.go.kr/15052695)
 *   - 필드: 등록년도/성별/종별/종목/세부종목/소속/소속구분/소속세부구분/시도
 *   - 행수: 약 3,495,371 (연 1회 갱신)
 *   - 라이선스: 이용허락범위 제한 없음(영리 이용 가능)
 *   - 식별자(개인번호)·이름·생년월일 없음 → 익명 거시통계 전용
 *
 * 설계 원칙(전략 마스터 §1·§5 준수):
 *   1) 사실 기반 거시통계만 산출(시도별/종목별/연도별 분포). 동일인 식별 아님.
 *   2) 출처표기(source attribution)를 항상 함께 반환.
 *   3) Open API 키(활용신청)가 없어도 동작 → 수동 다운로드 CSV(UTF-8/CP949) ingestion 우선.
 *   4) CSV 파일이 없으면 빈 통계 + available:false 반환(throws never, graceful fallback).
 *   5) mtime 기반 캐시. 네트워크 호출 없음.
 *
 * ingestion 경로:
 *   data.go.kr → CSV(ZIP) 무로그인 다운로드 → 압축해제 → data/public/krsport/athlete-registry.csv 로 배치.
 *   (Open API 정식 연동은 활용신청 키 확보 후 별도 단계에서 추가.)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'public', 'krsport');
const CSV_PATH = path.join(DATA_DIR, 'athlete-registry.csv');

const SOURCE = Object.freeze({
  provider: '공공데이터포털',
  agency: '대한체육회',
  dataset: '대한체육회_선수등록정보',
  datasetId: '15052695',
  url: 'https://www.data.go.kr/data/15052695/fileData.do',
  license: '이용허락범위 제한 없음',
  note: '개인식별정보(이름·개인번호·생년월일) 미포함 익명 통계자료. 공란=미집계.',
});

// 데이터셋 한글 컬럼명 → 내부 키 매핑.
// (data.go.kr 미리보기 기준. 헤더 변형/공백/BOM 을 흡수한다.)
const COLUMN_ALIASES = Object.freeze({
  등록년도: 'year',
  등록연도: 'year',
  성별: 'gender',
  종별: 'category',
  종목: 'sport',
  세부종목: 'event',
  소속: 'team',
  소속구분: 'teamType',
  소속세부구분: 'teamSubType',
  시도: 'region',
});

const BLANK_LABEL = '미집계'; // 공란 처리 라벨

let _cache = null;
let _cacheMtimeMs = 0;

/* --------------------------- CSV 파싱 (의존성 없음) --------------------------- */

/** RFC4180 비슷한 최소 CSV 파서. 따옴표·줄바꿈·콤마 이스케이프 처리. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  // 마지막 필드/행 flush
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** 헤더 셀을 정규화(BOM·공백 제거)하고 내부 키로 매핑. */
function mapHeaders(headerCells) {
  return headerCells.map((raw) => {
    const clean = String(raw || '').replace(/^\uFEFF/, '').trim();
    return COLUMN_ALIASES[clean] || null;
  });
}

function blankOr(value) {
  const v = String(value == null ? '' : value).trim();
  return v === '' ? BLANK_LABEL : v;
}

/* ------------------------------- 로드 / 캐시 ------------------------------- */

function emptyResult(reason) {
  return {
    available: false,
    reason: reason || 'no_file',
    rowCount: 0,
    records: [],
    source: SOURCE,
    csvPath: CSV_PATH,
  };
}

/** CSV 파일을 읽어 익명 레코드 배열로 반환. 파일 없으면 available:false. */
function load() {
  let stat;
  try {
    stat = fs.statSync(CSV_PATH);
  } catch (_) {
    _cache = emptyResult('no_file');
    _cacheMtimeMs = 0;
    return _cache;
  }

  if (_cache && _cache.available && stat.mtimeMs === _cacheMtimeMs) {
    return _cache;
  }

  let text;
  try {
    // UTF-8 우선. CP949(EUC-KR)일 경우 깨질 수 있으므로 헤더 매핑이 0개면 재안내.
    text = fs.readFileSync(CSV_PATH, 'utf8');
  } catch (_) {
    _cache = emptyResult('read_error');
    _cacheMtimeMs = 0;
    return _cache;
  }

  const rows = parseCsv(text);
  if (rows.length < 2) {
    _cache = emptyResult('empty');
    _cacheMtimeMs = stat.mtimeMs;
    return _cache;
  }

  const headerKeys = mapHeaders(rows[0]);
  const mappedCount = headerKeys.filter(Boolean).length;
  if (mappedCount === 0) {
    // 헤더를 하나도 매핑하지 못함 → 인코딩(CP949) 또는 포맷 불일치 가능성.
    _cache = emptyResult('header_unmatched');
    _cacheMtimeMs = stat.mtimeMs;
    return _cache;
  }

  const records = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells || cells.length === 0) continue;
    if (cells.length === 1 && String(cells[0]).trim() === '') continue;

    const rec = {};
    let hasValue = false;
    for (let c = 0; c < headerKeys.length; c += 1) {
      const key = headerKeys[c];
      if (!key) continue;
      const val = cells[c];
      if (val != null && String(val).trim() !== '') hasValue = true;
      rec[key] = blankOr(val);
    }
    if (hasValue) records.push(rec);
  }

  _cache = {
    available: true,
    reason: 'ok',
    rowCount: records.length,
    records,
    source: SOURCE,
    csvPath: CSV_PATH,
  };
  _cacheMtimeMs = stat.mtimeMs;
  return _cache;
}

/* -------------------------------- 거시통계 -------------------------------- */

function tally(records, key) {
  const map = new Map();
  for (const rec of records) {
    const k = rec[key] != null ? rec[key] : BLANK_LABEL;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** 거시통계 요약: 연도별/시도별/성별/종목별 분포 + 출처. */
function getDistribution() {
  const data = load();
  if (!data.available) {
    return {
      available: false,
      reason: data.reason,
      source: SOURCE,
      ingestionHint: `CSV 미배치. ${SOURCE.url} 에서 다운로드 후 ${CSV_PATH} 로 배치하세요.`,
    };
  }
  const { records } = data;
  return {
    available: true,
    rowCount: records.length,
    byYear: tally(records, 'year'),
    byRegion: tally(records, 'region'),
    byGender: tally(records, 'gender'),
    bySport: tally(records, 'sport'),
    byCategory: tally(records, 'category'),
    source: SOURCE,
  };
}

/**
 * 특정 차원 분포(예: 시도별 또는 종목별)를 필터와 함께 조회.
 * @param {string} dimension - year|gender|category|sport|event|team|region 등 내부 키
 * @param {object} filters - { [내부키]: 값 } 동등 매칭
 */
function getBreakdown(dimension, filters = {}) {
  const data = load();
  if (!data.available) {
    return { available: false, reason: data.reason, source: SOURCE };
  }
  const dim = COLUMN_ALIASES[dimension] || dimension;
  let records = data.records;
  for (const [fk, fv] of Object.entries(filters || {})) {
    const key = COLUMN_ALIASES[fk] || fk;
    records = records.filter((r) => String(r[key]) === String(fv));
  }
  return {
    available: true,
    dimension: dim,
    filters: filters || {},
    matched: records.length,
    breakdown: tally(records, dim),
    source: SOURCE,
  };
}

/** 상태(운영/디버그용). PII 없음. */
function getStatus() {
  const data = load();
  return {
    available: data.available,
    reason: data.reason,
    rowCount: data.rowCount || 0,
    csvPath: CSV_PATH,
    source: SOURCE,
  };
}

function clearCache() {
  _cache = null;
  _cacheMtimeMs = 0;
}

module.exports = {
  getDistribution,
  getBreakdown,
  getStatus,
  clearCache,
  load,
  SOURCE,
  CSV_PATH,
  COLUMN_ALIASES,
};
