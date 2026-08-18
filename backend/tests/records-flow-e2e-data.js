const athletes = [
  athlete('at_alpha_2016', 'Alpha Kim', 'Seoul High', [2024, 2025, 2026], ['100m', '200m'], 7, ['남자 고등부', '남자 일반부']),
  athlete('at_alpha_2020', 'Alpha Kim', 'Seoul Track Club', [2025, 2026], ['100m'], 4),
  athlete('at_beta_2016', 'Beta Park', 'Busan High', [2024, 2026], ['100m'], 5),
  athlete('at_mine_race_2016', 'Race Runner', 'Race High', [2026], ['200m'], 2),
];

const savedWorkspaceAthlete = athlete('aaaaaaaaaaaaaaaa', 'Workspace Kim', 'Saved High', [2026], ['100m'], 2);

const limitAthletes = Array.from({ length: 7 }, (_, index) => (
  athlete(`at_limit_${index + 1}`, `Limit Athlete ${index + 1}`, 'Limit High', [2026], ['100m'], 1)
));

const seasonAvailability = {
  seasons: {
    2026: {
      '100m': ['men-high', 'women-high'],
      '200m': ['men-high'],
    },
    2025: {
      '100m': ['men-high'],
    },
  },
};

const filters = {
  seasons: [2026, 2025],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [
    { key: 'men-high', label: '남자 고등부', gender: 'men', level: 'high' },
    { key: 'men-general', label: '남자 일반부', gender: 'men', level: 'general' },
    { key: 'women-high', label: '여자 고등부', gender: 'women', level: 'high' },
  ],
  genderOptions: [{ key: 'men', label: '남자' }, { key: 'women', label: '여자' }],
  levelOptions: [{ key: 'general', label: '일반부' }, { key: 'high', label: '고등부' }],
  defaultSeasonSelection: { season: 2026, eventKey: '100m', eventLabel: '100m', divisionKey: 'men-high', divisionLabel: '남자 고등부', genderKey: 'men', divisionLevel: 'high', rowCount: 2 },
};

Object.defineProperty(filters, 'seasonAvailability', {
  value: seasonAvailability,
  enumerable: false,
});

function athlete(athleteKey, name, team, years, events, recordCount, divisions = ['남자 고등부']) {
  return { athleteKey, name, team, teams: [team], years, events, divisions, recordCount, ambiguity: 'name_team', note: '' };
}

function makeRecord(item, index) {
  const isMineRaceFixture = item.athleteKey === 'at_mine_race_2016';
  const record = isMineRaceFixture
    ? (index === 0 ? '22.45' : '22.78')
    : (index === 0 ? '10.91' : '11.04');
  const recordValue = Number(record);
  return {
    id: `${item.athleteKey}-${index}`, athleteKey: item.athleteKey, name: item.name, team: item.team,
    season: 2026, competitionName: 'Fixture Invitational',
    date: `2026-04-${String(index + 10).padStart(2, '0')}`,
    venue: 'Fixture Stadium', eventKey: isMineRaceFixture ? '200m' : '100m', eventLabel: isMineRaceFixture ? '200m' : '100m',
    divisionKey: 'men-high', divisionLabel: '남자 고등부', gender: 'men', divisionLevel: 'high',
    divisionDetail: null, sourceDivisionLabel: '남고', phase: 'final', record, recordValue,
    direction: 'lower', rank: index + 1, wind: '+0.7', windLegal: true, isComparable: true, note: '',
    source: { provider: 'athletetime_fixture', sourceType: 'qa_fixture', sourceUrl: '', capturedAt: '2026-07-13T00:00:00.000Z' },
  };
}

function getSearchResults(query, divisionKey = '') {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  const candidates = normalizedQuery.includes('limit') ? limitAthletes : athletes;
  const divisionLabel = filters.divisions.find((division) => division.key === divisionKey)?.label;
  return candidates.filter((candidate) => (
    [candidate.name, candidate.team, ...candidate.teams]
      .some((value) => value.toLowerCase().includes(normalizedQuery))
  ) && (!divisionLabel || candidate.divisions.includes(divisionLabel)));
}

function getSeasonRecordsResponse(params) {
  const season = Number(params.get('season'));
  const eventKey = params.get('eventKey') || '';
  const divisionKey = params.get('divisionKey') || '';
  const availableDivisions = filters.seasonAvailability.seasons[String(season)]?.[eventKey] || [];
  if (!availableDivisions.includes(divisionKey)) {
    return {
      status: 400,
      body: {
        success: false,
        code: 'INVALID_SEASON_COMBINATION',
        error: '기록이 있는 시즌·종목·경기 부문 조합을 선택해 주세요.',
      },
    };
  }

  const eventLabel = filters.events.find((event) => event.key === eventKey)?.label || eventKey;
  const division = filters.divisions.find((candidate) => candidate.key === divisionKey);
  const isValidEmpty = season === 2025 && eventKey === '100m' && divisionKey === 'men-high';
  const rows = isValidEmpty ? [] : athletes.slice(0, 2).map((item, index) => ({
    rank: index + 1,
    athleteKey: item.athleteKey,
    name: item.name,
    team: item.team,
    record: eventKey === '200m'
      ? (index === 0 ? '22.45' : '22.78')
      : (index === 0 ? '10.91' : '11.04'),
    recordValue: eventKey === '200m'
      ? (index === 0 ? 22.45 : 22.78)
      : (index === 0 ? 10.91 : 11.04),
    date: season + '-04-10',
    competitionName: 'Fixture Invitational',
    divisionKey,
    divisionLabel: division?.label || divisionKey,
    divisionLevel: division?.level || 'unspecified',
    divisionDetail: null,
    source: { provider: 'athletetime_fixture', sourceType: 'qa_fixture', sourceUrl: '', capturedAt: '2026-07-13T00:00:00.000Z' },
    wind: '+0.7',
    windLegal: true,
    highlighted: params.get('athleteKey') === item.athleteKey,
  }));
  const tableFilters = { ...filters };
  delete tableFilters.seasonAvailability;
  return {
    status: 200,
    body: {
      success: true,
      data: {
        season,
        eventKey,
        divisionKey,
        eventLabel,
        divisionLabel: division?.label || divisionKey,
        totalIndexedAthletes: rows.length,
        rows,
        filters: tableFilters,
        disclaimer: 'QA fixture',
      },
    },
  };
}

function getTeamSearchResponse(params) {
  const query = (params.get('q') || '').trim();
  if (!query.includes('예시')) return null;
  const selectedCategory = params.get('category') === 'corporate' ? 'corporate' : null;
  const evidence = {
    category: 'corporate',
    resultCount: 12,
    confidence: 0.92,
    reasons: ['team_signature:corporate'],
  };
  const data = [{
    teamKey: '0123456789abcdef',
    teamLabel: '예시군청',
    selectedCategory,
    primaryCategory: 'corporate',
    categoryEvidence: selectedCategory ? evidence : null,
    categoryBreakdown: [evidence],
    athleteCount: 5,
    resultCount: 12,
    competitionCount: 3,
    eventCount: 2,
    confirmedPodiumCount: 4,
    indexedImprovementCount: 2,
    firstSeason: 2025,
    latestSeason: 2026,
    latestDate: '2026-04-10',
    coverageDisclaimer: '개인을 식별하지 않는 QA 집계 fixture입니다.',
  }];
  return {
    status: 200,
    body: { success: true, contractVersion: 1, total: data.length, data },
  };
}

function makeProfile(key) {
  const item = athletes.find((candidate) => candidate.athleteKey === key);
  if (!item) return null;
  const records = [makeRecord(item, 0), makeRecord(item, 1)];
  const eventsByKey = new Map();
  for (const record of records) {
    const existing = eventsByKey.get(record.eventKey);
    if (existing) {
      existing.recordCount += 1;
      continue;
    }
    eventsByKey.set(record.eventKey, {
      eventKey: record.eventKey,
      eventLabel: record.eventLabel,
      recordCount: 1,
      best: record,
    });
  }
  return {
    athlete: item,
    summary: { indexedBest: records[0], seasonBest: records[0], latest: records[1], delta: null, indexedResultCount: records.length, comparableResultCount: records.length, sourceScope: 'qa_fixture', disclaimer: 'QA fixture' },
    events: Array.from(eventsByKey.values()),
    recordTrail: records.map((record) => ({
      id: record.id, date: record.date, season: record.season, value: record.recordValue,
      record: record.record, eventLabel: record.eventLabel, competitionName: record.competitionName,
      isComparable: record.isComparable,
    })),
    records,
  };
}

function makeWorkspacePreview(subjectKeys) {
  const fixtureSubjects = [...athletes, savedWorkspaceAthlete];
  const resolvedSubjectKeys = subjectKeys.flatMap((requestedSubjectKey) => {
    const subject = fixtureSubjects.find((athlete) => athlete.athleteKey === requestedSubjectKey);
    return subject ? [{ requestedSubjectKey, athleteKey: subject.athleteKey }] : [];
  });
  const subjects = resolvedSubjectKeys
    .map(({ athleteKey }) => fixtureSubjects.find((athlete) => athlete.athleteKey === athleteKey))
    .filter(Boolean);
  const records = subjects.flatMap((subject) => [makeRecord(subject, 0), makeRecord(subject, 1)]);
  const affiliationCounts = new Map();
  for (const subject of subjects) {
    affiliationCounts.set(subject.team, (affiliationCounts.get(subject.team) || 0) + 2);
  }
  const eventCounts = new Map();
  for (const record of records) {
    const previous = eventCounts.get(record.eventKey) || [];
    eventCounts.set(record.eventKey, [...previous, record]);
  }
  const names = [...new Set(subjects.map((subject) => subject.name))];
  return {
    subjects,
    resolvedSubjectKeys,
    unavailableSubjectKeys: subjectKeys.filter((subjectKey) => !subjects.some((subject) => subject.athleteKey === subjectKey)),
    identity: { displayName: names.join(' · ') || '선수 후보', distinctNames: names, warning: names.length > 1 ? 'different_names' : 'none' },
    affiliations: Array.from(affiliationCounts.entries()).map(([label, recordCount]) => ({ label, firstObservedSeason: 2024, lastObservedSeason: 2026, recordCount, status: 'latest_observed' })),
    coverage: { totalMatched: records.length, returned: records.length, hasMore: false, nextCursor: null, observedSeasons: [2026], competitionCount: records.length, sourceCount: subjects.length, lastCapturedAt: '2026-07-13T00:00:00.000Z', qualityState: 'visible_index' },
    events: Array.from(eventCounts.entries()).map(([eventKey, eventRecords]) => ({ eventKey, eventLabel: eventRecords[0].eventLabel, recordCount: eventRecords.length, best: eventRecords[0] })),
    records,
  };
}

function makeInsights() {
  return {
    generatedAt: '2026-07-13T00:00:00.000Z',
    scope: 'qa_fixture',
    privacy: { includesNames: false, includesTeams: false, includesAthleteKeys: false, minGroupSize: 3 },
    season: 2026,
    eventConcentration: [{ eventKey: '100m', eventLabel: '100m', recordCount: 22, athleteCount: 12 }],
    regionActivity: [{ regionCode: 'seoul', regionLabel: 'Seoul', recordCount: 12, eventCount: 3 }],
    seasonPulse: { windowDays: 28, from: '2026-06-01', to: '2026-06-28', buckets: [{ weekStart: '2026-06-01', weekEnd: '2026-06-07', recordCount: 3 }] },
  };
}

module.exports = {
  filters,
  getSearchResults,
  getSeasonRecordsResponse,
  getTeamSearchResponse,
  makeInsights,
  makeProfile,
  makeWorkspacePreview,
};
