const MIN_SEASON = 1900
const MAX_SEASON = 2200

export function parseRecordAthleteSeason(params: URLSearchParams): number | null {
  const value = params.get('season')
  if (!value || !/^\d{4}$/u.test(value)) return null
  const season = Number(value)
  return season >= MIN_SEASON && season <= MAX_SEASON ? season : null
}

export function resolveRecordAthleteSeason(
  selectedSeason: number | null,
  availableSeasons: readonly number[],
): number | null {
  if (selectedSeason !== null && availableSeasons.includes(selectedSeason)) return selectedSeason
  return availableSeasons[0] ?? null
}

export function updateRecordAthleteSeason(
  params: URLSearchParams,
  season: number | null,
): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete('record')
  if (season === null) next.delete('season')
  else next.set('season', String(season))
  return next
}
