const teamCategoryService = require('./teamCategoryService');
const teamDetailService = require('./teamDetailService');
const teamPerformanceService = require('./teamPerformanceService');

function search({ records, normalizeTeam }, query, limit = 12, options = {}) {
  const q = normalizeTeam(clean(query)).toLowerCase();
  if (q.length < 2) return [];
  const category = clean(options.category).toLowerCase() || null;

  const buckets = [];
  for (const { teamLabel, records: teamRecords } of teamDetailService.getTeamIndex(records, normalizeTeam).values()) {
    if (!teamLabel || !teamLabel.toLowerCase().includes(q)) continue;
    const bucket = createBucket(teamLabel);
    teamRecords.forEach((record) => addRecord(bucket, record));
    buckets.push(bucket);
  }

  return buckets
    .map((bucket) => selectCategory(bucket, category))
    .filter(Boolean)
    .map(({ bucket, allRecords }) => toPublicStatistic(bucket, { allRecords, category }))
    .sort((left, right) => {
      const exactLeft = left.teamLabel.toLowerCase() === q ? 1 : 0;
      const exactRight = right.teamLabel.toLowerCase() === q ? 1 : 0;
      return exactRight - exactLeft
        || right.resultCount - left.resultCount
        || left.teamLabel.localeCompare(right.teamLabel);
    })
    .slice(0, clampInt(limit, 12, 1, 30));
}

function createBucket(teamLabel) {
  return {
    teamLabel,
    athleteKeys: new Set(),
    competitions: new Set(),
    records: [],
    seasons: new Map(),
    events: new Map(),
  };
}

function addRecord(bucket, record) {
  bucket.records.push(record);
  if (record.athleteKey) bucket.athleteKeys.add(record.athleteKey);
  const competitionKey = record.competitionId || record.competitionName;
  if (competitionKey) bucket.competitions.add(competitionKey);

  const seasonKey = record.season || 0;
  if (!bucket.seasons.has(seasonKey)) {
    bucket.seasons.set(seasonKey, {
      season: seasonKey,
      athleteKeys: new Set(),
      competitions: new Set(),
      resultCount: 0,
      records: [],
    });
  }
  const season = bucket.seasons.get(seasonKey);
  season.resultCount += 1;
  season.records.push(record);
  if (record.athleteKey) season.athleteKeys.add(record.athleteKey);
  if (competitionKey) season.competitions.add(competitionKey);

  const eventKey = record.eventKey || record.eventLabel;
  if (!bucket.events.has(eventKey)) {
    bucket.events.set(eventKey, {
      eventKey,
      eventLabel: record.eventLabel || eventKey,
      athleteKeys: new Set(),
      resultCount: 0,
    });
  }
  const event = bucket.events.get(eventKey);
  event.resultCount += 1;
  if (record.athleteKey) event.athleteKeys.add(record.athleteKey);
}

function toPublicStatistic(bucket, { allRecords = bucket.records, category = null } = {}) {
  const categorySummary = teamCategoryService.summarizeRecordCategories(
    allRecords,
    undefined,
    bucket.teamLabel,
  );
  const performance = teamPerformanceService.summarize(bucket.records);
  const categoryEvidence = category
    ? categorySummary.categoryBreakdown.find((item) => item.category === category) || null
    : null;
  const dates = bucket.records.map((record) => record.date).filter(Boolean).sort();
  const seasonStats = [...bucket.seasons.values()]
    .filter((season) => season.season > 0)
    .map((season) => ({
      season: season.season,
      athleteCount: season.athleteKeys.size,
      resultCount: season.resultCount,
      competitionCount: season.competitions.size,
      topThreeCount: teamPerformanceService.summarize(season.records).podium.confirmed.total,
    }))
    .sort((left, right) => right.season - left.season);
  const eventStats = [...bucket.events.values()]
    .map((event) => ({
      eventKey: event.eventKey,
      eventLabel: event.eventLabel,
      athleteCount: event.athleteKeys.size,
      resultCount: event.resultCount,
    }))
    .sort((left, right) => right.resultCount - left.resultCount || left.eventLabel.localeCompare(right.eventLabel));

  return {
    teamKey: teamDetailService.stableTeamId(bucket.teamLabel),
    teamLabel: bucket.teamLabel,
    athleteCount: bucket.athleteKeys.size,
    resultCount: bucket.records.length,
    competitionCount: bucket.competitions.size,
    eventCount: eventStats.length,
    firstSeason: seasonStats.at(-1)?.season || null,
    latestSeason: seasonStats[0]?.season || null,
    latestDate: dates.at(-1) || null,
    ...categorySummary,
    selectedCategory: category,
    categoryEvidence,
    performance,
    confirmedPodiumCount: performance.podium.confirmed.total,
    indexedImprovementCount: performance.improvements.indexedImprovementCount,
    rankCounts: {
      first: performance.podium.confirmed.first,
      second: performance.podium.confirmed.second,
      third: performance.podium.confirmed.third,
      topThree: performance.podium.confirmed.total,
    },
    seasonStats,
    eventStats,
    coverageDisclaimer: 'AthleteTime이 모은 공개 기록 기준이며 빠진 대회가 있을 수 있어요.',
    disclaimer: 'AthleteTime이 모은 공개 기록의 소속 표기를 기준으로 계산했어요. 공식 팀 명단이나 공식 입상 집계가 아니며 빠진 기록이 있을 수 있어요.',
  };
}

function selectCategory(bucket, category) {
  if (!category) return { bucket, allRecords: bucket.records };
  const filtered = createBucket(bucket.teamLabel);
  for (const record of bucket.records) {
    const classification = teamCategoryService.classifyRecord(record, undefined, bucket.teamLabel);
    if (classification.category === category) addRecord(filtered, record);
  }
  return filtered.records.length > 0 ? { bucket: filtered, allRecords: bucket.records } : null;
}

function clean(value, max = 100) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

module.exports = {
  search,
  getDetail: teamDetailService.getDetail,
};
