import type { DataRequestType } from '../api/dataRequests';

const DATA_REQUEST_TYPES: readonly DataRequestType[] = ['correction', 'deletion', 'objection'];

export function resolveDataRequestType(value: string | null): DataRequestType {
  if (isDataRequestType(value)) return value;
  return 'correction';
}

export function resolvePrefilledAthleteName(value: string | null): string {
  return value?.trim() || '';
}

function isDataRequestType(value: string | null): value is DataRequestType {
  return value !== null && DATA_REQUEST_TYPES.some((type) => type === value);
}
