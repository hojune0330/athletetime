const overrideConfig = require('../../data/config/team-category-overrides.json');

const CATEGORY_ORDER = [
  'corporate',
  'university',
  'high',
  'middle',
  'elementary',
  'unclassified',
];

const LEVEL_CATEGORIES = new Map([
  ['university', 'university'],
  ['high', 'high'],
  ['middle', 'middle'],
  ['elementary', 'elementary'],
]);

const TEAM_SIGNATURES = [
  ['elementary', /초등학교|초등|초교/u],
  ['middle', /중학교|중학|중등/u],
  ['high', /고등학교|고교|체육고(?:등학교)?/u],
  ['university', /대학교|대학(?:교)?(?:\([A-Z]\))?$/iu],
  ['corporate', /시청|군청|구청|도청|공사|공단|은행|체육회|국군체육부대|상무|㈜|\(주\)|주식회사/u],
];

function classifyRecord(record, overrides = overrideConfig, normalizedTeamLabel = '') {
  const teamLabel = clean(normalizedTeamLabel || record.team || record.affiliation);
  const override = findOverride(teamLabel, overrides);
  if (override) {
    return classification(override.category, 1, ['operator_override:reviewed']);
  }

  const divisionLevel = clean(record.divisionLevel).toLowerCase();
  const divisionCategory = LEVEL_CATEGORIES.get(divisionLevel);
  if (divisionCategory) return classification(divisionCategory, 1, [`division_level:${divisionLevel}`]);

  const teamSignature = TEAM_SIGNATURES.find(([, pattern]) => pattern.test(teamLabel));
  if (teamSignature) return classification(teamSignature[0], 0.9, [`team_signature:${teamSignature[0]}`]);

  const competitionEvidence = [record.rawDivision, record.divisionLabel, record.competitionName]
    .map(clean)
    .join(' ');
  if (divisionLevel === 'general' && /실업/u.test(competitionEvidence)) {
    return classification('corporate', 0.75, ['general_division_with_corporate_evidence']);
  }

  return classification('unclassified', 0, ['insufficient_evidence']);
}

function summarizeRecordCategories(records, overrides = overrideConfig, normalizedTeamLabel = '') {
  const buckets = new Map();
  for (const record of records) {
    const result = classifyRecord(record, overrides, normalizedTeamLabel);
    if (!buckets.has(result.category)) {
      buckets.set(result.category, {
        category: result.category,
        resultCount: 0,
        confidence: 0,
        reasons: new Set(),
      });
    }
    const bucket = buckets.get(result.category);
    bucket.resultCount += 1;
    bucket.confidence = Math.max(bucket.confidence, result.confidence);
    result.reasons.forEach((reason) => bucket.reasons.add(reason));
  }

  const categoryBreakdown = [...buckets.values()]
    .map((bucket) => ({
      category: bucket.category,
      resultCount: bucket.resultCount,
      confidence: bucket.confidence,
      reasons: [...bucket.reasons].sort(),
    }))
    .sort((left, right) => right.resultCount - left.resultCount
      || CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category));
  const known = categoryBreakdown.filter((item) => item.category !== 'unclassified');

  return {
    primaryCategory: known[0]?.category || 'unclassified',
    categoryBreakdown,
  };
}

function findOverride(teamLabel, overrides) {
  const teams = overrides && typeof overrides === 'object' ? overrides.teams : null;
  if (!teams || typeof teams !== 'object') return null;
  const entry = teams[teamLabel];
  if (!entry || !CATEGORY_ORDER.includes(entry.category)) return null;
  return entry;
}

function classification(category, confidence, reasons) {
  return { category, confidence, reasons };
}

function clean(value) {
  return String(value || '').trim().replace(/\s+/gu, ' ');
}

module.exports = {
  CATEGORY_ORDER,
  classifyRecord,
  summarizeRecordCategories,
};
