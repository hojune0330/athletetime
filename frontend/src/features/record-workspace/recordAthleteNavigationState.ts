type RecordsLocation = {
  readonly pathname: string
  readonly search: string
}

export type RecordAthleteReturnState = {
  readonly recordsReturnPath: string
}

export function createRecordAthleteReturnState(location: RecordsLocation): RecordAthleteReturnState | null {
  const recordsReturnPath = normalizeRecordsBrowsePath(location.pathname, location.search)
  return recordsReturnPath ? { recordsReturnPath } : null
}

export function resolveRecordAthleteReturnPath(state: unknown): string | null {
  if (!isRecord(state) || typeof state.recordsReturnPath !== 'string') return null

  const questionMarkIndex = state.recordsReturnPath.indexOf('?')
  if (questionMarkIndex < 0) return null

  return normalizeRecordsBrowsePath(
    state.recordsReturnPath.slice(0, questionMarkIndex),
    state.recordsReturnPath.slice(questionMarkIndex),
  )
}

function normalizeRecordsBrowsePath(pathname: string, search: string): string | null {
  if (pathname !== '/records') return null

  const params = new URLSearchParams(search)
  const query = params.get('q')?.trim() ?? ''
  if (params.get('flow') !== 'browse' || params.get('browse') !== 'athlete' || query.length < 2) return null

  return `/records?${new URLSearchParams({ flow: 'browse', browse: 'athlete', q: query }).toString()}`
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
