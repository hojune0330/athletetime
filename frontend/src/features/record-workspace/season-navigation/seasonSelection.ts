import { z } from 'zod';
import type { AnalyticsFilters, SeasonAvailability } from '../../../api/recordAnalytics';

const seasonParamSchema = z.coerce.number().int().min(1900).max(2200);

export type SeasonSelection = {
  readonly season: number;
  readonly eventKey: string;
  readonly divisionKey: string;
};

export type SeasonSelectionRequest = {
  readonly hasSelectionParams: boolean;
  readonly season: number | null;
  readonly eventKey: string | null;
  readonly divisionKey: string | null;
};

type SelectionRequest = Pick<SeasonSelectionRequest, 'season' | 'eventKey' | 'divisionKey'>;

export type SeasonNavigationCatalog = AnalyticsFilters & {
  readonly seasonAvailability: SeasonAvailability;
};

export function createSeasonNavigationCatalog(
  filters: AnalyticsFilters,
  seasonAvailability: SeasonAvailability,
): SeasonNavigationCatalog {
  return { ...filters, seasonAvailability };
}

function hasSeasonAvailability(filters: AnalyticsFilters): filters is SeasonNavigationCatalog {
  return 'seasonAvailability' in filters;
}

export function getAvailableSeasonOrder(filters: AnalyticsFilters): readonly number[] {
  if (!hasSeasonAvailability(filters)) return [];
  return filters.seasonAvailability.seasonOrder.filter((season) =>
    Object.values(filters.seasonAvailability.seasons[String(season)] ?? {})
      .some((divisionKeys) => divisionKeys.length > 0),
  );
}

export function getAvailableEventKeys(
  filters: AnalyticsFilters,
  season: number,
): readonly string[] {
  if (!hasSeasonAvailability(filters)) return [];
  return Object.entries(filters.seasonAvailability.seasons[String(season)] ?? {})
    .filter(([, divisionKeys]) => divisionKeys.length > 0)
    .map(([eventKey]) => eventKey);
}

export function getAvailableDivisionKeys(
  filters: AnalyticsFilters,
  season: number,
  eventKey: string,
): readonly string[] {
  if (!hasSeasonAvailability(filters)) return [];
  return filters.seasonAvailability.seasons[String(season)]?.[eventKey] ?? [];
}

export function isSameSeasonSelection(
  left: SeasonSelection,
  right: SeasonSelection,
): boolean {
  return left.season === right.season
    && left.eventKey === right.eventKey
    && left.divisionKey === right.divisionKey;
}

export function getDivisionGender(
  filters: AnalyticsFilters,
  divisionKey: string,
): string {
  const known = filters.divisions.find((division) => division.key === divisionKey);
  if (known) return known.gender;
  const separator = divisionKey.indexOf('-');
  return separator > 0 ? divisionKey.slice(0, separator) : '';
}

function trimmedParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value : null;
}

export function readSeasonSelectionRequest(params: URLSearchParams): SeasonSelectionRequest {
  const rawSeason = trimmedParam(params, 'season');
  const parsedSeason = rawSeason ? seasonParamSchema.safeParse(rawSeason) : null;
  return {
    hasSelectionParams: ['season', 'event', 'division'].some((key) => params.has(key)),
    season: parsedSeason?.success ? parsedSeason.data : null,
    eventKey: trimmedParam(params, 'event'),
    divisionKey: trimmedParam(params, 'division'),
  };
}

export function resolveSeasonSelection(
  filters: AnalyticsFilters,
  request: SelectionRequest,
): SeasonSelection | null {
  const seasons = getAvailableSeasonOrder(filters);
  const firstSeason = seasons[0];
  if (firstSeason === undefined) return null;

  const desiredSeason = request.season ?? filters.defaultSeasonSelection.season;
  let season = firstSeason;
  for (const candidate of seasons) {
    if (Math.abs(candidate - desiredSeason) < Math.abs(season - desiredSeason)) season = candidate;
  }

  const eventKeys = getAvailableEventKeys(filters, season);
  const firstEventKey = eventKeys[0];
  if (!firstEventKey) return null;

  const requestedEvent = request.eventKey
    && eventKeys.includes(request.eventKey)
    ? request.eventKey
    : null;
  const defaultEvent = eventKeys.includes(filters.defaultSeasonSelection.eventKey)
    ? filters.defaultSeasonSelection.eventKey
    : null;
  const eventKey = requestedEvent ?? defaultEvent ?? firstEventKey;
  const divisionKeys = getAvailableDivisionKeys(filters, season, eventKey);
  const firstDivisionKey = divisionKeys[0];
  if (!firstDivisionKey) return null;

  const exactDivision = request.divisionKey
    && divisionKeys.includes(request.divisionKey)
    ? request.divisionKey
    : undefined;
  const requestedGender = request.divisionKey
    ? getDivisionGender(filters, request.divisionKey)
    : '';
  const sameGenderDivision = requestedGender
    ? divisionKeys.find((divisionKey) => getDivisionGender(filters, divisionKey) === requestedGender)
    : undefined;
  const defaultDivision = divisionKeys.includes(filters.defaultSeasonSelection.divisionKey)
    ? filters.defaultSeasonSelection.divisionKey
    : undefined;

  return {
    season,
    eventKey,
    divisionKey: exactDivision ?? sameGenderDivision ?? defaultDivision ?? firstDivisionKey,
  };
}

export function updateSeasonSelectionParams(
  params: URLSearchParams,
  selection: SeasonSelection,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('season', String(selection.season));
  next.set('event', selection.eventKey);
  next.set('division', selection.divisionKey);
  return next;
}

export function seasonSelectionParamsNeedRepair(
  params: URLSearchParams,
  selection: SeasonSelection,
): boolean {
  const hasSelectionParams = ['season', 'event', 'division'].some((key) => params.has(key));
  return hasSelectionParams && (
    params.get('season') !== String(selection.season)
    || params.get('event') !== selection.eventKey
    || params.get('division') !== selection.divisionKey
  );
}
