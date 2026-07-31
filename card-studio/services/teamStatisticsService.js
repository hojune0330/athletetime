const crypto = require('crypto');

function search({ records, normalizeTeam }, query, limit = 12) {
  const q = normalizeTeam(clean(query)).toLowerCase();
  if (q.length < 2) return [];

  const buckets = new Map();
  for (const record of records) {
    const teamLabel = normalizeTeam(record.team);
    if (!teamLabel || !teamLabel.toLowerCase().includes(q)) continue;
    if (!buckets.has(teamLabel)) buckets.set(teamLabel, createBucket(teamLabel));
    addRecord(buckets.get(teamLabel), record);
  }

  return [...buckets.values()]
    .map(toPublicStatistic)
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
    rankCounts: { first: 0, second: 0, third: 0 },
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
      topThreeCount: 0,
    });
  }
  const season = bucket.seasons.get(seasonKey);
  season.resultCount += 1;
  if (record.athleteKey) season.athleteKeys.add(record.athleteKey);
  if (competitionKey) season.competitions.add(competitionKey);
  if (record.rank >= 1 && record.rank <= 3) season.topThreeCount += 1;

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

  if (record.rank === 1) bucket.rankCounts.first += 1;
  if (record.rank === 2) bucket.rankCounts.second += 1;
  if (record.rank === 3) bucket.rankCounts.third += 1;
}

function toPublicStatistic(bucket) {
  const dates = bucket.records.map((record) => record.date).filter(Boolean).sort();
  const seasonStats = [...bucket.seasons.values()]
    .filter((season) => season.season > 0)
    .map((season) => ({
      season: season.season,
      athleteCount: season.athleteKeys.size,
      resultCount: season.resultCount,
      competitionCount: season.competitions.size,
      topThreeCount: season.topThreeCount,
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
    teamKey: stableId(`team|${bucket.teamLabel}`),
    teamLabel: bucket.teamLabel,
    athleteCount: bucket.athleteKeys.size,
    resultCount: bucket.records.length,
    competitionCount: bucket.competitions.size,
    eventCount: eventStats.length,
    firstSeason: seasonStats.at(-1)?.season || null,
    latestSeason: seasonStats[0]?.season || null,
    latestDate: dates.at(-1) || null,
    rankCounts: {
      ...bucket.rankCounts,
      topThree: bucket.rankCounts.first + bucket.rankCounts.second + bucket.rankCounts.third,
    },
    seasonStats,
    eventStats,
    disclaimer: 'AthleteTime이 모은 공개 기록의 소속 표기를 기준으로 계산했어요. 공식 팀 명단이나 공식 입상 집계가 아니며 빠진 기록이 있을 수 있어요.',
  };
}

function stableId(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function clean(value, max = 100) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

module.exports = { search };

