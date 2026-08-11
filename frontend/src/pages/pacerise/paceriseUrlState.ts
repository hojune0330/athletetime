import { z } from 'zod'

export const PACERISE_TABS = ['results', 'schedule', 'athletes'] as const

export type PaceRiseTab = (typeof PACERISE_TABS)[number]

type PaceRiseCompetition = {
  readonly id: number
  readonly status: string
}

export type PaceRiseUrlState = {
  readonly competitionId: number | null
  readonly tab: PaceRiseTab
  readonly hasStaleCompetitionLink: boolean
  readonly needsCanonicalUrl: boolean
  readonly canonicalSearch: URLSearchParams
}

const tabSchema = z.enum(PACERISE_TABS)

function parseCompetitionId(value: string | null): number | null {
  const normalized = value?.trim() ?? ''
  if (!/^[1-9]\d*$/u.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function parseTab(value: string | null): PaceRiseTab {
  const parsed = tabSchema.safeParse(value)
  return parsed.success ? parsed.data : 'results'
}

export function resolvePaceRiseUrl(
  searchParams: URLSearchParams,
  competitions: readonly PaceRiseCompetition[],
): PaceRiseUrlState {
  const tab = parseTab(searchParams.get('tab'))
  const requestedId = parseCompetitionId(searchParams.get('id'))
  const requestedCompetition = requestedId === null
    ? undefined
    : competitions.find((competition) => competition.id === requestedId)
  const fallbackCompetition = competitions.find((competition) => competition.status === 'active') ?? competitions.at(0)
  const selectedCompetition = requestedCompetition ?? fallbackCompetition

  if (!selectedCompetition) {
    return {
      competitionId: null,
      tab,
      hasStaleCompetitionLink: false,
      needsCanonicalUrl: false,
      canonicalSearch: new URLSearchParams(searchParams),
    }
  }

  const canonicalSearch = new URLSearchParams(searchParams)
  canonicalSearch.set('id', String(selectedCompetition.id))
  canonicalSearch.set('tab', tab)

  return {
    competitionId: selectedCompetition.id,
    tab,
    hasStaleCompetitionLink: searchParams.has('id') && requestedCompetition === undefined,
    needsCanonicalUrl: canonicalSearch.toString() !== searchParams.toString(),
    canonicalSearch,
  }
}

export function createPaceRiseSearchParams(
  searchParams: URLSearchParams,
  competitionId: number,
  tab: PaceRiseTab,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams)
  nextSearchParams.set('id', String(competitionId))
  nextSearchParams.set('tab', tab)
  return nextSearchParams
}
