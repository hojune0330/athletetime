function summarize(records) {
  const podium = summarizePodium(records);
  const improvements = summarizeImprovements(records);
  return {
    participation: summarizeParticipation(records),
    podium,
    improvements,
    coverage: {
      preliminaryPodiumRowsExcluded: podium.preliminaryRowsExcluded,
      ambiguousPodiumCount: podium.ambiguous.total,
    },
  };
}

function summarizeParticipation(records) {
  const competitionKeys = new Set();
  for (const record of records) {
    const key = competitionKey(record);
    if (key) competitionKeys.add(key);
  }
  return { competitionCount: competitionKeys.size };
}

function summarizePodium(records) {
  const confirmed = emptyRankCounts();
  const ambiguous = emptyRankCounts();
  const evidenceByKey = new Map();
  let preliminaryRowsExcluded = 0;

  for (const record of records) {
    const rank = Number(record.rank);
    if (![1, 2, 3].includes(rank)) continue;
    const stage = podiumStage(record.phase);
    if (stage === 'preliminary') {
      preliminaryRowsExcluded += 1;
      continue;
    }
    const key = podiumKey(record, rank);
    const current = evidenceByKey.get(key);
    if (!current || (current.stage === 'ambiguous' && stage === 'confirmed')) {
      evidenceByKey.set(key, { rank, stage });
    }
  }

  for (const evidence of evidenceByKey.values()) {
    incrementRank(evidence.stage === 'confirmed' ? confirmed : ambiguous, evidence.rank);
  }

  return { confirmed, ambiguous, preliminaryRowsExcluded };
}

function summarizeImprovements(records) {
  const sourceMarkedIds = new Set();
  const groups = new Map();

  for (const record of records) {
    if (hasSourcePersonalBest(record)) sourceMarkedIds.add(recordIdentity(record));
    if (!isComparableRecord(record)) continue;
    const groupKey = `${clean(record.athleteKey)}|${clean(record.eventKey || record.eventLabel)}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(record);
  }

  let indexedImprovementCount = 0;
  for (const group of groups.values()) {
    const ordered = group.slice().sort(compareChronology);
    let best = null;
    for (const record of ordered) {
      if (!best) {
        best = record;
        continue;
      }
      if (isBetter(record, best)) {
        indexedImprovementCount += 1;
        best = record;
      }
    }
  }

  return {
    indexedImprovementCount,
    sourceMarkedPersonalBestCount: sourceMarkedIds.size,
  };
}

function podiumStage(value) {
  const phase = clean(value).toLowerCase();
  if (/예선|준결|조별|(?:^|\s)조(?:\s|$)|heat|qual|prelim|semi/u.test(phase)) return 'preliminary';
  if (/결승|final|종합|overall/u.test(phase)) return 'confirmed';
  return 'ambiguous';
}

function podiumKey(record, rank) {
  const base = [
    competitionKey(record),
    clean(record.eventKey || record.eventLabel),
    clean(record.divisionKey || record.divisionLabel),
    rank,
  ];
  if (isTeamEvent(record)) return [...base, clean(record.team)].join('|');
  return clean(record.id) || [...base, clean(record.athleteKey), clean(record.name), clean(record.recordDisplay)].join('|');
}

function isTeamEvent(record) {
  return /계주|relay|역전/iu.test(clean(record.eventLabel || record.rawEvent));
}

function competitionKey(record) {
  const id = clean(record.competitionId);
  if (id) return id;
  const name = clean(record.competitionName);
  return name ? `${Number(record.season) || 0}|${name}` : '';
}

function isComparableRecord(record) {
  return Boolean(clean(record.athleteKey))
    && Boolean(clean(record.eventKey || record.eventLabel))
    && record.isComparable === true
    && record.windLegal !== false
    && Number.isFinite(Number(record.recordValue));
}

function hasSourcePersonalBest(record) {
  const sourceText = [
    record.personalBest,
    record.personal_best,
    record.newRecord,
    record.note,
    ...(Array.isArray(record.achievementTags) ? record.achievementTags : []),
  ].map(clean).join(' ');
  return /개인신|개인최고|(?:^|\s)PB(?:\s|$)|Personal\s*Best/iu.test(sourceText);
}

function recordIdentity(record) {
  return clean(record.id) || [
    clean(record.athleteKey),
    clean(record.eventKey || record.eventLabel),
    clean(record.date),
    Number(record.recordValue),
  ].join('|');
}

function compareChronology(left, right) {
  return clean(left.date).localeCompare(clean(right.date))
    || phaseOrder(left.phase) - phaseOrder(right.phase)
    || clean(left.id).localeCompare(clean(right.id));
}

function phaseOrder(value) {
  const phase = clean(value).toLowerCase();
  if (/예선|heat|qual|prelim/u.test(phase)) return 1;
  if (/준결|semi/u.test(phase)) return 2;
  if (/결승|final/u.test(phase)) return 3;
  return 0;
}

function isBetter(candidate, best) {
  const candidateValue = Number(candidate.recordValue);
  const bestValue = Number(best.recordValue);
  return candidate.direction === 'higher'
    ? candidateValue > bestValue
    : candidateValue < bestValue;
}

function emptyRankCounts() {
  return { first: 0, second: 0, third: 0, total: 0 };
}

function incrementRank(counts, rank) {
  if (rank === 1) counts.first += 1;
  if (rank === 2) counts.second += 1;
  if (rank === 3) counts.third += 1;
  counts.total += 1;
}

function clean(value) {
  return String(value || '').trim().replace(/\s+/gu, ' ');
}

module.exports = { summarize };
