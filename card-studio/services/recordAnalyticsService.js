const crypto = require('crypto');

const resultsStore = require('./resultsStore');
const dataRequestService = require('./dataRequestService');
const identityResolver = require('./identityResolver');
const { classifyEvent, needsWind } = require('../eventClassifier');

const INVALID_MARK = /^(dns|dnf|dq|dsq|nm|nt|nr|-|)$/i;
const FIELD_HINTS = /(높이|멀리|세단|장대|포환|원반|창던|공던|던지기|투포환|HJ|LJ|TJ|PV|SP|DT|JT|HT)/i;
const ROAD_HINTS = /(마라톤|하프|10km|5km|road|도로|경보)/i;
const RELAY_HINTS = /(계주|릴레이|relay|4x|400mR|1600mR)/i;
const WIND_RELEVANT = /(^|\D)(100m|200m|110mH|100mH)(\D|$)|멀리|세단|LJ|TJ/i;

let cachedIndex = null;
let cachedSignature = '';

function getIndex() {
  const signature = buildSignature();
  if (cachedIndex && cachedSignature === signature) return cachedIndex;

  cachedIndex = buildIndex();
  cachedSignature = signature;
  return cachedIndex;
}

function searchAthletes(query, limit = 12) {
  const q = clean(query).toLowerCase();
  if (q.length < 2) return [];

  const safeLimit = clampInt(limit, 12, 1, 30);
  return getIndex().athletes
    .filter((athlete) => athlete.searchText.includes(q))
    .sort((a, b) => b.recordCount - a.recordCount || a.name.localeCompare(b.name))
    .slice(0, safeLimit)
    .map(toSearchCard);
}

function getAthleteSummary(athleteKey) {
  const key = clean(athleteKey, 120);
  const athlete = getIndex().athleteByKey.get(key);
  if (!athlete) return null;

  const records = athlete.records.slice().sort(sortByDateAsc);
  const comparableRecords = records.filter((record) => record.isComparable);
  const best = pickBest(comparableRecords) || pickBest(records);
  const latest = records.slice().sort(sortByDateDesc)[0] || null;
  const currentSeason = latest?.season || new Date().getFullYear();
  const seasonRecords = comparableRecords.filter((record) => record.season === currentSeason);
  const seasonBest = pickBest(seasonRecords);
  const trailRecords = records.filter((record) => record.eventKey === (best?.eventKey || records[0]?.eventKey));
  const delta = comparableDelta(trailRecords);

  return {
    athlete: toSearchCard(athlete),
    summary: {
      indexedBest: best ? toPublicRecord(best) : null,
      seasonBest: seasonBest ? toPublicRecord(seasonBest) : null,
      latest: latest ? toPublicRecord(latest) : null,
      delta,
      indexedResultCount: records.length,
      comparableResultCount: comparableRecords.length,
      sourceScope: 'AthleteTime indexed public results',
      disclaimer: 'AthleteTime이 모은 공개 기록이에요. 공식 기록 서비스는 아니에요.',
    },
    events: buildAthleteEventSummaries(records),
    recordTrail: trailRecords.map(toTrailPoint),
    records: records.slice().sort(sortByDateDesc).slice(0, 80).map(toPublicRecord),
  };
}

function getSeasonRecords({ season, eventKey, divisionKey, athleteKey, limit = 100 } = {}) {
  const idx = getIndex();
  const safeSeason = Number.parseInt(season, 10) || idx.latestSeason;
  const safeEventKey = clean(eventKey, 80) || idx.defaultEventKey;
  const safeDivisionKey = clean(divisionKey, 120) || idx.defaultDivisionKeyByEvent.get(safeEventKey) || '';
  const safeLimit = clampInt(limit, 100, 10, 300);

  const tableKey = seasonTableKey(safeSeason, safeEventKey, safeDivisionKey);
  const rows = idx.seasonTableByKey.get(tableKey) || [];
  const limitedRows = rows.slice(0, safeLimit).map((row) => ({
    ...row,
    highlighted: !!athleteKey && row.athleteKey === athleteKey,
  }));

  return {
    season: safeSeason,
    eventKey: safeEventKey,
    divisionKey: safeDivisionKey,
    eventLabel: idx.eventLabelByKey.get(safeEventKey) || safeEventKey,
    divisionLabel: idx.divisionLabelByKey.get(safeDivisionKey) || safeDivisionKey,
    totalIndexedAthletes: rows.length,
    rows: limitedRows,
    filters: getFilters(),
    disclaimer: '모은 기록을 빠른 순으로 정렬했어요. 빠진 대회가 있으면 실제와 다를 수 있어요.',
  };
}

function getFilters() {
  const idx = getIndex();
  return {
    seasons: idx.seasons,
    events: idx.events,
    divisions: idx.divisions,
  };
}

// 종목별 "보유 기록량" 집계 — 개인 식별 정보(이름/소속/식별자)는 반환하지 않는다.
// 랜딩 진입용 칩을 사실 기반("기록이 많은 종목")으로 채우기 위한 익명 통계.
function getPopularEvents({ season, limit = 8 } = {}) {
  const idx = getIndex();
  const safeSeason = season != null ? Number.parseInt(season, 10) || null : null;
  const safeLimit = clampInt(limit, 8, 1, 24);

  const byEvent = new Map();
  for (const record of idx.records) {
    if (safeSeason && record.season !== safeSeason) continue;
    if (!record.eventKey) continue;
    if (!byEvent.has(record.eventKey)) {
      byEvent.set(record.eventKey, {
        key: record.eventKey,
        label: idx.eventLabelByKey.get(record.eventKey) || record.eventKey,
        recordCount: 0,
        athleteKeys: new Set(),
      });
    }
    const bucket = byEvent.get(record.eventKey);
    bucket.recordCount += 1;
    if (record.athleteKey) bucket.athleteKeys.add(record.athleteKey);
  }

  const events = [...byEvent.values()]
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      recordCount: bucket.recordCount,
      athleteCount: bucket.athleteKeys.size,
    }))
    .sort((a, b) => b.recordCount - a.recordCount || a.label.localeCompare(b.label))
    .slice(0, safeLimit);

  return {
    season: safeSeason || idx.latestSeason,
    events,
    note: '공개 기록을 종목별로 모은 수예요. 개인 정보는 담지 않았어요.',
  };
}

function warmup() {
  const startedAt = Date.now();
  const idx = getIndex();
  return {
    ms: Date.now() - startedAt,
    records: idx.records.length,
    athletes: idx.athletes.length,
    seasons: idx.seasons.length,
    events: idx.events.length,
  };
}

function buildIndex() {
  const records = [];
  const athleteByKey = new Map();
  const seasonBuckets = new Map();
  const eventLabelByKey = new Map();
  const divisionLabelByKey = new Map();
  const defaultDivisionByEventCounts = new Map();
  const filenames = resultsStore.listFilenames();

  for (const filename of filenames) {
    const data = resultsStore.getRawByFilename(filename);
    if (!data) continue;

    const meta = data.meta || {};
    const competitionName = clean(meta.competition_name, 220);
    const competitionId = clean(meta.competition_id || meta.to_cd || filename, 120);
    const season = Number.parseInt(meta.year, 10) || yearFromText(meta.period) || 0;
    const competitionDate = dateFromPeriod(meta.period) || String(season || '');

    for (const event of data.events || []) {
      const eventLabel = clean(event.event, 160);
      const divisionLabel = clean(event.division, 120) || inferDivisionLabel(eventLabel);
      const eventMeta = normalizeEvent(eventLabel, divisionLabel);
      if (eventMeta.eventKey && !eventLabelByKey.has(eventMeta.eventKey)) {
        eventLabelByKey.set(eventMeta.eventKey, eventMeta.eventLabel);
      }
      if (eventMeta.divisionKey) {
        divisionLabelByKey.set(eventMeta.divisionKey, eventMeta.divisionLabel);
        const counterKey = eventMeta.eventKey;
        if (!defaultDivisionByEventCounts.has(counterKey)) defaultDivisionByEventCounts.set(counterKey, new Map());
        const counts = defaultDivisionByEventCounts.get(counterKey);
        counts.set(eventMeta.divisionKey, (counts.get(eventMeta.divisionKey) || 0) + 1);
      }

      for (const result of event.results || []) {
        const name = clean(result.name, 100);
        if (!name) continue;
        if (!isIndexableAthleteName(name)) continue;

        const team = clean(result.affiliation, 100);
        // suppression 은 원본 소속과 정규화 소속 양쪽으로 확인해
        // 시·도 표기 변형(예: "대구체육고" vs "대구광역시-대구체육고")까지 일관되게 차단한다.
        const normalizedTeam = normalizeTeam(team);
        const suppression =
          dataRequestService.checkSuppression({
            name,
            affiliation: team,
            competition: competitionName,
          }) ||
          (normalizedTeam !== team
            ? dataRequestService.checkSuppression({
                name,
                affiliation: normalizedTeam,
                competition: competitionName,
              })
            : null);
        if (suppression) continue;

        const parsed = parseRecord(result.record, eventMeta.direction);
        if (!parsed) continue;

        const wind = clean(result.wind || event.wind, 20);
        const windLegal = isWindLegal(wind);
        const needsWindCheck = isWindRelevant(eventLabel);
        const isCombinedTotalEvent = /^combined-/.test(eventMeta.eventKey);
        const isRoadRelayEvent = /역전/.test(eventLabel);
        const isComparable = !!eventMeta.eventKey
          && !!eventMeta.divisionKey
          && !eventMeta.isRelay
          && !isCombinedTotalEvent
          && !isRoadRelayEvent
          && Number.isFinite(parsed.value)
          && parsed.value > 0
          && (!needsWindCheck || !wind || windLegal);
        // Layer2 키(현행): 같은 시즌·같은 소속을 묶는다.
        const baseKey = stableId(`${name}|${normalizeTeam(team)}`);
        // Layer3(동일인 식별): 매핑이 있으면 canonicalId 로, 없으면 baseKey 로 graceful fallback.
        // 매핑 파일이 비어 있으면 resolve()가 항상 null → athleteKey === baseKey (현행과 100% 동일).
        // Guard: never use Layer3 for bulk person_no cleanup or automatic homonym merges.
        const athleteKey = identityResolver.resolve({
          athleteKey: baseKey,
          matchKey: `${name}|${normalizeTeam(team)}`,
        }) || baseKey;
        const recordId = stableId([
          athleteKey,
          competitionId,
          eventLabel,
          result.rank,
          result.record,
          event.date || competitionDate,
        ].join('|'));

        const record = {
          id: recordId,
          athleteKey,
          name,
          team,
          season,
          competitionId,
          competitionName,
          date: clean(event.date, 20) || competitionDate,
          venue: clean(event.venue || meta.venue, 120),
          eventKey: eventMeta.eventKey,
          eventLabel: eventMeta.eventLabel,
          rawEvent: eventLabel,
          divisionKey: eventMeta.divisionKey,
          divisionLabel: eventMeta.divisionLabel,
          phase: eventMeta.phase,
          recordValue: parsed.value,
          recordDisplay: parsed.display,
          direction: eventMeta.direction,
          rank: Number.parseInt(result.rank, 10) || null,
          wind: wind || null,
          windLegal,
          isComparable,
          note: clean(result.note || result.newRecord, 120),
          source: {
            provider: 'KAAF',
            sourceType: 'public_result',
            sourceId: `${filename}:${recordId}`,
            sourceUrl: clean(meta.source_url, 300),
            capturedAt: clean(meta.crawled_at, 40),
          },
        };

        records.push(record);
        if (!athleteByKey.has(athleteKey)) {
          athleteByKey.set(athleteKey, {
            athleteKey,
            name,
            team,
            records: [],
            years: new Set(),
            events: new Set(),
            divisions: new Set(),
            teams: new Set(team ? [team] : []),
            searchText: '',
          });
        }

        const athlete = athleteByKey.get(athleteKey);
        athlete.records.push(record);
        if (season) athlete.years.add(season);
        if (record.eventLabel) athlete.events.add(record.eventLabel);
        if (record.divisionLabel) athlete.divisions.add(record.divisionLabel);
        if (team) athlete.teams.add(team);

        if (record.isComparable) {
          const key = seasonTableKey(season, record.eventKey, record.divisionKey);
          if (!seasonBuckets.has(key)) seasonBuckets.set(key, []);
          seasonBuckets.get(key).push(record);
        }
      }
    }
  }

  const athletes = [...athleteByKey.values()].map((athlete) => {
    const years = [...athlete.years].sort((a, b) => a - b);
    const events = [...athlete.events].sort();
    const divisions = [...athlete.divisions].sort();
    const teams = [...athlete.teams].sort();
    return {
      ...athlete,
      years,
      events,
      divisions,
      teams,
      recordCount: athlete.records.length,
      searchText: [athlete.name, athlete.team, ...teams, ...events, ...divisions].join(' ').toLowerCase(),
      ambiguity: 'name_team',
    };
  });

  const seasonTableByKey = new Map();
  for (const [key, bucket] of seasonBuckets.entries()) {
    seasonTableByKey.set(key, rankSeasonBucket(bucket));
  }

  const seasons = [...new Set(records.map((record) => record.season).filter(Boolean))].sort((a, b) => b - a);
  const events = [...eventLabelByKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const divisions = [...divisionLabelByKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const defaultEventKey = events[0]?.key || '';
  const defaultDivisionKeyByEvent = new Map();
  for (const [eventKey, counts] of defaultDivisionByEventCounts.entries()) {
    defaultDivisionKeyByEvent.set(eventKey, [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '');
  }

  return {
    records,
    athletes,
    athleteByKey,
    seasonTableByKey,
    seasons,
    events,
    divisions,
    latestSeason: seasons[0] || new Date().getFullYear(),
    defaultEventKey,
    defaultDivisionKeyByEvent,
    eventLabelByKey,
    divisionLabelByKey,
  };
}

function rankSeasonBucket(bucket) {
  const bestByAthlete = new Map();
  for (const record of bucket) {
    const current = bestByAthlete.get(record.athleteKey);
    if (!current || compareRecords(record, current) < 0) {
      bestByAthlete.set(record.athleteKey, record);
    }
  }

  const sorted = [...bestByAthlete.values()].sort(compareRecords);
  let previousValue = null;
  let previousRank = 0;
  return sorted.map((record, index) => {
    const sameAsPrevious = previousValue != null && Math.abs(record.recordValue - previousValue) < 0.000001;
    const rank = sameAsPrevious ? previousRank : index + 1;
    previousValue = record.recordValue;
    previousRank = rank;
    return {
      rank,
      athleteKey: record.athleteKey,
      name: record.name,
      team: record.team,
      record: record.recordDisplay,
      recordValue: record.recordValue,
      date: record.date,
      competitionName: record.competitionName,
      wind: record.wind,
      windLegal: record.windLegal,
      source: record.source,
    };
  });
}

function normalizeEvent(eventLabel, divisionLabel) {
  const raw = clean(eventLabel, 160);
  const division = clean(divisionLabel, 120);
  const phase = inferPhase(raw);
  const rawWithoutPhase = raw
    .replace(/\b(final|semi-final|semi|heat|prelim|qualifying)\b/gi, ' ')
    .replace(/결승|준결승|예선|본선|타임레이스|타임\s*레이스/g, ' ');
  const eventName = rawWithoutPhase
    .replace(/^(남자|여자|남|여)\s*/g, '')
    .replace(/^(M|W|U)\d{1,2}\s*/i, '')
    // 다종목 차수/조 접두 제거: "1C 200m", "2X 800m", "1Y 100m" 등
    .replace(/^\d{1,2}[A-Za-z]\s+/g, '')
    .replace(/^[A-Za-z]{1,2}\d{0,2}\s+/g, '')
    .replace(/^\d{1,2}\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 혼성경기(N종) 구간 종목과 계주를 일반 단일 종목과 분리한다.
  // - "10종경기"/"7종" 자체(총점)는 점수가 높을수록 우수(higher).
  // - 그러나 "1500m(10종)"처럼 혼성경기 안의 트랙/필드 구간은
  //   일반 1500m과 섞이면 안 되고, 방향도 해당 구간의 물리 단위로 판정해야 한다.
  const isCombined = /\d+\s*종/.test(raw);
  const isCombinedTotal = isCombined && /\d+\s*종\s*경기|^\s*\d+\s*종\s*$/.test(eventName || raw);
  const isRelay = RELAY_HINTS.test(raw);

  const baseEventKey = canonicalEventKey(eventName || raw);
  let eventKey = baseEventKey;
  if (isCombinedTotal) {
    // 혼성경기 총점은 그 자체로 독립 종목 키.
    eventKey = `combined-${baseEventKey}`;
  } else if (isCombined) {
    // 혼성경기 구간 종목은 일반 종목과 키를 분리.
    eventKey = `${baseEventKey}-combined`;
  } else if (isRelay) {
    // 계주는 개인 종목과 키를 분리.
    eventKey = `${baseEventKey}-relay`;
  }

  // 방향(direction) 판정: 라벨이 아니라 "기록의 물리 단위"로 결정한다.
  // - 혼성경기 총점: 점수가 높을수록 우수 → higher
  // - 그 외에는 필드(거리·높이) = higher, 트랙·도로·계주(시간) = lower
  let direction;
  if (isCombinedTotal) {
    direction = 'higher';
  } else {
    const segmentName = (eventName || raw).replace(/\(?\s*\d+\s*종\s*\)?/g, '').trim();
    const eventType = classifyEvent(segmentName);
    direction = FIELD_HINTS.test(segmentName) || eventType === 'field' ? 'higher' : 'lower';
  }

  return {
    eventKey,
    eventLabel: canonicalEventLabel(eventName || raw, baseEventKey),
    divisionKey: stableSlug(division || inferDivisionLabel(raw)),
    divisionLabel: division || inferDivisionLabel(raw) || '구분 미상',
    phase,
    direction,
    isRelay,
    isRoad: ROAD_HINTS.test(raw),
  };
}

function canonicalEventKey(value) {
  const text = clean(value, 120).replace(/\s+/g, '').toLowerCase();
  const patterns = [
    ['half-marathon', /하프|half/],
    ['marathon', /마라톤|marathon/],
    ['10000m', /10000m/],
    ['5000m', /5000m/],
    ['3000m', /3000m/],
    ['1500m', /1500m/],
    ['800m', /800m/],
    ['400m-hurdles', /400m(h|허들|장애물)/],
    ['110m-hurdles', /110m(h|허들)/],
    ['100m-hurdles', /100m(h|허들)/],
    ['400m', /400m/],
    ['200m', /200m/],
    ['100m', /100m/],
    ['high-jump', /높이|hj/],
    ['long-jump', /멀리|lj/],
    ['triple-jump', /세단|삼단|tj/],
    ['pole-vault', /장대|pv/],
    ['shot-put', /포환|sp/],
    ['discus', /원반|dt/],
    ['javelin', /창던|jt/],
    ['hammer', /해머|ht/],
  ];
  return patterns.find(([, pattern]) => pattern.test(text))?.[0] || stableSlug(text);
}

function canonicalEventLabel(value, eventKey) {
  const labels = {
    'marathon': '마라톤',
    'half-marathon': '하프마라톤',
    '400m-hurdles': '400m 허들',
    '110m-hurdles': '110m 허들',
    '100m-hurdles': '100m 허들',
    'high-jump': '높이뛰기',
    'long-jump': '멀리뛰기',
    'triple-jump': '세단뛰기',
    'pole-vault': '장대높이뛰기',
    'shot-put': '포환던지기',
    'discus': '원반던지기',
    'javelin': '창던지기',
    'hammer': '해머던지기',
  };
  return labels[eventKey] || clean(value, 120) || eventKey;
}

function inferDivisionLabel(value) {
  const text = clean(value, 120);
  if (/남자|남\b|^M/i.test(text)) return '남자부';
  if (/여자|여\b|^W/i.test(text)) return '여자부';
  return '구분 미상';
}

function inferPhase(value) {
  const text = clean(value, 160);
  if (/준결승|semi/i.test(text)) return 'semi-final';
  if (/예선|heat|prelim|qual/i.test(text)) return 'heat';
  if (/결승|final/i.test(text)) return 'final';
  return 'final';
}

function parseRecord(mark, direction) {
  const display = clean(mark, 40);
  if (!display || INVALID_MARK.test(display)) return null;

  const numeric = display.replace(/,/g, '').replace(/[^\d:.]/g, '');
  if (!numeric) return null;

  if (numeric.includes(':')) {
    const parts = numeric.split(':').map(Number);
    if (parts.some((part) => Number.isNaN(part))) return null;
    return { display, value: parts.reduce((total, part) => total * 60 + part, 0), direction };
  }

  const value = Number.parseFloat(numeric);
  if (!Number.isFinite(value)) return null;
  return { display, value, direction };
}

function buildAthleteEventSummaries(records) {
  const byEvent = new Map();
  for (const record of records) {
    if (!byEvent.has(record.eventKey)) byEvent.set(record.eventKey, []);
    byEvent.get(record.eventKey).push(record);
  }
  return [...byEvent.entries()]
    .map(([eventKey, items]) => {
      const comparable = items.filter((item) => item.isComparable);
      const best = pickBest(comparable) || pickBest(items);
      return {
        eventKey,
        eventLabel: items[0]?.eventLabel || eventKey,
        recordCount: items.length,
        best: best ? toPublicRecord(best) : null,
      };
    })
    .sort((a, b) => b.recordCount - a.recordCount);
}

function comparableDelta(records) {
  const comparable = records.filter((record) => record.isComparable).sort(sortByDateAsc);
  if (comparable.length < 2) return null;
  const first = comparable[0];
  const latest = comparable[comparable.length - 1];
  const rawDelta = latest.recordValue - first.recordValue;
  const improved = latest.direction === 'higher' ? rawDelta > 0 : rawDelta < 0;
  return {
    from: toPublicRecord(first),
    to: toPublicRecord(latest),
    rawDelta,
    display: formatDelta(rawDelta, latest.direction),
    improved,
  };
}

function formatDelta(delta, direction) {
  const absolute = Math.abs(delta);
  const sign = direction === 'higher'
    ? delta >= 0 ? '+' : '-'
    : delta <= 0 ? '-' : '+';
  return `${sign}${absolute.toFixed(2)}`;
}

function pickBest(records) {
  if (!records || records.length === 0) return null;
  return records.slice().sort(compareRecords)[0];
}

function compareRecords(a, b) {
  if (a.direction === 'higher') return b.recordValue - a.recordValue;
  return a.recordValue - b.recordValue;
}

function sortByDateAsc(a, b) {
  return String(a.date || '').localeCompare(String(b.date || ''));
}

function sortByDateDesc(a, b) {
  return String(b.date || '').localeCompare(String(a.date || ''));
}

function toSearchCard(athlete) {
  const teams = Array.isArray(athlete.teams) ? athlete.teams : [...(athlete.teams || [])].sort();
  const years = Array.isArray(athlete.years) ? athlete.years : [...(athlete.years || [])].sort((a, b) => a - b);
  const events = Array.isArray(athlete.events) ? athlete.events : [...(athlete.events || [])].sort();
  const divisions = Array.isArray(athlete.divisions) ? athlete.divisions : [...(athlete.divisions || [])].sort();

  return {
    athleteKey: athlete.athleteKey,
    name: athlete.name,
    team: athlete.team,
    teams,
    years,
    events,
    divisions,
    recordCount: athlete.recordCount || athlete.records?.length || 0,
    ambiguity: athlete.ambiguity || 'name_team',
    note: '동명이인 가능성이 있으면 소속과 연도를 확인해 주세요.',
  };
}

function toTrailPoint(record) {
  return {
    id: record.id,
    date: record.date,
    season: record.season,
    value: record.recordValue,
    record: record.recordDisplay,
    eventLabel: record.eventLabel,
    competitionName: record.competitionName,
    isComparable: record.isComparable,
    source: record.source,
  };
}

function toPublicRecord(record) {
  return {
    id: record.id,
    athleteKey: record.athleteKey,
    name: record.name,
    team: record.team,
    season: record.season,
    competitionName: record.competitionName,
    date: record.date,
    venue: record.venue,
    eventKey: record.eventKey,
    eventLabel: record.eventLabel,
    divisionKey: record.divisionKey,
    divisionLabel: record.divisionLabel,
    phase: record.phase,
    record: record.recordDisplay,
    recordValue: record.recordValue,
    direction: record.direction,
    rank: record.rank,
    wind: record.wind,
    windLegal: record.windLegal,
    isComparable: record.isComparable,
    note: record.note,
    source: record.source,
  };
}

function seasonTableKey(season, eventKey, divisionKey) {
  return `${season}|${eventKey}|${divisionKey}`;
}

function buildSignature() {
  const filenames = resultsStore.listFilenames().join('|');
  const suppressions = dataRequestService
    .getActiveSuppressions()
    .map((item) => `${item.key}:${item.mode}:${item.since}`)
    .join('|');
  return `${filenames}::${suppressions}`;
}

function isWindRelevant(eventLabel) {
  return WIND_RELEVANT.test(eventLabel) || needsWind(eventLabel);
}

function isWindLegal(wind) {
  if (!wind) return true;
  const value = Number.parseFloat(String(wind).replace(/[^\d+-.]/g, ''));
  if (!Number.isFinite(value)) return true;
  return value <= 2;
}

function yearFromText(value) {
  const match = String(value || '').match(/\b(20\d{2})\b/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function dateFromPeriod(period) {
  const match = String(period || '').match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function clean(value, max = 500) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

// 시·도 접두 표기를 표준형으로 통일하기 위한 별칭 테이블.
// 데이터에 "경기"/"경기도", "전남"/"전라남도", "강원"/"강원특별자치도" 처럼
// 같은 지역이 여러 표기로 섞여 있어 동일인이 다른 키로 분열되는 문제를 막는다.
const PROVINCE_ALIASES = [
  '서울특별시', '서울',
  '부산광역시', '부산',
  '대구광역시', '대구',
  '인천광역시', '인천',
  '광주광역시', '광주',
  '대전광역시', '대전',
  '울산광역시', '울산',
  '세종특별자치시', '세종특별시', '세종',
  '경기도', '경기',
  '강원특별자치도', '강원도', '강원',
  '충청북도', '충북',
  '충청남도', '충남',
  '전북특별자치도', '전라북도', '전북',
  '전라남도', '전남',
  '경상북도', '경북',
  '경상남도', '경남',
  '제주특별자치도', '제주도', '제주',
];

/**
 * 소속(team) 문자열에서 선행하는 시·도 접두를 제거해 정규화한다.
 * - "전남-전남체육고등학교" / "전라남도-전남체육고등학교" / "전남체육고등학교" → "전남체육고등학교"
 * - "대구광역시-대구광역시청" → "대구광역시청" (학교/기관 본체는 보존)
 * 학교·기관 본체는 그대로 두므로 진학/이적(다른 소속)은 합쳐지지 않는다.
 * @param {string} team
 * @returns {string}
 */
function normalizeTeam(team) {
  let s = clean(team, 120);
  if (!s) return s;
  // "시도-" 또는 "시도 " 형태의 선행 접두 1회 제거
  for (const alias of PROVINCE_ALIASES) {
    if (s.startsWith(alias + '-') || s.startsWith(alias + ' ')) {
      const rest = s.slice(alias.length + 1).trim();
      // 접두 제거 후 본체가 남아 있을 때만 적용(빈 문자열 방지)
      if (rest) return rest;
    }
  }
  return s;
}

function isIndexableAthleteName(name) {
  const text = clean(name, 100);
  if (text.length < 2) return false;
  if (/^\d+$/.test(text)) return false;
  if (/^[\s._-]+$/.test(text)) return false;
  return true;
}

function stableId(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function stableSlug(value) {
  const text = clean(value, 160).toLowerCase();
  const ascii = text
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || stableId(text);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

module.exports = {
  getIndex,
  getFilters,
  getPopularEvents,
  searchAthletes,
  getAthleteSummary,
  getSeasonRecords,
  warmup,
  parseRecord,
  normalizeEvent,
  normalizeTeam,
  isIndexableAthleteName,
};
