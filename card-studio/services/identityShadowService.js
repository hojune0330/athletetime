const crypto = require('crypto');

const recordAnalyticsService = require('./recordAnalyticsService');
const { classifyTeamStage, isSafeProgressionSegments } = require('./identityPolicy');

// Policy guard:
// This service must never perform bulk person_no cleanup or confirmed identity merges.
// It only returns low/medium-confidence, estimate-only shadow clusters for UI review.
// The source of truth is docs/athletetime-data-strategy-master.md section 2.1.
const MIN_CLUSTER_KEYS = 2;
const MAX_CONFIDENCE = 0.74;

let cached = null;
let cachedSignature = '';

function getShadowCluster({ athleteKey } = {}) {
  const index = getShadowIndex();
  const key = clean(athleteKey, 120);

  return {
    generatedAt: new Date().toISOString(),
    scope: 'estimate_only_identity_shadow',
    policy: policyBlock(),
    summary: index.summary,
    cluster: key ? index.clusterByAthleteKey.get(key) || null : null,
  };
}

function getShadowIndex() {
  const idx = recordAnalyticsService.getIndex();
  const signature = `${idx.records.length}:${idx.athletes.length}:${idx.latestSeason}`;
  if (cached && cachedSignature === signature) return cached;

  cached = buildShadowIndex(idx);
  cachedSignature = signature;
  return cached;
}

function buildShadowIndex(idx) {
  const byName = new Map();

  for (const athlete of idx.athletes) {
    const name = clean(athlete.name, 100);
    if (!recordAnalyticsService.isIndexableAthleteName(name)) continue;
    if (!byName.has(name)) {
      byName.set(name, {
        name,
        athletes: [],
        athleteKeysBySeason: new Map(),
      });
    }

    const group = byName.get(name);
    const years = Array.isArray(athlete.years) ? athlete.years : [];
    group.athletes.push(athlete);
    for (const year of years) {
      if (!group.athleteKeysBySeason.has(year)) group.athleteKeysBySeason.set(year, new Set());
      group.athleteKeysBySeason.get(year).add(athlete.athleteKey);
    }
  }

  const clusters = [];
  const clusterByAthleteKey = new Map();
  let multiTeamNames = 0;
  let sameYearMultiTeamNames = 0;

  for (const group of byName.values()) {
    if (group.athletes.length < MIN_CLUSTER_KEYS) continue;
    multiTeamNames += 1;

    const hasSameYearConflict = [...group.athleteKeysBySeason.values()].some((keys) => keys.size > 1);
    if (hasSameYearConflict) {
      sameYearMultiTeamNames += 1;
      continue;
    }

    const cluster = toShadowCluster(group);
    if (!isSafeProgressionSegments(cluster.segments)) continue;
    clusters.push(cluster);
    for (const key of cluster.athleteKeys) {
      clusterByAthleteKey.set(key, cluster);
    }
  }

  return {
    clusters,
    clusterByAthleteKey,
    summary: {
      totalNames: byName.size,
      multiTeamNames,
      homonymNames: sameYearMultiTeamNames,
      shadowClusterNames: clusters.length,
      shadowClusterAthleteKeys: clusters.reduce((sum, cluster) => sum + cluster.athleteKeys.length, 0),
      policy: 'estimate_only_no_auto_merge',
    },
  };
}

function toShadowCluster(group) {
  const segments = group.athletes
    .map((athlete) => {
      const years = (Array.isArray(athlete.years) ? athlete.years : []).slice().sort((a, b) => a - b);
      const teams = Array.isArray(athlete.teams) ? athlete.teams : [];
      const events = Array.isArray(athlete.events) ? athlete.events : [];
      return {
        athleteKey: athlete.athleteKey,
        teamLabel: teams[0] || athlete.team || '',
        teamStage: classifyTeamStage(teams[0] || athlete.team || ''),
        years,
        fromYear: years[0] || null,
        toYear: years[years.length - 1] || null,
        recordCount: athlete.recordCount || athlete.records?.length || 0,
        eventCount: events.length,
      };
    })
    .sort((a, b) => (a.fromYear || 0) - (b.fromYear || 0) || a.teamLabel.localeCompare(b.teamLabel));

  const confidence = estimateConfidence(segments);
  const cluster = {
    clusterId: stableId(`${group.name}|${segments.map((item) => item.athleteKey).join('|')}`),
    status: 'estimate_only',
    confidence,
    confidenceBand: confidence >= 0.68 ? 'medium' : 'low',
    reasonCodes: [
      'same_name',
      'one_athlete_key_per_year',
      'no_same_year_team_conflict',
      'school_stage_progression',
      'no_person_no_used_or_stored',
    ],
    athleteKeys: segments.map((item) => item.athleteKey),
    segments,
    disclaimer: 'Estimated grouping only. AthleteTime does not auto-merge these records.',
  };

  return cluster;
}

function estimateConfidence(segments) {
  if (segments.length < MIN_CLUSTER_KEYS) return 0;
  let score = 0.58;
  if (segments.length === 2) score += 0.08;
  if (segments.length === 3) score += 0.04;

  const gaps = [];
  for (let i = 1; i < segments.length; i += 1) {
    const prev = segments[i - 1].toYear;
    const next = segments[i].fromYear;
    if (prev && next) gaps.push(next - prev);
  }
  if (gaps.some((gap) => gap < 0)) score -= 0.2;
  if (gaps.every((gap) => gap >= 0 && gap <= 2)) score += 0.05;
  if (gaps.some((gap) => gap > 4)) score -= 0.08;

  return Math.max(0.35, Math.min(MAX_CONFIDENCE, Number(score.toFixed(2))));
}

function policyBlock() {
  return {
    noAutoMerge: true,
    estimateOnly: true,
    personNoUsed: false,
    personNoStored: false,
    bulkPersonNoCleanupAllowed: false,
    sourcePolicy: 'docs/athletetime-data-strategy-master.md#person_no-full-cleanup-prohibited',
  };
}

function stableId(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function clean(value, max = 500) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

module.exports = {
  getShadowCluster,
};
