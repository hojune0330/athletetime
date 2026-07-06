function classifyTeamStage(team) {
  const text = String(team || '').trim();
  if (!text) return 'unknown';
  if (/(초등|초교|초\b|초등학교)/.test(text)) return 'elementary';
  if (/(중학교|중등|중\b)/.test(text)) return 'middle_school';
  if (/(고등학교|고교|고\b)/.test(text)) return 'high_school';
  if (/(대학교|대학|\S대\b)/.test(text)) return 'university';
  return 'unknown';
}

function teamStageRank(stage) {
  return {
    elementary: 1,
    middle_school: 2,
    high_school: 3,
    university: 4,
  }[stage] || 0;
}

function isSafeProgressionSegments(segments) {
  if (!Array.isArray(segments) || segments.length < 2) return false;

  const stages = segments.map((segment) => classifyTeamStage(segment.teamLabel));
  if (stages.some((stage) => stage === 'unknown')) return false;
  if (new Set(stages).size < 2) return false;

  const ranks = stages.map(teamStageRank);
  for (let i = 1; i < ranks.length; i += 1) {
    if (ranks[i] <= ranks[i - 1]) return false;
  }

  return true;
}

module.exports = {
  classifyTeamStage,
  isSafeProgressionSegments,
  teamStageRank,
};
