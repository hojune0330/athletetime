import { describe, expect, it } from 'vitest';
import {
  EMPTY_TIME,
  getPerformanceSeconds,
  hasDirectPerformanceInput,
  hasSelectedDistance,
  parseOptionalClockValue,
  type TimeInput,
} from './trainingCalculatorInput';

describe('training calculator direct-input boundary', () => {
  it('Given an untouched calculator When readiness is checked Then no performance is accepted', () => {
    expect(hasDirectPerformanceInput(EMPTY_TIME)).toBe(false);
    expect(getPerformanceSeconds(EMPTY_TIME)).toBe(0);
    expect(hasSelectedDistance('')).toBe(false);
  });

  it('Given a runner enters only minutes When the performance is valid Then it is ready without a sample hour or second', () => {
    const time: TimeInput = { hours: null, minutes: 20, seconds: null };

    expect(hasDirectPerformanceInput(time)).toBe(true);
    expect(getPerformanceSeconds(time)).toBe(1_200);
    expect(hasSelectedDistance('5000')).toBe(true);
  });

  it('Given a clock field is blank, zero-only, or outside its range When it is parsed and checked Then it cannot produce a plan', () => {
    expect(parseOptionalClockValue('')).toBeNull();
    expect(hasDirectPerformanceInput({ hours: 0, minutes: 0, seconds: 0 })).toBe(false);
    expect(hasDirectPerformanceInput({ hours: null, minutes: 60, seconds: null })).toBe(false);
  });
});
