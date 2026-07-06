export type RecordDirection = 'lower' | 'higher';

export type RecordSource = {
  provider: 'KAAF' | 'PaceRise' | 'AthleteTime';
  sourceType: 'public_result' | 'live_result' | 'collected_public_record';
  sourceId: string;
  sourceUrl?: string;
  capturedAt: string;
};

export type AthleteRecord = {
  id: string;
  competitionId: string;
  competitionName: string;
  date: string;
  venue: string;
  event: string;
  eventGroup: 'sprint' | 'hurdle' | 'middle' | 'field' | 'relay';
  phase: 'final' | 'semi-final' | 'heat';
  rank: number;
  mark: string;
  value: number;
  direction: RecordDirection;
  wind?: string;
  source: RecordSource;
};

export type AthleteProfile = {
  id: string;
  name: string;
  team: string;
  displayGroup: string;
  primaryEvent: string;
  sourceNote: string;
  records: AthleteRecord[];
};

export const recordCorrectionUrl = '/data-request';

// No local fake athlete records. Screens using this type must use the live API
// and render an empty/error state when the API is unavailable.
export const athleteProfiles: AthleteProfile[] = [];
