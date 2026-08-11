export type TimeInput = {
  readonly hours: number | null;
  readonly minutes: number | null;
  readonly seconds: number | null;
};

export const EMPTY_TIME: TimeInput = {
  hours: null,
  minutes: null,
  seconds: null,
};

export function parseOptionalClockValue(value: string): number | null {
  if (value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasSelectedDistance(value: string): boolean {
  const distance = Number(value);
  return Number.isFinite(distance) && distance > 0;
}

export function hasDirectPerformanceInput(time: TimeInput): boolean {
  const isValidHour = time.hours === null || (Number.isInteger(time.hours) && time.hours >= 0 && time.hours <= 23);
  const isValidMinute = time.minutes === null || (Number.isInteger(time.minutes) && time.minutes >= 0 && time.minutes < 60);
  const isValidSecond = time.seconds === null || (Number.isFinite(time.seconds) && time.seconds >= 0 && time.seconds < 60);
  const totalSeconds = (time.hours ?? 0) * 3600 + (time.minutes ?? 0) * 60 + (time.seconds ?? 0);

  return isValidHour && isValidMinute && isValidSecond && totalSeconds > 0;
}

export function getPerformanceSeconds(time: TimeInput): number {
  return (time.hours ?? 0) * 3600 + (time.minutes ?? 0) * 60 + (time.seconds ?? 0);
}
