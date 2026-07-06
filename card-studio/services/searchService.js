/**
 * 검색 서비스
 *
 * data/raw/ 및 data/normalized/ 디렉토리의 JSON 파일을 순회하여
 * 선수명 또는 소속으로 검색하고, 종목별로 그룹핑된 결과를 반환합니다.
 *
 * 결과 구조:
 *   - 종목(pureEvent)별 섹션으로 분리
 *   - 각 섹션 안에서 성별+라운드별 서브섹션
 *   - 매칭 선수 행에 isMatch: true 표시
 *   - 매칭 선수의 최고 순위가 높은 종목이 상위에 정렬
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const resultsStore = require('./resultsStore');
const dataRequestService = require('./dataRequestService');
const { classifyEvent, needsWind } = require('../eventClassifier');

// suppression(검토중/삭제) 적용 시 마스킹 표시값
const MASKED_NAME = '비공개 요청 처리 중';

class SearchService {
  /**
   * 사용 가능한 대회 목록을 반환합니다.
   * @returns {Array<{ filename: string, competition: string, year: string, period: string, venue: string }>}
   */
  getCompetitions() {
    // 1순위: data/results/<year>.json (git 추적 실데이터, resultsStore 어댑터)
    if (resultsStore.hasData()) {
      // 합성 파일명은 대회별로 고유하므로 별도 dedup 불필요
      return resultsStore.listCompetitions().map(c => ({
        filename: c.filename,
        competition: c.competition,
        year: c.year || '',
        period: c.period || '',
        venue: c.venue || '',
        collectedAt: c.collectedAt || '',
      }));
    }

    // 2순위(레거시): data/raw/<...>_raw.json (개발 환경에서만 존재)
    const rawDir = config.dirs.raw;

    if (!fs.existsSync(rawDir)) return [];

    const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));

    // BUG2/BUG6: 같은 대회명의 파일이 여러 개일 때 최신 파일만 표시
    const compMap = {};  // compName → { entry, ts }

    for (const file of files) {
      try {
        const filePath = path.join(rawDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const meta = data.meta || {};
        const compName = meta.competition_name || this._extractCompFromEvents(data);
        const ts = meta.crawled_at || file;

        const entry = {
          filename: file,
          competition: compName,
          year: meta.year || '',
          period: meta.period || '',
          venue: meta.venue || '',
          collectedAt: meta.crawled_at || '',
        };

        if (!compMap[compName] || ts > compMap[compName].ts) {
          compMap[compName] = { entry, ts };
        }
      } catch (e) {
        // 파싱 실패 파일 건너뜀
      }
    }

    return Object.values(compMap).map(v => v.entry);
  }

  /**
   * 선수명 또는 소속으로 검색합니다.
   *
   * @param {Object} params
   * @param {string} params.query - 검색어 (최소 2글자)
   * @param {string} [params.type='all'] - 검색 대상: 'name', 'affiliation', 'all'
   * @param {string} [params.competition] - 대회 파일명 필터 (없으면 전체)
   * @param {number} [params.contextRows=3] - 매칭 선수 주변 표시할 행 수
   * @returns {{ query, type, competitions: [], totalMatches, totalEvents, sections: [] }}
   */
  search(params = {}) {
    const { query, type = 'all', competition, contextRows = 3 } = params;

    if (!query || query.trim().length < 2) {
      return { query, type, competitions: [], totalMatches: 0, totalEvents: 0, sections: [] };
    }

    const q = query.trim();

    // 대상 데이터 로드 (resultsStore 우선, data/raw 폴백)
    const targets = this._loadTargetData(competition);

    if (targets.length === 0) {
      return { query: q, type, competitions: [], totalMatches: 0, totalEvents: 0, sections: [] };
    }

    // 전체 매칭 수집
    const allMatches = [];  // { compName, event (full label), pureEvent, gender, round, eventType, wind, rank, results[], matchIndices[] }

    for (const target of targets) {
      try {
        const file = target.filename;
        const data = target.data;
        const meta = data.meta || {};
        const events = data.events || [];
        const compName = meta.competition_name || this._extractCompFromEvents(data);
        const provenance = {
          provider: 'KAAF',
          sourceType: 'public_result',
          sourceTier: 'L',
          sourceId: file,
          sourceUrl: meta.source_url || '',
          capturedAt: meta.crawled_at || '',
          sourceLabel: '대한육상연맹 공개 경기결과',
          scopeNotice: '공개 경기기록을 모아 정리했어요. 공식 기록 서비스는 아니에요.',
          correctionUrl: '/data-request',
        };

        for (const ev of events) {
          const parsed = this._parseEventLabel(ev.event);
          if (!parsed) continue;

          const { gender, pureEvent, round } = parsed;
          const division = ev.division || '';
          const results = ev.results || [];

          // suppression(정정/삭제 요청) 사전 판정: 행별 null | 'mask' | 'hide' | 'remove'
          //   mask   : 검토 중 — 검색 매칭 제외, 단 컨텍스트로는 "비공개 요청 처리 중" 마스킹 노출
          //   hide   : 검색 비노출(de-index) — 검색 매칭·컨텍스트 모두에서 완전 제외(결과표 /events 에선 정상)
          //   remove : 예외적 삭제 — 모든 노출에서 완전 제외
          const suppression = results.map(r =>
            dataRequestService.checkSuppression({
              name: r.name,
              affiliation: r.affiliation,
              competition: compName,
            })
          );

          // 매칭 인덱스 찾기 (suppression 대상은 검색 매칭에서 제외)
          const matchIndices = [];
          for (let i = 0; i < results.length; i++) {
            if (suppression[i]) continue; // 검토중/검색비노출/삭제 건은 검색으로 드러나지 않음
            const r = results[i];
            const matchName = (type === 'all' || type === 'name') && r.name && r.name.includes(q);
            const matchAff = (type === 'all' || type === 'affiliation') && r.affiliation && r.affiliation.includes(q);
            if (matchName || matchAff) {
              matchIndices.push(i);
            }
          }

          if (matchIndices.length === 0) continue;

          const eventType = classifyEvent(ev.event);
          const hasWind = needsWind(ev.event);

          allMatches.push({
            compName,
            compFile: file,
            eventFull: ev.event,
            pureEvent,
            gender,
            round,
            division,
            eventType,
            hasWind,
            wind: ev.wind || null,
            date: ev.date || '',
            venue: ev.venue || '',
            results: results.map((r, idx) => {
              const sup = suppression[idx];
              return {
                rank: r.rank,
                // 컨텍스트로 함께 노출되는 주변 행이 suppression 대상이면 마스킹
                name: sup ? MASKED_NAME : r.name,
                affiliation: sup ? '' : r.affiliation,
                record: sup ? '' : r.record,
                wind: sup ? null : (r.wind || null),
                note: sup ? '' : (r.note || ''),
                newRecord: sup ? '' : (r.newRecord || ''),
                isMatch: matchIndices.includes(idx),
                suppressed: sup || undefined,
                athleteId: sup ? undefined : this._stableAthleteId(r.name, r.affiliation),
                provenance: sup ? undefined : provenance,
              };
            }),
            matchIndices,
            bestMatchRank: Math.min(...matchIndices.map(i => results[i].rank || 999)),
          });
        }
      } catch (e) {
        // 파싱 실패 건너뜀
      }
    }

    if (allMatches.length === 0) {
      return { query: q, type, competitions: [], totalMatches: 0, totalEvents: 0, sections: [] };
    }

    // 종목별 그룹핑
    const sectionMap = {};  // pureEvent => { event, eventType, subSections: [] }

    for (const m of allMatches) {
      if (!sectionMap[m.pureEvent]) {
        sectionMap[m.pureEvent] = {
          event: m.pureEvent,
          eventType: m.eventType,
          bestMatchRank: m.bestMatchRank,
          subSections: [],
        };
      }

      // bestMatchRank 갱신 (더 높은 순위가 있으면)
      if (m.bestMatchRank < sectionMap[m.pureEvent].bestMatchRank) {
        sectionMap[m.pureEvent].bestMatchRank = m.bestMatchRank;
      }

      // 결과에서 표시할 행 결정 (컨텍스트 기반)
      // 검색 응답의 공개 카운트에서는 삭제(remove)와 검색비노출(hide) 모두 제외한다.
      const publicResults = m.results.filter(r => r.suppressed !== 'remove' && r.suppressed !== 'hide');
      const visibleResults = this._getContextResults(m.results, m.matchIndices, contextRows);

      // BUG4: hasMore 판정에서 separator 행 제외
      const visibleDataCount = visibleResults.filter(r => !r.isSeparator).length;

      sectionMap[m.pureEvent].subSections.push({
        label: `${m.gender} ${m.round}`,
        gender: m.gender,
        round: m.round,
        division: m.division,
        date: m.date,
        wind: m.wind,
        hasWind: m.hasWind,
        compName: m.compName,
        provenance: m.results.find(r => r.provenance)?.provenance,
        totalAthletes: publicResults.length,
        results: visibleResults,
        allResults: publicResults,
        hasMore: visibleDataCount < publicResults.length,
      });
    }

    // 섹션 정렬: 매칭 선수의 최고 순위가 높은 종목이 위로
    const sections = Object.values(sectionMap).sort((a, b) => a.bestMatchRank - b.bestMatchRank);

    // 각 섹션 내 서브섹션 정렬: 성별(남자 먼저), 라운드(결승 먼저)
    const roundOrder = { '결승': 0, '준결승': 1, '1차예선': 2, '예선': 3 };
    for (const section of sections) {
      section.subSections.sort((a, b) => {
        if (a.gender !== b.gender) return a.gender === '남자' ? -1 : 1;
        return (roundOrder[a.round] || 9) - (roundOrder[b.round] || 9);
      });
    }

    // 통계
    const totalMatches = allMatches.reduce((sum, m) => sum + m.matchIndices.length, 0);
    const compSet = new Set(allMatches.map(m => m.compName));

    return {
      query: q,
      type,
      competitions: [...compSet],
      totalMatches,
      totalEvents: sections.length,
      sections,
    };
  }

  // ── 내부 헬퍼 ──

  /**
   * 검색 대상 대회를 legacy raw-file 구조로 반환합니다.
   * resultsStore(실데이터)를 우선 사용하고, 없으면 data/raw 를 폴백합니다.
   * @param {string} [competition] - 특정 파일명만 대상으로 제한
   * @returns {Array<{filename:string, data:Object}>}
   */
  _loadTargetData(competition) {
    // 1순위: resultsStore
    if (resultsStore.hasData()) {
      let filenames = resultsStore.listFilenames();
      if (competition) filenames = filenames.filter(f => f === competition);
      return filenames
        .map(f => ({ filename: f, data: resultsStore.getRawByFilename(f) }))
        .filter(x => x.data);
    }

    // 2순위(레거시): data/raw
    const rawDir = config.dirs.raw;
    if (!fs.existsSync(rawDir)) return [];

    let files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));
    if (competition) {
      files = files.filter(f => f === competition);
    } else {
      files = this._deduplicateFiles(rawDir, files);
    }

    const out = [];
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf-8'));
        out.push({ filename: file, data });
      } catch (e) {
        // 파싱 실패 건너뜀
      }
    }
    return out;
  }

  _stableAthleteId(name, affiliation) {
    const key = `${String(name || '').trim()}|${String(affiliation || '').trim()}`;
    if (key === '|') return '';
    return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
  }

  /**
   * "남자 100m 결승" 같은 이벤트 라벨을 파싱합니다.
   */
  _parseEventLabel(eventLabel) {
    const m = (eventLabel || '').match(/^(남자|여자)\s+(.+?)\s+(결승|예선|준결승|1차예선)$/);
    if (!m) return null;
    return { gender: m[1], pureEvent: m[2], round: m[3] };
  }

  /**
   * 같은 대회 이름의 파일이 여러 개일 때 최신 파일만 남깁니다.
   * 파일명이 타임스탬프_대회명_raw.json 패턴이므로 같은 대회명 → 가장 늦은 타임스탬프 선택.
   */
  _deduplicateFiles(rawDir, files) {
    const compMap = {};  // compName → { filename, timestamp }
    for (const file of files) {
      try {
        const filePath = path.join(rawDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const compName = (data.meta && data.meta.competition_name) || this._extractCompFromEvents(data);
        const ts = (data.meta && data.meta.crawled_at) || file;

        if (!compMap[compName] || ts > compMap[compName].ts) {
          compMap[compName] = { filename: file, ts };
        }
      } catch (e) {
        // 파싱 실패 시 무시
      }
    }
    return Object.values(compMap).map(v => v.filename);
  }

  /**
   * events 배열에서 대회명 추출 (meta가 없을 때 폴백)
   */
  _extractCompFromEvents(data) {
    const events = data.events || data;
    if (Array.isArray(events) && events.length > 0 && events[0].competition) {
      return events[0].competition;
    }
    return '(알 수 없는 대회)';
  }

  /**
   * 매칭 인덱스 주변 컨텍스트를 포함한 표시 행을 결정합니다.
   * 상위 3위 + 매칭 선수 +-1위 범위를 합산합니다.
   */
  _getContextResults(results, matchIndices, contextRows) {
    const visibleSet = new Set();
    // 검색 화면에서 컨텍스트 행으로도 노출하지 않는 모드: 삭제(remove) + 검색비노출(hide).
    // 마스킹(mask, under_review)은 "비공개 요청 처리 중"으로 컨텍스트 노출은 유지한다.
    const isSearchExcluded = (r) => r.suppressed === 'remove' || r.suppressed === 'hide';
    const countPublicRowsBetween = (startExclusive, endExclusive) => {
      let count = 0;
      for (let i = startExclusive + 1; i < endExclusive; i++) {
        if (!isSearchExcluded(results[i])) {
          count++;
        }
      }
      return count;
    };

    // 항상 상위 N위 포함
    for (let i = 0; i < Math.min(contextRows, results.length); i++) {
      visibleSet.add(i);
    }

    // 매칭 선수 및 주변 +-1 포함
    for (const idx of matchIndices) {
      for (let offset = -1; offset <= 1; offset++) {
        const target = idx + offset;
        if (target >= 0 && target < results.length) {
          visibleSet.add(target);
        }
      }
    }

    // 정렬된 인덱스 목록
    const sortedIndices = [...visibleSet].sort((a, b) => a - b);

    // 결과 행 생성 (간격이 있으면 separator 삽입)
    const output = [];
    let lastIdx = -1;

    for (const idx of sortedIndices) {
      if (isSearchExcluded(results[idx])) {
        continue;
      }
      const skipped = lastIdx >= 0 ? countPublicRowsBetween(lastIdx, idx) : 0;
      if (skipped > 0) {
        output.push({ isSeparator: true, skipped });
      }
      output.push({ ...results[idx], _index: idx });
      lastIdx = idx;
    }

    // 마지막 뒤에 더 있으면
    const trailingSkipped = lastIdx >= 0 ? countPublicRowsBetween(lastIdx, results.length) : 0;
    if (trailingSkipped > 0) {
      output.push({ isSeparator: true, skipped: trailingSkipped });
    }

    return output;
  }
}

module.exports = new SearchService();
