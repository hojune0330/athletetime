const crypto = require('crypto');

const teamCategoryService = require('./teamCategoryService');
const teamPerformanceService = require('./teamPerformanceService');

const MAX_SECTION_ITEMS = 120;
const teamIndexCache = new WeakMap();

function getDetail({ records, normalizeTeam }, teamKey, options = {}) {
  const { teamLabel, records: teamRecords } = findTeam(records, normalizeTeam, teamKey);
  if (!teamLabel) return null;

  const categorySummary = teamCategoryService.summarizeRecordCategories(
    teamRecords,
    undefined,
    teamLabel,
  );
  const selectedCategory = clean(options.category) || null;
  const categoryRecords = selectedCategory
    ? teamRecords.filter((record) => (
      teamCategoryService.classifyRecord(record, undefined, teamLabel).category === selectedCategory
    ))
    : teamRecords;
  if (categoryRecords.length === 0) return null;

  const latestSeason = newestSeason(categoryRecords);
  const appliedScope = options.season ? 'season' : clean(options.scope) || 'latest';
  const appliedSeason = options.season || (appliedScope === 'latest' ? latestSeason : null);
  const scopedRecords = appliedSeason
    ? categoryRecords.filter((record) => Number(record.season) === Number(appliedSeason))
    : categoryRecords;
  if (scopedRecords.length === 0) return null;

  const aggregate = summarizeAggregate(scopedRecords);
  const participation = summarizeParticipation(scopedRecords);
  const improvement = summarizeImprovement(scopedRecords);
  const categoryEvidence = selectedCategory
    ? categorySummary.categoryBreakdown.find((item) => item.category === selectedCategory) || null
    : null;

  return {
    identity: {
      teamKey,
      teamLabel,
      selectedCategory,
      categoryEvidence,
      otherCategories: categorySummary.categoryBreakdown
        .filter((item) => !selectedCategory || item.category !== selectedCategory),
    },
    summary: aggregate,
    seasonTrend: summarizeGroups(scopedRecords, seasonGroup).slice(0, MAX_SECTION_ITEMS),
    eventBreakdown: summarizeGroups(scopedRecords, eventGroup).slice(0, MAX_SECTION_ITEMS),
    participation: participation.items,
    improvement: improvement.items,
    coverage: {
      appliedScope,
      appliedSeason,
      firstSeason: oldestSeason(categoryRecords),
      latestSeason,
      availableSeasons: seasonsFrom(categoryRecords),
      latestDate: latestValue(categoryRecords.map((record) => record.date)),
      sourceCount: countSources(categoryRecords),
      lastCapturedAt: latestValue(categoryRecords.map((record) => record.source?.capturedAt)),
      ambiguousPodiumCount: aggregate.ambiguousPodiumCount,
      preliminaryPodiumRowsExcluded: aggregate.preliminaryPodiumRowsExcluded,
      participationTotal: participation.total,
      participationReturned: participation.items.length,
      improvementGroupTotal: improvement.total,
      improvementGroupReturned: improvement.items.length,
      disclaimer: 'AthleteTime이 모은 공개 기록 기준이에요. 공식 팀 명단이나 공식 입상 집계가 아니며 빠진 대회가 있을 수 있어요.',
    },
  };
}

function stableTeamId(teamLabel) {
  return stableId(`team|${teamLabel}`);
}

function findTeam(records, normalizeTeam, teamKey) {
  return getTeamIndex(records, normalizeTeam).get(teamKey) || { teamLabel: '', records: [] };
}

function getTeamIndex(records, normalizeTeam) {
  const cached = teamIndexCache.get(records);
  if (cached?.normalizeTeam === normalizeTeam) return cached.teams;

  const teams = new Map();
  for (const record of records) {
    const label = normalizeTeam(record.team);
    if (!label) continue;
    const key = stableTeamId(label);
    if (!teams.has(key)) teams.set(key, { teamLabel: label, records: [] });
    teams.get(key).records.push(record);
  }
  teamIndexCache.set(records, { normalizeTeam, teams });
  return teams;
}

function summarizeAggregate(records) {
  const performance = teamPerformanceService.summarize(records);
  return {
    athleteCount: uniqueCount(records, (record) => record.athleteKey),
    resultCount: records.length,
    competitionCount: uniqueCount(records, competitionIdentity),
    eventCount: uniqueCount(records, (record) => record.eventKey || record.eventLabel),
    confirmedPodiumCount: performance.podium.confirmed.total,
    confirmedPodium: performance.podium.confirmed,
    ambiguousPodiumCount: performance.podium.ambiguous.total,
    preliminaryPodiumRowsExcluded: performance.podium.preliminaryRowsExcluded,
    indexedImprovementCount: performance.improvements.indexedImprovementCount,
    sourceMarkedPersonalBestCount: performance.improvements.sourceMarkedPersonalBestCount,
  };
}

function summarizeGroups(records, descriptor) {
  const groups = new Map();
  for (const record of records) {
    const meta = descriptor(record);
    if (!meta || !meta.key) continue;
    if (!groups.has(meta.key)) groups.set(meta.key, { meta, records: [] });
    groups.get(meta.key).records.push(record);
  }
  return [...groups.values()]
    .map(({ meta, records: groupRecords }) => ({ ...meta.output, ...summarizeAggregate(groupRecords) }))
    .sort((left, right) => Number(right.season || 0) - Number(left.season || 0)
      || right.resultCount - left.resultCount);
}

function summarizeParticipation(records) {
  const groups = new Map();
  for (const record of records) {
    const key = competitionIdentity(record);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const all = [...groups.entries()].map(([key, groupRecords]) => {
    const first = groupRecords[0];
    const aggregate = summarizeAggregate(groupRecords);
    return {
      competitionKey: stableId(`competition|${key}`),
      competitionName: clean(first.competitionName),
      season: Number(first.season) || null,
      latestDate: latestValue(groupRecords.map((record) => record.date)),
      resultCount: aggregate.resultCount,
      confirmedPodiumCount: aggregate.confirmedPodiumCount,
    };
  }).sort((left, right) => clean(right.latestDate).localeCompare(clean(left.latestDate))
    || clean(left.competitionName).localeCompare(clean(right.competitionName)));
  return { items: all.slice(0, MAX_SECTION_ITEMS), total: all.length };
}

function summarizeImprovement(records) {
  const all = summarizeGroups(records, improvementGroup)
    .filter((item) => item.indexedImprovementCount > 0 || item.sourceMarkedPersonalBestCount > 0);
  return { items: all.slice(0, MAX_SECTION_ITEMS), total: all.length };
}

function seasonGroup(record) {
  const season = Number(record.season) || 0;
  return season > 0 ? { key: String(season), output: { season } } : null;
}

function eventGroup(record) {
  const rawEvent = clean(record.rawEvent || record.eventLabel);
  const isSteeplechase = /3000m(?:sc|steeple|장애물)/iu.test(rawEvent);
  const eventKey = isSteeplechase
    ? '3000m-steeplechase'
    : clean(record.eventKey || record.eventLabel);
  return eventKey ? {
    key: eventKey,
    output: {
      eventKey,
      eventLabel: isSteeplechase ? '3000mSC' : clean(record.eventLabel || eventKey),
    },
  } : null;
}

function improvementGroup(record) {
  const event = eventGroup(record);
  const season = Number(record.season) || 0;
  return event && season > 0 ? {
    key: `${season}|${event.key}`,
    output: { season, ...event.output },
  } : null;
}

function competitionIdentity(record) {
  return clean(record.competitionId)
    || (clean(record.competitionName) ? `${Number(record.season) || 0}|${clean(record.competitionName)}` : '');
}

function countSources(records) {
  return uniqueCount(records, (record) => {
    const sourceUrl = clean(record.source?.sourceUrl);
    if (sourceUrl) return sourceUrl;
    return clean(record.source?.sourceId).replace(/:[a-f0-9]{16}$/iu, '');
  });
}

function uniqueCount(records, selector) {
  return new Set(records.map(selector).filter(Boolean)).size;
}

function newestSeason(records) {
  return Math.max(0, ...records.map((record) => Number(record.season) || 0)) || null;
}

function oldestSeason(records) {
  const seasons = records.map((record) => Number(record.season) || 0).filter(Boolean);
  return seasons.length > 0 ? Math.min(...seasons) : null;
}

function seasonsFrom(records) {
  return [...new Set(records.map((record) => Number(record.season) || 0).filter(Boolean))]
    .sort((left, right) => right - left);
}

function latestValue(values) {
  return values.map(clean).filter(Boolean).sort().at(-1) || null;
}

function stableId(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function clean(value) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/gu, ' ');
}

module.exports = { getDetail, getTeamIndex, stableTeamId };
