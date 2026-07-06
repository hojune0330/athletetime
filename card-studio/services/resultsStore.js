/**
 * 결과 데이터 저장소 어댑터 (Results Store Adapter)
 *
 * 배경:
 *   과거 파이프라인은 대회별로 한 파일씩 `data/raw/<timestamp>_<대회명>_raw.json`
 *   형태로 저장했고, searchService 는 그 구조(`data.meta.competition_name`,
 *   `data.events[]`)를 가정합니다.
 *
 *   그러나 현재 git 에 포함되어 배포되는 실데이터는
 *   `data/results/<year>.json` (연도별 "대회 배열") 형태입니다.
 *     [
 *       { competitionId, toCd, competitionName, year, period, venue,
 *         events: [ { event, division, date, venue, wind,
 *                     results: [ { rank, name, affiliation, record,
 *                                  personal_best, note, newRecord } ] } ] },
 *       ...
 *     ]
 *
 *   `data/raw/` 디렉토리는 .gitignore 로 제외되어 배포 환경에 존재하지 않으므로
 *   searchService.getCompetitions()/search() 와 /results/:filename/events 가
 *   모두 빈 결과를 반환하던 버그가 있었습니다.
 *
 *   이 모듈은 `data/results/<year>.json` 을 읽어 legacy raw-file 형태로
 *   변환(어댑트)하여 노출합니다. 디스크의 데이터는 그대로 두고, 읽는 쪽만
 *   호환 레이어를 추가하는 방식입니다.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

const LIFE_SPORT_COMPETITION_PATTERNS = [/생활체육/i, /마스터즈/i, /대축전/i, /recordsport/i];

// 캐시 (디렉토리 시그니처 기반 무효화)
const _cache = {
  files: null,          // [{ filename, competition, year, period, venue, source }]
  byFilename: null,     // filename -> normalized raw-file object
  signature: null,      // 디렉토리 상태 시그니처
};

/** results 디렉토리 경로 */
function resultsDir() {
  return path.join(config.dirs.data, 'results');
}

/** 디렉토리 변경 감지용 시그니처 (파일명+크기+mtime) */
function _signature(dir) {
  try {
    const files = fs.readdirSync(dir).filter(f => /^\d{4}\.json$/.test(f)).sort();
    return files
      .map(f => {
        const st = fs.statSync(path.join(dir, f));
        return `${f}:${st.size}:${st.mtimeMs}`;
      })
      .join('|');
  } catch (e) {
    return '';
  }
}

/**
 * period 를 "YYYY-MM-DD ~ YYYY-MM-DD" 문자열로 정규화합니다.
 * (results 파일은 문자열, index 파일은 {start,end} 두 형태가 섞여 있을 수 있음)
 */
function _normalizePeriod(period) {
  if (!period) return '';
  if (typeof period === 'string') return period;
  if (typeof period === 'object') {
    const start = period.start || '';
    const end = period.end || '';
    if (start && end) return start === end ? start : `${start} ~ ${end}`;
    return start || end || '';
  }
  return String(period);
}

function _sortDateFromPeriod(period) {
  const dates = String(period || '').match(/\d{4}-\d{2}-\d{2}/g) || [];
  return dates[dates.length - 1] || '';
}

function _isLifeSportCompetition(value) {
  const text = String(value || '');
  return LIFE_SPORT_COMPETITION_PATTERNS.some(pattern => pattern.test(text));
}

function _isPublicResultCompetition(raw) {
  const meta = raw && raw.meta ? raw.meta : {};
  return !_isLifeSportCompetition(meta.competition_name) && !_isLifeSportCompetition(raw.filename);
}

/**
 * competitionId 등으로부터 안전한 합성 파일명을 만듭니다.
 * (경로 탈출 방지를 위해 영숫자/하이픈/언더스코어만 허용)
 *  예) 2024 + "2024-road-004" -> "2024__2024-road-004.json"
 */
function _syntheticFilename(year, comp) {
  const id =
    comp.competitionId != null
      ? String(comp.competitionId)
      : comp.toCd || comp.competitionName || Math.random().toString(36).slice(2);
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${year}__${safe}.json`;
}

/**
 * 하나의 대회(JSON 객체)를 legacy raw-file 구조로 변환합니다.
 */
function _toRawShape(year, comp) {
  const filename = _syntheticFilename(year, comp);
  const period = _normalizePeriod(comp.period);
  return {
    filename,
    meta: {
      competition_name: comp.competitionName || comp.name || '(알 수 없는 대회)',
      year: String(comp.year || year || ''),
      period,
      venue: comp.venue || '',
      source: comp.source || 'kaaf',
      source_url: comp.sourceUrl || comp.kaafUrl || '',
      crawled_at: comp.crawledAt || comp.collectedAt || '',
      competition_id: comp.competitionId != null ? String(comp.competitionId) : '',
      to_cd: comp.toCd || '',
    },
    events: Array.isArray(comp.events) ? comp.events : [],
  };
}

/**
 * 캐시를 (필요 시) 빌드합니다.
 */
function _ensureLoaded() {
  const dir = resultsDir();
  const sig = _signature(dir);

  if (_cache.signature === sig && _cache.byFilename) {
    return;
  }

  const files = [];
  const byFilename = {};

  if (sig) {
    const yearFiles = fs
      .readdirSync(dir)
      .filter(f => /^\d{4}\.json$/.test(f))
      .sort();

    for (const yf of yearFiles) {
      const year = yf.replace('.json', '');
      let arr;
      try {
        arr = JSON.parse(fs.readFileSync(path.join(dir, yf), 'utf-8'));
      } catch (e) {
        continue;
      }
      if (!Array.isArray(arr)) continue;

      for (const comp of arr) {
        const raw = _toRawShape(year, comp);
        byFilename[raw.filename] = raw;
        if (_isPublicResultCompetition(raw)) {
          files.push({
            filename: raw.filename,
            competition: raw.meta.competition_name,
            year: raw.meta.year,
            period: raw.meta.period,
            venue: raw.meta.venue,
            source: raw.meta.source,
            collectedAt: raw.meta.crawled_at,
          });
        }
      }
    }
  }

  _cache.files = files.sort((a, b) => {
    const dateCompare = _sortDateFromPeriod(b.period).localeCompare(_sortDateFromPeriod(a.period));
    if (dateCompare !== 0) return dateCompare;
    return String(a.competition || '').localeCompare(String(b.competition || ''), 'ko-KR');
  });
  _cache.byFilename = byFilename;
  _cache.signature = sig;
}

/**
 * 사용 가능한 대회 목록 (가벼운 메타).
 * @returns {Array<{filename, competition, year, period, venue, source, collectedAt}>}
 */
function listCompetitions() {
  _ensureLoaded();
  return _cache.files.slice();
}

/**
 * 합성 파일명 목록 (검색 대상 파일 순회용).
 */
function listFilenames() {
  _ensureLoaded();
  return Object.keys(_cache.byFilename).filter(filename => _isPublicResultCompetition(_cache.byFilename[filename]));
}

function isPublicResultFilename(filename) {
  _ensureLoaded();
  const raw = _cache.byFilename[filename];
  return Boolean(raw && _isPublicResultCompetition(raw));
}

/**
 * 합성 파일명으로 legacy raw-file 구조의 대회 데이터를 반환합니다.
 * @returns {Object|null}
 */
function getRawByFilename(filename) {
  _ensureLoaded();
  return _cache.byFilename[filename] || null;
}

/**
 * 결과 데이터 보유 여부.
 */
function hasData() {
  _ensureLoaded();
  return _cache.files.length > 0;
}

module.exports = {
  resultsDir,
  listCompetitions,
  listFilenames,
  isPublicResultFilename,
  getRawByFilename,
  hasData,
};
