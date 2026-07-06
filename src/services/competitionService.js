/**
 * Competition Service (대회 관리 서비스)
 * 
 * 대회 데이터 참조 및 창작 콘텐츠 제작을 위한 서비스입니다.
 * data/competitions/{year}.json 파일을 기반으로 동작합니다.
 * 
 * ═══════════════════════════════════════════════════════════════
 * ██ 법적 준수 및 데이터 정책 (LEGAL COMPLIANCE & DATA POLICY) ██
 * ═══════════════════════════════════════════════════════════════
 * 
 * ⚖️ 법적 근거: src/DATA_POLICY.js 참조
 * 
 * [서비스 포지셔닝]
 * AthleTime은 공식 데이터의 "재배포 플랫폼"이 아닙니다.
 * AthleteTime은 공개 경기기록을 색인하고 정리하는 비공식 기록 탐색 서비스입니다.
 * 
 * [데이터 사용 원칙]
 * 1. 사실 정보 참조: 대회명·일자·장소 등 사실적 정보(factual info)는
 *    공공영역(public domain)에 속하는 정보로서 참조합니다.
 *    (서울동부지법 2021카합10019: 스포츠 기록은 공공영역)
 * 
 * 2. 창작적 변환: 모든 산출물은 원본에 실질적 창작 가치를 추가합니다.
 *    카드뉴스, 인포그래픽, 프로필 카드 등은 독자적 창작물입니다.
 * 
 * 3. 출처 존중: 사실 정보의 원출처(KAAF)를 항상 명시합니다.
 * 
 * 4. 데이터 정확성 (절대 원칙):
 *    - 사실 정보의 창작(fabrication) 절대 금지
 *    - 추측(guess), 임의 변형(modify) 절대 금지
 *    - 누락, 건너뛰기, 대충 처리 절대 금지
 *    - 원본에 없는 정보를 만들어내지 않습니다
 * 
 * 5. 최소 필요 원칙: 콘텐츠 제작에 필요한 최소 정보만 참조합니다.
 * 
 * 6. 검증 가능: kaafSeq/kaafUrl로 원본 대조 검증이 가능합니다.
 * 
 * [금지 사항]
 * - 원본 데이터의 단순 복제·재배포
 * - KAAF 데이터베이스의 체계적 미러링
 * - 원본을 대체하는 형태의 데이터 서비스 제공
 * 
 * ⚠️ 이 원칙을 위반하는 코드 변경은 법적 리스크를 초래합니다.
 * ═══════════════════════════════════════════════════════════════
 * 
 * v2.0.0 — 법적 준수 프레임워크 도입, 창작 콘텐츠 중심 재설계
 */

const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '../../data/competitions');
const STATUS = {
  LIVE: 'live',
  UPCOMING: 'upcoming',
  FINISHED: 'finished'
};

const CATEGORY_ORDER = [
  'track_field', 'road', 'single_event', 'corporate', 'university', 'junior'
];

const CATEGORY_COLORS = {
  track_field: '#c8ff00',
  road: '#4ecdc4',
  single_event: '#ff6b6b',
  corporate: '#a78bfa',
  university: '#60a5fa',
  junior: '#f59e0b'
};

const CATEGORY_LABELS = {
  track_field: '트랙&필드',
  road: '도로경기',
  single_event: '단일종목',
  corporate: '실업연맹',
  university: '대학연맹',
  junior: '중고연맹'
};

const SECTION_LABELS = {
  '트랙 및 필드': '트랙&필드',
  '로드레이스': '도로경기',
  '단일경기': '단일종목',
  '실업연맹 사업': '실업연맹',
  '대학연맹 사업': '대학연맹',
  '중고연맹 사업': '중고연맹'
};

const SERVICE_TIME_ZONE = 'Asia/Seoul';
const SERVICE_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: SERVICE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// ─── Data Cache ──────────────────────────────────────────────
let cache = {};  // { year: { data: [], loadedAt: timestamp } }
const CACHE_TTL = 60 * 1000; // 1 minute

// ─── Helpers ─────────────────────────────────────────────────

function getServiceDateString(date = new Date()) {
  const parts = {};
  for (const part of SERVICE_DATE_FORMATTER.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getCompetitionStableKey(competition) {
  if (competition.kaafSeq) {
    return `${competition.id}-kaaf-${competition.kaafSeq}`;
  }
  const startDate = competition.period && competition.period.start ? competition.period.start : 'unknown-date';
  return `${competition.id}-${startDate}-${competition.name}`;
}

/**
 * 오늘 날짜 기준으로 대회 상태를 계산합니다.
 */
function computeStatus(period, today = null) {
  // 날짜가 '미정'이면 upcoming으로 처리
  if (!period.start || period.start === '미정' || !period.end || period.end === '미정') {
    return STATUS.UPCOMING;
  }
  const now = today || new Date();
  const todayStr = getServiceDateString(now);
  
  if (todayStr >= period.start && todayStr <= period.end) {
    return STATUS.LIVE;
  } else if (todayStr < period.start) {
    return STATUS.UPCOMING;
  } else {
    return STATUS.FINISHED;
  }
}

/**
 * 두 날짜 사이의 일수 차이를 계산합니다.
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 대회 기간을 사람이 읽기 쉬운 형태로 포맷합니다.
 */
function formatPeriod(period) {
  if (!period.start || period.start === '미정') return '미정';
  const s = period.start.split('-');
  const e = period.end.split('-');
  if (period.start === period.end) {
    return `${parseInt(s[1])}월 ${parseInt(s[2])}일`;
  }
  if (s[1] === e[1]) {
    return `${parseInt(s[1])}월 ${parseInt(s[2])}일~${parseInt(e[2])}일`;
  }
  return `${parseInt(s[1])}월 ${parseInt(s[2])}일~${parseInt(e[1])}월 ${parseInt(e[2])}일`;
}

/**
 * D-Day 문자열을 생성합니다.
 */
function getDDay(period, today = null) {
  if (!period.start || period.start === '미정') {
    return { text: '미정', sub: '일정 미확정', isLive: false };
  }
  const now = today || new Date();
  const todayStr = getServiceDateString(now);
  const status = computeStatus(period, now);
  
  if (status === STATUS.LIVE) {
    const dayInComp = daysBetween(period.start, todayStr) + 1;
    const totalDays = daysBetween(period.start, period.end) + 1;
    return { text: `${dayInComp}일차`, sub: `/ ${totalDays}일간`, isLive: true };
  } else if (status === STATUS.UPCOMING) {
    const daysLeft = daysBetween(todayStr, period.start);
    return { text: `D-${daysLeft}`, sub: formatPeriod(period), isLive: false };
  } else {
    return { text: '종료', sub: formatPeriod(period), isLive: false };
  }
}

/**
 * 대회명에서 짧은 이름(shortName)을 자동 생성합니다.
 * 원본 데이터에 shortName이 없으므로, 표시용으로만 사용합니다.
 * 원본 name 필드는 절대 변경하지 않습니다.
 */
function generateShortName(name) {
  let short = name;
  // '제XX회' 제거
  short = short.replace(/제?\d+회\s*/g, '');
  // 연도 제거
  short = short.replace(/\d{4}\s*/g, '');
  // '전국', '대회' 등 일반 단어 축약
  short = short.replace(/전국/g, '').replace(/육상경기대회/g, '육상').replace(/대회$/g, '');
  // 괄호 안 내용 제거
  short = short.replace(/\([^)]*\)/g, '');
  // 불필요한 공백 정리
  short = short.replace(/\s+/g, ' ').trim();
  // 너무 짧으면 원본에서 다시 축약
  if (short.length < 2) short = name.replace(/\d{4}/g, '').replace(/제?\d+회\s*/g, '').trim();
  // 최대 길이 제한
  if (short.length > 20) short = short.substring(0, 20);
  return short || name;
}

/**
 * ⚠️ 데이터 무결성 검증: 필수 필드 확인
 * 모든 대회 데이터에 source와 kaafUrl이 있는지 확인합니다.
 */
function validateDataIntegrity(competitions) {
  const warnings = [];
  for (const comp of competitions) {
    if (!comp.kaafUrl) {
      warnings.push(`[무결성 경고] "${comp.name}" — kaafUrl 누락 (출처 추적 불가)`);
    }
    if (!comp.source) {
      warnings.push(`[무결성 경고] "${comp.name}" — source 필드 누락`);
    }
    if (!comp.kaafSeq && comp.kaafSeq !== 0) {
      warnings.push(`[무결성 경고] "${comp.name}" — kaafSeq 누락 (검증 불가)`);
    }
  }
  if (warnings.length > 0) {
    console.warn('[CompetitionService] 데이터 무결성 검증 경고:');
    warnings.forEach(w => console.warn(w));
  }
  return warnings;
}

// ─── Core Functions ──────────────────────────────────────────

/**
 * 특정 연도의 대회 데이터를 로드합니다.
 */
function loadYear(year) {
  const now = Date.now();
  if (cache[year] && (now - cache[year].loadedAt) < CACHE_TTL) {
    return cache[year].data;
  }
  
  const filePath = path.join(DATA_DIR, `${year}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    cache[year] = { data, loadedAt: now };
    return data;
  } catch (err) {
    console.error(`[CompetitionService] Failed to load ${year}.json:`, err.message);
    return [];
  }
}

/**
 * 특정 연도의 대회 데이터를 저장합니다.
 */
function saveYear(year, data) {
  const filePath = path.join(DATA_DIR, `${year}.json`);
  
  // Ensure directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  cache[year] = { data, loadedAt: Date.now() };
}

/**
 * 모든 대회를 상태가 갱신된 상태로 반환합니다.
 */
function getCompetitions(year, options = {}) {
  const { category, status: filterStatus, search } = options;
  let competitions = loadYear(year);
  
  // 최초 로드 시 무결성 검증
  validateDataIntegrity(competitions);

  // 상태를 실시간 계산 (원본 데이터는 변경하지 않음, 표시용 필드만 추가)
  const statusNow = new Date();
  competitions = competitions.map(comp => ({
    ...comp,
    stableKey: getCompetitionStableKey(comp),
    shortName: comp.shortName || generateShortName(comp.name),
    status: computeStatus(comp.period, statusNow),
    dday: getDDay(comp.period, statusNow),
    periodLabel: formatPeriod(comp.period),
    categoryColor: CATEGORY_COLORS[comp.category] || '#888',
    categoryLabel: CATEGORY_LABELS[comp.category] || comp.section || comp.category
  }));
  
  // 필터 적용
  if (category) {
    competitions = competitions.filter(c => c.category === category);
  }
  if (filterStatus) {
    competitions = competitions.filter(c => c.status === filterStatus);
  }
  if (search) {
    const q = search.toLowerCase();
    competitions = competitions.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.venue.toLowerCase().includes(q)
    );
  }
  
  // 정렬: 라이브 → 다가오는 → 종료 (각각 날짜순)
  const statusOrder = { live: 0, upcoming: 1, finished: 2 };
  competitions.sort((a, b) => {
    const so = (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
    if (so !== 0) return so;
    if (a.status === 'finished') {
      // 종료된 대회는 최근이 먼저
      return b.period.end.localeCompare(a.period.end);
    }
    return a.period.start.localeCompare(b.period.start);
  });
  
  return competitions;
}

/**
 * 현재(라이브), 직전, 다음 대회를 반환합니다.
 */
function getCurrentCompetitions(year) {
  const all = getCompetitions(year);
  
  const live = all.filter(c => c.status === STATUS.LIVE);
  const upcoming = all.filter(c => c.status === STATUS.UPCOMING);
  const finished = all.filter(c => c.status === STATUS.FINISHED);
  
  // 직전 대회: 종료일이 가장 최근인 것
  const previous = finished.length > 0 ? finished[0] : null;
  
  // 다음 대회: 시작일이 가장 가까운 것
  const next = upcoming.length > 0 ? upcoming[0] : null;
  
  return {
    live,
    previous,
    next,
    totalLive: live.length,
    totalUpcoming: upcoming.length,
    totalFinished: finished.length
  };
}

/**
 * ID로 대회를 찾습니다.
 */
function getCompetitionById(id) {
  // ID에서 연도 추출 (예: 2026-tf-001 → 2026)
  const yearMatch = id.match(/^(\d{4})/);
  if (!yearMatch) return null;
  
  const year = parseInt(yearMatch[1]);
  const all = getCompetitions(year);
  return all.find(c => c.id === id) || null;
}

/**
 * 대회에 연결된 raw 파일 목록을 반환합니다.
 */
function getCompetitionRawFiles(compId) {
  const comp = getCompetitionById(compId);
  if (!comp) return [];
  
  const rawDir = path.join(__dirname, '../../data/raw');
  if (!fs.existsSync(rawDir)) return [];
  
  const files = fs.readdirSync(rawDir);
  const matched = [];
  
  for (const file of files) {
    if (!file.endsWith('_raw.json')) continue;
    
    // 방법 1: rawFilePattern 매칭
    if (comp.rawFilePattern && file.includes(comp.rawFilePattern)) {
      matched.push(file);
      continue;
    }
    
    // 방법 2: 대회명의 핵심 키워드로 매칭
    const compKeywords = extractKeywords(comp.name);
    const fileDecoded = decodeURIComponent(file.replace(/_/g, ' '));
    const matchCount = compKeywords.filter(kw => fileDecoded.includes(kw)).length;
    if (compKeywords.length > 0 && matchCount >= Math.ceil(compKeywords.length * 0.6)) {
      matched.push(file);
    }
  }
  
  return matched;
}

/**
 * 대회명에서 매칭용 키워드를 추출합니다.
 */
function extractKeywords(name) {
  // 회차 번호, 연도, 일반적 단어 제거
  return name
    .replace(/제?\d+회?/g, '')
    .replace(/\d{4}/g, '')
    .replace(/전국|대회|경기|육상/g, '')
    .split(/[\s·]/g)
    .filter(w => w.length >= 2);
}

/**
 * 캘린더 뷰용으로 월별 그룹핑된 데이터를 반환합니다.
 */
function getCalendarView(year) {
  const all = getCompetitions(year);
  const months = {};
  
  for (let m = 1; m <= 12; m++) {
    months[m] = {
      month: m,
      label: `${m}월`,
      competitions: []
    };
  }
  
  for (const comp of all) {
    if (!comp.period.start || comp.period.start === '미정') continue; // 미정인 대회는 캘린더에서 제외
    const month = parseInt(comp.period.start.split('-')[1]);
    months[month].competitions.push(comp);
  }
  
  // 월 내에서 날짜순 정렬
  for (const m of Object.values(months)) {
    m.competitions.sort((a, b) => a.period.start.localeCompare(b.period.start));
  }
  
  return Object.values(months);
}

/**
 * 대회별 통계 요약을 반환합니다 (결과 이미지 수, 이벤트 수 등).
 */
function getCompetitionStats(compId) {
  const rawFiles = getCompetitionRawFiles(compId);
  let totalEvents = 0;
  let totalResults = 0;
  
  const rawDir = path.join(__dirname, '../../data/raw');
  
  for (const file of rawFiles) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf-8'));
      const events = raw.events || [];
      totalEvents += events.length;
      for (const ev of events) {
        totalResults += (ev.results || []).length;
      }
    } catch (e) {
      // Skip corrupted files
    }
  }
  
  // 생성된 이미지 수 (히스토리에서)
  let generatedImages = 0;
  const historyDir = path.join(__dirname, '../../data/history');
  if (fs.existsSync(historyDir)) {
    try {
      const indexFile = path.join(historyDir, 'index.json');
      if (fs.existsSync(indexFile)) {
        const historyIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        const comp = getCompetitionById(compId);
        if (comp) {
          generatedImages = historyIndex.filter(h =>
            h.competition && h.competition.includes(comp.shortName || comp.name)
          ).length;
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return {
    rawFiles: rawFiles.length,
    totalEvents,
    totalResults,
    generatedImages
  };
}

/**
 * KAAF 공식 데이터를 import합니다.
 */
function importKaafData(year, entries) {
  const existing = loadYear(year);
  const existingIds = new Set(existing.map(c => c.id));
  
  let added = 0;
  let updated = 0;
  
  for (const entry of entries) {
    if (existingIds.has(entry.id)) {
      // Update existing
      const idx = existing.findIndex(c => c.id === entry.id);
      existing[idx] = { ...existing[idx], ...entry };
      updated++;
    } else {
      existing.push(entry);
      added++;
    }
  }
  
  saveYear(year, existing);
  return { added, updated, total: existing.length };
}

/**
 * 캐시를 무효화합니다.
 */
function invalidateCache(year) {
  if (year) {
    delete cache[year];
  } else {
    cache = {};
  }
}

// ─── Exports ─────────────────────────────────────────────────
module.exports = {
  STATUS,
  CATEGORY_ORDER,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getCompetitions,
  getCurrentCompetitions,
  getCompetitionById,
  getCompetitionRawFiles,
  getCompetitionStats,
  getCalendarView,
  importKaafData,
  invalidateCache,
  computeStatus,
  formatPeriod,
  getDDay,
  generateShortName,
  validateDataIntegrity,
  loadYear,
  saveYear
};
