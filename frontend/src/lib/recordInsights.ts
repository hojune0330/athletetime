import { recordCorrectionUrl, type AthleteProfile, type AthleteRecord, type RecordSource } from '../data/athleteRecords';

export type RecordInsight = {
  id: string;
  label: string;
  title: string;
  body: string;
  metric: string;
  tone: 'green' | 'blue' | 'orange' | 'neutral';
};

export type AthleteInsightSummary = {
  athlete: AthleteProfile;
  records: AthleteRecord[];
  primaryRecords: AthleteRecord[];
  bestRecord: AthleteRecord;
  latestRecord: AthleteRecord;
  improvement: number;
  improvementLabel: string;
  finalStreak: number;
  podiumStreak: number;
  insights: RecordInsight[];
  shareCard: {
    eyebrow: string;
    headline: string;
    body: string;
    footnote: string;
    source: string;
    correctionUrl: string;
  };
};

const CURRENT_SEASON = '2026';

export function normalizeSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function isMalformedSearch(value: string) {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return false;
  return !/[가-힣a-zA-Z0-9]/.test(normalized);
}

export function searchAthleteProfiles(profiles: AthleteProfile[], rawQuery: string) {
  const query = normalizeSearchQuery(rawQuery).toLowerCase();
  if (!query || isMalformedSearch(query)) return [];

  return profiles.filter((profile) => {
    const haystack = [
      profile.name,
      profile.team,
      profile.displayGroup,
      profile.primaryEvent,
      ...profile.records.flatMap((record) => [record.event, record.competitionName, record.venue]),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function buildAthleteInsightSummary(athlete: AthleteProfile): AthleteInsightSummary | null {
  const records = [...athlete.records].sort((a, b) => a.date.localeCompare(b.date));
  const primaryRecords = records.filter((record) => record.event === athlete.primaryEvent);
  const insightRecords = primaryRecords.length > 0 ? primaryRecords : records;

  if (insightRecords.length === 0) {
    return null;
  }

  const eventLabel = insightRecords[0]?.event ?? athlete.primaryEvent;
  const bestRecord = getBestRecord(insightRecords);
  const latestRecord = insightRecords[insightRecords.length - 1];
  const firstRecord = insightRecords[0];
  const improvement = getImprovement(firstRecord, latestRecord);
  const improvementLabel = formatImprovement(improvement, latestRecord.direction);
  const finalStreak = countLatestStreak(insightRecords, (record) => record.phase === 'final');
  const podiumStreak = countLatestStreak(insightRecords, (record) => record.rank > 0 && record.rank <= 3);
  const insights = buildInsights({
    athlete,
    primaryRecords: insightRecords,
    eventLabel,
    bestRecord,
    latestRecord,
    improvement,
    improvementLabel,
    finalStreak,
    podiumStreak,
  });

  return {
    athlete,
    records,
    primaryRecords: insightRecords,
    bestRecord,
    latestRecord,
    improvement,
    improvementLabel,
    finalStreak,
    podiumStreak,
    insights,
    shareCard: buildShareCard(athlete, insights, latestRecord),
  };
}

function buildInsights({
  athlete,
  primaryRecords,
  eventLabel,
  bestRecord,
  latestRecord,
  improvement,
  improvementLabel,
  finalStreak,
  podiumStreak,
}: {
  athlete: AthleteProfile;
  primaryRecords: AthleteRecord[];
  eventLabel: string;
  bestRecord: AthleteRecord;
  latestRecord: AthleteRecord;
  improvement: number;
  improvementLabel: string;
  finalStreak: number;
  podiumStreak: number;
}): RecordInsight[] {
  const insights: RecordInsight[] = [];
  const seasonRecords = primaryRecords.filter((record) => record.date.startsWith(CURRENT_SEASON));
  const seasonBest = seasonRecords.length > 0 ? getBestRecord(seasonRecords) : null;

  insights.push({
    id: 'pb',
    label: '모은 기록 중 최고',
    title: `${eventLabel} ${bestRecord.mark}`,
    body: `AthleteTime이 모은 공개 기록 기준, ${athlete.name} 선수의 가장 좋은 ${eventLabel} 기록입니다.`,
    metric: bestRecord.mark,
    tone: 'green',
  });

  if (seasonBest) {
    insights.push({
      id: 'season-best',
      label: '이번 시즌 기록',
      title: `${CURRENT_SEASON} 시즌 ${seasonBest.mark}`,
      body: `${seasonBest.competitionName} 결과 기준으로 확인한, AthleteTime이 모은 이번 시즌 기록입니다.`,
      metric: seasonBest.mark,
      tone: 'blue',
    });
  }

  if (improvement > 0) {
    insights.push({
      id: 'improvement',
      label: '기록 흐름',
      title: `최근 흐름 ${improvementLabel}`,
      body: `확인한 ${primaryRecords.length}개 ${eventLabel} 결과에서 첫 기록 대비 최신 기록이 ${improvementLabel} 좋아졌습니다.`,
      metric: improvementLabel,
      tone: 'orange',
    });
  }

  if (finalStreak >= 2) {
    insights.push({
      id: 'final-streak',
      label: '결승 흐름',
      title: `${finalStreak}경기 연속 결승 기록`,
      body: `최근 ${finalStreak}개 ${eventLabel} 결과가 모두 결승 기록으로 확인됩니다.`,
      metric: `${finalStreak}회`,
      tone: 'neutral',
    });
  }

  if (podiumStreak >= 2) {
    insights.push({
      id: 'podium-streak',
      label: '입상 흐름',
      title: `${podiumStreak}경기 연속 3위권`,
      body: `최근 ${podiumStreak}개 ${eventLabel} 결승 결과에서 3위권 기록이 이어졌습니다.`,
      metric: `${podiumStreak}회`,
      tone: 'green',
    });
  }

  if (latestRecord.source.provider === 'PaceRise') {
    insights.push({
      id: 'live-source',
      label: '소스',
      title: '라이브 결과 연결 가능',
      body: 'PaceRise 형태의 라이브 결과도 같은 기록 구조로 합칠 수 있도록 설계했습니다.',
      metric: 'PaceRise',
      tone: 'blue',
    });
  }

  return insights.slice(0, 5);
}

function getBestRecord(records: AthleteRecord[]) {
  return records.reduce((best, record) => {
    if (!best) return record;
    return isBetter(record, best) ? record : best;
  }, records[0]);
}

function isBetter(candidate: AthleteRecord, current: AthleteRecord) {
  if (candidate.direction === 'higher') return candidate.value > current.value;
  return candidate.value < current.value;
}

function getImprovement(firstRecord: AthleteRecord, latestRecord: AthleteRecord) {
  if (latestRecord.direction === 'higher') return latestRecord.value - firstRecord.value;
  return firstRecord.value - latestRecord.value;
}

function formatImprovement(value: number, direction: AthleteRecord['direction']) {
  if (value <= 0) return '변화 없음';
  const suffix = direction === 'higher' ? 'm 상승' : '초 단축';
  return `${value.toFixed(2)}${suffix}`;
}

function countLatestStreak(records: AthleteRecord[], predicate: (record: AthleteRecord) => boolean) {
  let count = 0;
  for (const record of [...records].reverse()) {
    if (!predicate(record)) break;
    count += 1;
  }
  return count;
}

function buildShareCard(athlete: AthleteProfile, insights: RecordInsight[], latestRecord: AthleteRecord) {
  const primary = insights.find((insight) => insight.id === 'improvement') ?? insights[0];
  const sourceLabel = getSourceLabel(latestRecord.source);

  return {
    eyebrow: 'AthleteTime record insight',
    headline: `${athlete.name} · ${athlete.primaryEvent}`,
    body: primary
      ? `${primary.title}. ${primary.body}`
      : `${latestRecord.competitionName}에서 ${latestRecord.mark} 기록을 확인했습니다.`,
    footnote: '모은 공개 기록 기준이며, 표기 오류는 정정 요청 링크로 남겨주세요.',
    source: `${sourceLabel} · ${latestRecord.date} · 출처 정보`,
    correctionUrl: recordCorrectionUrl,
  };
}

function getSourceLabel(source: RecordSource) {
  return `${source.provider} 공개 결과`;
}
