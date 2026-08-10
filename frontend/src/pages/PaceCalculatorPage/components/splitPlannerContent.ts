import type { PaceStrategy } from '../utils/paceCalculations';

export const SPLIT_DISTANCE_OPTIONS = [
  { label: '5km', value: 5 },
  { label: '10km', value: 10 },
  { label: '하프', value: 21.0975 },
  { label: '풀코스', value: 42.195 },
] as const;

type TimePreset = {
  readonly label: string;
  readonly hours: number;
  readonly minutes: number;
};

export const SPLIT_TIME_PRESETS: Readonly<Record<number, readonly TimePreset[]>> = {
  5: [
    { label: '20:00', hours: 0, minutes: 20 },
    { label: '25:00', hours: 0, minutes: 25 },
    { label: '30:00', hours: 0, minutes: 30 },
  ],
  10: [
    { label: '40:00', hours: 0, minutes: 40 },
    { label: '50:00', hours: 0, minutes: 50 },
    { label: '1:00:00', hours: 1, minutes: 0 },
  ],
  21.0975: [
    { label: '1:30:00', hours: 1, minutes: 30 },
    { label: '1:45:00', hours: 1, minutes: 45 },
    { label: '2:00:00', hours: 2, minutes: 0 },
  ],
  42.195: [
    { label: '3:00:00', hours: 3, minutes: 0 },
    { label: '3:30:00', hours: 3, minutes: 30 },
    { label: '4:00:00', hours: 4, minutes: 0 },
  ],
};

export const SPLIT_STRATEGIES: Readonly<Record<PaceStrategy, {
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}>> = {
  even: {
    label: '균등 페이스',
    shortLabel: '처음부터 끝까지 같은 기준 페이스',
    description: '구간마다 같은 기준 페이스를 보여줘요.',
  },
  negative: {
    label: '후반 가속',
    shortLabel: '후반부를 조금 더 빠르게',
    description: '앞 구간은 여유 있게, 뒤 구간은 조금 빠르게 나눠요.',
  },
  positive: {
    label: '전반 가속',
    shortLabel: '전반부를 조금 더 빠르게',
    description: '앞 구간을 조금 빠르게, 뒤 구간은 여유 있게 나눠요.',
  },
};
