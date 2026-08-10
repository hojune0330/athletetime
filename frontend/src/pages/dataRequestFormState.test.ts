import { describe, expect, it } from 'vitest';
import { resolveDataRequestType, resolvePrefilledAthleteName } from './dataRequestFormState';

describe('data request form state', () => {
  it('Given no valid type query When a request form opens Then correction is the safe default', () => {
    expect(resolveDataRequestType(null)).toBe('correction');
    expect(resolveDataRequestType('unknown')).toBe('correction');
  });

  it('Given a valid correction-link type When the form opens Then it keeps that explicit intent', () => {
    expect(resolveDataRequestType('correction')).toBe('correction');
    expect(resolveDataRequestType('deletion')).toBe('deletion');
    expect(resolveDataRequestType('objection')).toBe('objection');
  });

  it('Given a public athlete query When it pre-fills the form Then only its trimmed display text is used', () => {
    expect(resolvePrefilledAthleteName('  김육상  ')).toBe('김육상');
    expect(resolvePrefilledAthleteName(null)).toBe('');
  });
});
