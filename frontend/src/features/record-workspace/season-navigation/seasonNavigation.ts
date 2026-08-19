import type { AnalyticsFilters, PublicRecord } from '../../../api/recordAnalytics';
import {
  getAvailableDivisionKeys,
  getAvailableEventKeys,
  getAvailableSeasonOrder,
  getDivisionGender,
  isSameSeasonSelection,
  resolveSeasonSelection,
  type SeasonSelection,
} from './seasonSelection';

export {
  createSeasonNavigationCatalog,
  readSeasonSelectionRequest,
  resolveSeasonSelection,
  seasonSelectionParamsNeedRepair,
  updateSeasonSelectionParams,
  type SeasonSelection,
  type SeasonNavigationCatalog,
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

export type SeasonRecovery = {
  readonly kind: 'nearest' | 'default';
  readonly selection: SeasonSelection;
};

function assertNever(value: never): never {
  throw new TypeError('Unknown season selection change: ' + JSON.stringify(value));
}

export function getSeasonNavigationOptions(
  filters: AnalyticsFilters,
  selection: SeasonSelection,
): SeasonNavigationOptions {
  const eventKeys = getAvailableEventKeys(filters, selection.season);
  const divisionKeys = getAvailableDivisionKeys(
    filters,
    selection.season,
    selection.eventKey,
  );
  const selectedDivision = filters.divisions.find(
    (division) => division.key === selection.divisionKey,
  );
  const genderKey = selectedDivision?.gender ?? getDivisionGender(filters, selection.divisionKey);
  const divisionLevel = selectedDivision?.level ?? 'unspecified';

  return {
    seasons: getAvailableSeasonOrder(filters),
    events: filters.events.filter((event) => eventKeys.includes(event.key)),
    genders: filters.genderOptions.filter((gender) =>
      divisionKeys.some((divisionKey) => getDivisionGender(filters, divisionKey) === gender.key),
    ),
    levels: filters.levelOptions.filter((level) =>
      divisionKeys.some((divisionKey) =>
        filters.divisions.some((division) =>
          division.key === divisionKey
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
  const divisionKeys = getAvailableDivisionKeys(
    filters,
    selection.season,
    selection.eventKey,
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
          divisionKeys.includes(division.key)
          && division.gender === change.genderKey
          && division.level === selectedDivision?.level,
      )?.key ?? filters.divisions.find(
        (division) =>
          divisionKeys.includes(division.key)
          && division.gender === change.genderKey,
      )?.key ?? divisionKey;
      break;
    case 'division':
      divisionKey = filters.divisions.find(
        (division) =>
          divisionKeys.includes(division.key)
          && division.gender === selectedDivision?.gender
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
  return resolveSeasonRecovery(filters, selection)?.selection ?? null;
}

export function resolveSeasonRecovery(
  filters: AnalyticsFilters,
  selection: SeasonSelection,
): SeasonRecovery | null {
  let nearest: SeasonSelection | null = null;
  for (const season of getAvailableSeasonOrder(filters)) {
    if (
      season === selection.season
      || !getAvailableDivisionKeys(filters, season, selection.eventKey)
        .includes(selection.divisionKey)
    ) continue;
    const candidate = { ...selection, season };
    if (
      !nearest
      || Math.abs(candidate.season - selection.season)
        < Math.abs(nearest.season - selection.season)
    ) nearest = candidate;
  }
  if (nearest) return { kind: 'nearest', selection: nearest };

  const fallback = resolveSeasonSelection(filters, {
    season: filters.defaultSeasonSelection.season,
    eventKey: filters.defaultSeasonSelection.eventKey,
    divisionKey: filters.defaultSeasonSelection.divisionKey,
  });
  return fallback && !isSameSeasonSelection(fallback, selection)
    ? { kind: 'default', selection: fallback }
    : null;
}
