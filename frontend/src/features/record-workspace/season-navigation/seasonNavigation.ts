import type { AnalyticsFilters, PublicRecord } from '../../../api/recordAnalytics';
import {
  getDivisionGender,
  isSameSeasonSelection,
  resolveSeasonSelection,
  toSeasonSelection,
  type SeasonSelection,
} from './seasonSelection';

export {
  readSeasonSelectionRequest,
  resolveSeasonSelection,
  seasonSelectionParamsNeedRepair,
  updateSeasonSelectionParams,
  type SeasonSelection,
  type SeasonSelectionRequest,
} from './seasonSelection';

export type AthleteSeasonRecord = Pick<PublicRecord, 'season' | 'eventKey' | 'divisionKey'>;

export function resolveAthleteSeasonSelection(
  filters: AnalyticsFilters,
  record: AthleteSeasonRecord,
): SeasonSelection | null {
  return resolveSeasonSelection(filters, {
    season: record.season,
    eventKey: record.eventKey,
    divisionKey: record.divisionKey,
  });
}

export type SeasonSelectionChange =
  | { readonly kind: 'season'; readonly season: number }
  | { readonly kind: 'event'; readonly eventKey: string }
  | { readonly kind: 'gender'; readonly genderKey: string }
  | { readonly kind: 'division'; readonly divisionLevel: string };

export type SeasonNavigationOptions = {
  readonly seasons: readonly number[];
  readonly events: AnalyticsFilters['events'];
  readonly genders: AnalyticsFilters['genderOptions'];
  readonly levels: AnalyticsFilters['levelOptions'];
  readonly genderKey: string;
  readonly divisionLevel: string;
};

function assertNever(value: never): never {
  throw new TypeError('Unknown season selection change: ' + JSON.stringify(value));
}

export function getSeasonNavigationOptions(
  filters: AnalyticsFilters,
  selection: SeasonSelection,
): SeasonNavigationOptions {
  const combinations = filters.availableSeasonCombinations;
  const eventCombinations = combinations.filter(
    (combination) =>
      combination.season === selection.season
      && combination.eventKey === selection.eventKey,
  );
  const selectedDivision = filters.divisions.find(
    (division) => division.key === selection.divisionKey,
  );
  const genderKey = selectedDivision?.gender ?? getDivisionGender(filters, selection.divisionKey);
  const divisionLevel = selectedDivision?.level ?? 'all';

  return {
    seasons: filters.seasons.filter((season) =>
      combinations.some((combination) => combination.season === season),
    ),
    events: filters.events.filter((event) =>
      combinations.some(
        (combination) =>
          combination.season === selection.season
          && combination.eventKey === event.key,
      ),
    ),
    genders: filters.genderOptions.filter((gender) =>
      eventCombinations.some(
        (combination) => getDivisionGender(filters, combination.divisionKey) === gender.key,
      ),
    ),
    levels: filters.levelOptions.filter((level) =>
      eventCombinations.some((combination) =>
        filters.divisions.some(
          (division) =>
            division.key === combination.divisionKey
            && division.gender === genderKey
            && division.level === level.key,
        ),
      ),
    ),
    genderKey,
    divisionLevel,
  };
}

export function changeSeasonSelection(
  filters: AnalyticsFilters,
  selection: SeasonSelection,
  change: SeasonSelectionChange,
): SeasonSelection {
  const selectedDivision = filters.divisions.find(
    (division) => division.key === selection.divisionKey,
  );
  let divisionKey = selection.divisionKey;

  switch (change.kind) {
    case 'season':
      return resolveSeasonSelection(filters, { ...selection, season: change.season }) ?? selection;
    case 'event':
      return resolveSeasonSelection(filters, { ...selection, eventKey: change.eventKey }) ?? selection;
    case 'gender':
      divisionKey = filters.divisions.find(
        (division) =>
          division.gender === change.genderKey
          && division.level === selectedDivision?.level,
      )?.key ?? filters.divisions.find(
        (division) => division.gender === change.genderKey,
      )?.key ?? divisionKey;
      break;
    case 'division':
      divisionKey = filters.divisions.find(
        (division) =>
          division.gender === selectedDivision?.gender
          && division.level === change.divisionLevel,
      )?.key ?? divisionKey;
      break;
    default:
      return assertNever(change);
  }

  return resolveSeasonSelection(filters, { ...selection, divisionKey }) ?? selection;
}

export function findNearestSeasonSelection(
  filters: AnalyticsFilters,
  selection: SeasonSelection,
): SeasonSelection | null {
  let nearest: SeasonSelection | null = null;
  for (const combination of filters.availableSeasonCombinations) {
    if (
      combination.eventKey !== selection.eventKey
      || combination.divisionKey !== selection.divisionKey
      || combination.season === selection.season
    ) continue;
    const candidate = toSeasonSelection(combination);
    if (
      !nearest
      || Math.abs(candidate.season - selection.season)
        < Math.abs(nearest.season - selection.season)
    ) nearest = candidate;
  }
  if (nearest) return nearest;

  const fallback = resolveSeasonSelection(filters, {
    season: filters.defaultSeasonSelection.season,
    eventKey: filters.defaultSeasonSelection.eventKey,
    divisionKey: filters.defaultSeasonSelection.divisionKey,
  });
  return fallback && !isSameSeasonSelection(fallback, selection) ? fallback : null;
}
