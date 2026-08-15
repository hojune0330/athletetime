import { z } from 'zod';
import type { AnalyticsFilters } from '../../../api/recordAnalytics';

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

export function toSeasonSelection(
  combination: AnalyticsFilters['availableSeasonCombinations'][number],
): SeasonSelection {
  return {
    season: combination.season,
    eventKey: combination.eventKey,
    divisionKey: combination.divisionKey,
  };
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
  const combinations = filters.availableSeasonCombinations;
  if (combinations.length === 0) return null;

  const seasons = filters.seasons.filter((candidate) =>
    combinations.some((combination) => combination.season === candidate),
  );
  const firstSeason = seasons[0];
  if (firstSeason === undefined) return null;

  const desiredSeason = request.season ?? filters.defaultSeasonSelection.season;
  let season = firstSeason;
  for (const candidate of seasons) {
    if (Math.abs(candidate - desiredSeason) < Math.abs(season - desiredSeason)) season = candidate;
  }

  const seasonCombinations = combinations.filter((combination) => combination.season === season);
  const firstSeasonCombination = seasonCombinations[0];
  if (!firstSeasonCombination) return null;

  const requestedEvent = request.eventKey
    && seasonCombinations.some((combination) => combination.eventKey === request.eventKey)
    ? request.eventKey
    : null;
  const defaultEvent = seasonCombinations.some(
    (combination) => combination.eventKey === filters.defaultSeasonSelection.eventKey,
  )
    ? filters.defaultSeasonSelection.eventKey
    : null;
  const eventKey = requestedEvent ?? defaultEvent ?? firstSeasonCombination.eventKey;
  const eventCombinations = seasonCombinations.filter(
    (combination) => combination.eventKey === eventKey,
  );
  const firstEventCombination = eventCombinations[0];
  if (!firstEventCombination) return null;

  const exactDivision = request.divisionKey
    ? eventCombinations.find((combination) => combination.divisionKey === request.divisionKey)
    : undefined;
  const requestedGender = request.divisionKey
    ? getDivisionGender(filters, request.divisionKey)
    : '';
  const sameGenderDivision = requestedGender
    ? eventCombinations.find(
      (combination) => getDivisionGender(filters, combination.divisionKey) === requestedGender,
    )
    : undefined;
  const defaultDivision = eventCombinations.find(
    (combination) => combination.divisionKey === filters.defaultSeasonSelection.divisionKey,
  );

  return toSeasonSelection(
    exactDivision ?? sameGenderDivision ?? defaultDivision ?? firstEventCombination,
  );
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
