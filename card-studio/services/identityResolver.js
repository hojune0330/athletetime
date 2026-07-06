'use strict';

/**
 * identityResolver — 선수 동일인 식별(Identity Resolution) 레이어 (스켈레톤)
 *
 * 역할:
 *   "소속이 매년 바뀌어도 한 선수를 한 명으로 묶는" canonical identity 를
 *   기존 athleteKey 위에 *추가 레이어*로 얹는다.
 *
 * 핵심 안전 원칙 (athletetime-data-strategy-master.md / identity-architecture.md 기준):
 *   1) graceful fallback — 매핑 데이터가 없거나(빈 파일) 미매칭이면 항상 null 을 반환.
 *      호출부는 `resolve(...) || athleteKey` 로 쓰므로, 데이터 0건이면 현행과 100% 동일하게 동작한다.
 *   2) person_no 비보유(B안) — 이 모듈도, 매핑 파일도 person_no/생년월일 등 타기관 식별자를
 *      저장하지 않는다. 오직 우리 난수 canonicalId 와 매칭 키만 다룬다.
 *   3) 런타임 안전 — 외부 네트워크 호출 없음. 로컬 매핑 파일만 읽고, 읽기 실패해도 throw 하지 않는다.
 *   4) 역추적 불가 — canonicalId 는 우리가 발급한 난수/해시이며 person_no 와 수학적 연관이 없다.
 *
 * 매핑 파일 스키마 (data/identity/athlete-map.json):
 *   {
 *     "version": 1,
 *     "generatedAt": "2026-06-07" | null,
 *     "entries": [
 *       {
 *         "canonicalId": "at_xxxxxxxx",          // 우리 발급 난수 (person_no 아님)
 *         "displayName": "홍길동",
 *         "sourceUrl": "https://...",            // 출처 링크(사실 인용 근거, 선택)
 *         "matchedAthleteKeys": ["<key1>", ...], // recordAnalyticsService 의 athleteKey 들
 *         "matchKeys": ["홍길동|소속A", ...],     // 정규화된 name|team 매칭 키(선택, athleteKey 미산출시)
 *         "matchConfidence": 0.0,
 *         "affiliations": [ { "year": 2022, "team": "○○고" } ]  // 공개 사실(선택)
 *       }
 *     ]
 *   }
 */

const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, '..', '..', 'data', 'identity', 'athlete-map.json');

// 자동 병합 임계값. matchConfidence 가 이 값 미만인 엔트리는 무시(오매칭 방지).
const AUTO_MERGE_THRESHOLD = 0.85;

let cache = null;        // { byAthleteKey: Map, byMatchKey: Map, count, entries }
let cacheMtimeMs = -1;   // 파일 변경 감지용
let cacheLoadedEmpty = false; // 파일 부재시 재시도 최소화
let cacheCheckedAt = 0;
const CACHE_STAT_TTL_MS = 5000;

/**
 * 매핑 인덱스를 (필요시) 로드한다. 파일이 없거나 비었으면 빈 인덱스를 반환.
 * 어떤 경우에도 throw 하지 않는다.
 * @returns {{ byAthleteKey: Map<string,string>, byMatchKey: Map<string,string>, count: number }}
 */
function loadIndex() {
  const now = Date.now();
  if (cache && now - cacheCheckedAt < CACHE_STAT_TTL_MS) {
    return cache;
  }
  cacheCheckedAt = now;

  let stat;
  try {
    stat = fs.statSync(MAP_PATH);
  } catch (_) {
    // 파일 자체가 없음 → 영구적으로 빈 인덱스(현행 동작 유지)
    if (!cache || !cacheLoadedEmpty) {
      cache = emptyIndex();
      cacheLoadedEmpty = true;
      cacheMtimeMs = -1;
    }
    return cache;
  }

  // mtime 변화 없으면 캐시 재사용
  if (cache && stat.mtimeMs === cacheMtimeMs) {
    return cache;
  }

  try {
    const raw = fs.readFileSync(MAP_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cache = buildIndex(parsed);
    cacheMtimeMs = stat.mtimeMs;
    cacheLoadedEmpty = cache.count === 0;
    return cache;
  } catch (err) {
    // 손상된 파일 등 → 안전하게 빈 인덱스로 폴백 (서비스 영향 0)
    cache = emptyIndex();
    cacheMtimeMs = stat.mtimeMs;
    cacheLoadedEmpty = true;
    return cache;
  }
}

function emptyIndex() {
  return { byAthleteKey: new Map(), byMatchKey: new Map(), count: 0 };
}

/**
 * 파싱된 매핑 객체로부터 빠른 조회 인덱스를 구성한다.
 * matchConfidence < 임계값 또는 canonicalId 없는 엔트리는 건너뛴다.
 */
function buildIndex(parsed) {
  const byAthleteKey = new Map();
  const byMatchKey = new Map();
  let count = 0;

  const entries = Array.isArray(parsed && parsed.entries) ? parsed.entries : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const canonicalId = typeof entry.canonicalId === 'string' ? entry.canonicalId.trim() : '';
    if (!canonicalId) continue;

    // 신뢰도 게이트: 명시값이 없으면(레거시/수동) 통과로 간주, 있으면 임계값 적용
    const conf = typeof entry.matchConfidence === 'number' ? entry.matchConfidence : null;
    if (conf !== null && conf < AUTO_MERGE_THRESHOLD) continue;

    let mapped = false;
    if (Array.isArray(entry.matchedAthleteKeys)) {
      for (const k of entry.matchedAthleteKeys) {
        if (typeof k === 'string' && k) {
          byAthleteKey.set(k, canonicalId);
          mapped = true;
        }
      }
    }
    if (Array.isArray(entry.matchKeys)) {
      for (const mk of entry.matchKeys) {
        if (typeof mk === 'string' && mk) {
          byMatchKey.set(mk, canonicalId);
          mapped = true;
        }
      }
    }
    if (mapped) count += 1;
  }

  return { byAthleteKey, byMatchKey, count };
}

/**
 * 한 레코드의 canonicalId 를 해석한다.
 * 매핑이 없으면 null 을 반환하여 호출부가 athleteKey 로 graceful fallback 하게 한다.
 *
 * @param {Object} input
 * @param {string} [input.athleteKey]  recordAnalyticsService 가 만든 stableId 키
 * @param {string} [input.matchKey]    정규화된 "name|team" 등 보조 매칭 키
 * @returns {string|null} canonicalId 또는 null
 */
function resolve(input) {
  const index = loadIndex();
  if (index.count === 0) return null; // 데이터 0건 → 현행과 동일

  if (input) {
    if (input.athleteKey && index.byAthleteKey.has(input.athleteKey)) {
      return index.byAthleteKey.get(input.athleteKey);
    }
    if (input.matchKey && index.byMatchKey.has(input.matchKey)) {
      return index.byMatchKey.get(input.matchKey);
    }
  }
  return null;
}

/**
 * 현재 매핑 적재 상태(진단용). person_no 등 민감정보는 포함하지 않는다.
 * @returns {{ enabled: boolean, mappedAthleteKeys: number, canonicalGroups: number, mtimeMs: number }}
 */
function getStatus() {
  const index = loadIndex();
  return {
    enabled: index.count > 0,
    mappedAthleteKeys: index.byAthleteKey.size,
    matchKeys: index.byMatchKey.size,
    canonicalGroups: index.count,
    mtimeMs: cacheMtimeMs,
    threshold: AUTO_MERGE_THRESHOLD,
  };
}

/** 테스트/운영용 캐시 무효화. */
function clearCache() {
  cache = null;
  cacheMtimeMs = -1;
  cacheLoadedEmpty = false;
  cacheCheckedAt = 0;
}

module.exports = {
  resolve,
  getStatus,
  clearCache,
  AUTO_MERGE_THRESHOLD,
  MAP_PATH,
};
