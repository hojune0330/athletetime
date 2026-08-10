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

export function createRecordAthleteSharePath(
  athleteKey: string,
  params: URLSearchParams,
): string {
  const next = new URLSearchParams()
  const tab = params.get('tab')
  if (tab === 'affiliations' || tab === 'sources') next.set('tab', tab)

  if (tab === null || tab === 'records') {
    const eventKey = params.get('event')?.trim()
    if (eventKey) {
      next.set('event', eventKey)
      const season = parseRecordAthleteSeason(params)
      if (season !== null) next.set('season', String(season))
      const recordId = params.get('record')?.trim()
      if (recordId) next.set('record', recordId)
    }
  }

  const query = next.toString()
  const path = `/records/athletes/${encodeURIComponent(athleteKey)}`
  return query ? `${path}?${query}` : path
}
