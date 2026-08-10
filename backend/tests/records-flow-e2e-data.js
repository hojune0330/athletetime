const athletes = [
  athlete('alpha-2016', 'Alpha Kim', 'Seoul High', [2024, 2025, 2026], ['100m', '200m'], 7),
  athlete('alpha-2020', 'Alpha Kim', 'Seoul Track Club', [2025, 2026], ['100m'], 4),
  athlete('beta-2016', 'Beta Park', 'Busan High', [2024, 2026], ['100m'], 5),
];

const savedWorkspaceAthlete = athlete('aaaaaaaaaaaaaaaa', 'Workspace Kim', 'Saved High', [2026], ['100m'], 2);

const limitAthletes = Array.from({ length: 7 }, (_, index) => (
  athlete(`limit-${index + 1}`, `Limit Athlete ${index + 1}`, 'Limit High', [2026], ['100m'], 1)
));

const filters = {
  seasons: [2026, 2025],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [{ key: 'men-high', label: 'Men High', gender: 'men', level: 'high' }, { key: 'men-all', label: 'Men All', gender: 'men', level: 'all' }],
  genderOptions: [{ key: 'men', label: 'Men' }],
  levelOptions: [{ key: 'all', label: 'All' }, { key: 'high', label: 'High' }],
  defaultSeasonSelection: { season: 2026, eventKey: '100m', eventLabel: '100m', divisionKey: 'men-high', divisionLabel: 'Men High', genderKey: 'men', divisionLevel: 'high', rowCount: 18 },
};

const seasonTable = {
  season: 2026, eventKey: '100m', divisionKey: 'men-high', eventLabel: '100m', divisionLabel: 'Men High', totalIndexedAthletes: 2,
  rows: athletes.slice(0, 2).map((item, index) => ({
    rank: index + 1, athleteKey: item.athleteKey, name: item.name, team: item.team,
    record: index === 0 ? '10.91' : '11.04', recordValue: index === 0 ? 10.91 : 11.04,
    date: '2026-04-10', competitionName: 'Fixture Invitational', divisionKey: 'men-high',
    divisionLabel: 'Men High', divisionLevel: 'high', divisionDetail: null,
    wind: '+0.7', windLegal: true, highlighted: index === 0,
  })),
  filters,
  disclaimer: 'QA fixture',
};

function athlete(athleteKey, name, team, years, events, recordCount) {
  return { athleteKey, name, team, teams: [team], years, events, divisions: ['Men High'], recordCount, ambiguity: 'name_team', note: '' };
}

function makeRecord(item, index) {
  const record = index === 0 ? '10.91' : '11.04';
  const recordValue = index === 0 ? 10.91 : 11.04;
  return {
    id: `${item.athleteKey}-${index}`, athleteKey: item.athleteKey, name: item.name, team: item.team,
    season: 2026, competitionName: 'Fixture Invitational',
    date: `2026-04-${String(index + 10).padStart(2, '0')}`,
    venue: 'Fixture Stadium', eventKey: '100m', eventLabel: '100m',
    divisionKey: 'men-high', divisionLabel: 'Men High', gender: 'men', divisionLevel: 'high',
    divisionDetail: null, rawDivision: 'Men High', phase: 'final', record, recordValue,
    direction: 'lower', rank: index + 1, wind: '+0.7', windLegal: true, isComparable: true, note: '',
    source: { provider: 'athletetime_fixture', sourceType: 'qa_fixture', sourceId: `qa-${item.athleteKey}`, sourceUrl: '', capturedAt: '2026-07-13T00:00:00.000Z' },
  };
}

function getSearchResults(query) {
  if (query.includes('missing')) return [];
  return query.includes('limit') ? limitAthletes : athletes;
}

function makeProfile(key) {
  const item = athletes.find((candidate) => candidate.athleteKey === key);
  if (!item) return null;
  const records = [makeRecord(item, 0), makeRecord(item, 1)];
  return {
    athlete: item,
    summary: { indexedBest: records[0], seasonBest: records[0], latest: records[1], delta: null, indexedResultCount: records.length, comparableResultCount: records.length, sourceScope: 'qa_fixture', disclaimer: 'QA fixture' },
    events: [{ eventKey: '100m', eventLabel: '100m', recordCount: records.length, best: records[0] }],
    recordTrail: records.map((record) => ({
      id: record.id, date: record.date, season: record.season, value: record.recordValue,
      record: record.record, eventLabel: record.eventLabel, competitionName: record.competitionName,
      isComparable: record.isComparable,
    })),
    records,
  };
}

function makeWorkspacePreview(subjectKeys) {
  const subjects = subjectKeys
    .map((subjectKey) => [...athletes, savedWorkspaceAthlete].find((athlete) => athlete.athleteKey === subjectKey))
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

module.exports = { filters, getSearchResults, makeInsights, makeProfile, makeWorkspacePreview, seasonTable };
