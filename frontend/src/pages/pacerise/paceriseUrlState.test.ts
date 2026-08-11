import { describe, expect, it } from 'vitest'
import { resolvePaceRiseUrl } from './paceriseUrlState'

const competitions = [
  { id: 101, status: 'completed' },
  { id: 202, status: 'active' },
] as const

describe('PaceRise URL state', () => {
  it('falls back to the active competition when the id is malformed', () => {
    // Given a deep link with a non-numeric competition id.
    const search = new URLSearchParams('id=abc&tab=schedule')

    // When the URL is resolved against loaded competitions.
    const resolved = resolvePaceRiseUrl(search, competitions)

    // Then it selects the active competition and retains the valid tab.
    expect(resolved.competitionId).toBe(202)
    expect(resolved.tab).toBe('schedule')
    expect(resolved.hasStaleCompetitionLink).toBe(true)
    expect(resolved.needsCanonicalUrl).toBe(true)
    expect(resolved.canonicalSearch.get('id')).toBe('202')
  })

  it.each(['0xca', '2.02e2', '202.0', '0', '-202'])('treats non-canonical id=%s as a stale link', (id) => {
    const resolved = resolvePaceRiseUrl(new URLSearchParams(`id=${id}&tab=results`), competitions)

    expect(resolved.competitionId).toBe(202)
    expect(resolved.hasStaleCompetitionLink).toBe(true)
    expect(resolved.needsCanonicalUrl).toBe(true)
    expect(resolved.canonicalSearch.get('id')).toBe('202')
  })

  it('falls back to the active competition when the requested id is not loaded', () => {
    // Given a stale numeric competition id.
    const search = new URLSearchParams('id=999999&tab=schedule')

    // When the URL is resolved against the current competition list.
    const resolved = resolvePaceRiseUrl(search, competitions)

    // Then the active competition is selected instead of leaving the page blank.
    expect(resolved.competitionId).toBe(202)
    expect(resolved.tab).toBe('schedule')
    expect(resolved.hasStaleCompetitionLink).toBe(true)
    expect(resolved.canonicalSearch.get('id')).toBe('202')
  })

  it('falls back to the first competition when no active competition is available', () => {
    // Given a link without a competition id and no active competition.
    const search = new URLSearchParams('tab=athletes')
    const completedCompetitions = [{ id: 101, status: 'completed' }] as const

    // When the URL is resolved against loaded competitions.
    const resolved = resolvePaceRiseUrl(search, completedCompetitions)

    // Then the first competition provides a deterministic selection.
    expect(resolved.competitionId).toBe(101)
    expect(resolved.tab).toBe('athletes')
    expect(resolved.hasStaleCompetitionLink).toBe(false)
    expect(resolved.canonicalSearch.get('id')).toBe('101')
  })

  it('normalizes an invalid tab without discarding a valid competition id', () => {
    // Given a valid competition id and unsupported tab.
    const search = new URLSearchParams('id=101&tab=unknown')

    // When the URL is resolved against loaded competitions.
    const resolved = resolvePaceRiseUrl(search, competitions)

    // Then the id remains selected and the tab falls back to results.
    expect(resolved.competitionId).toBe(101)
    expect(resolved.tab).toBe('results')
    expect(resolved.hasStaleCompetitionLink).toBe(false)
    expect(resolved.needsCanonicalUrl).toBe(true)
    expect(resolved.canonicalSearch.get('tab')).toBe('results')
  })

  it('keeps a valid competition id and tab stable', () => {
    // Given a canonical deep link.
    const search = new URLSearchParams('id=202&tab=schedule')

    // When the URL is resolved against loaded competitions.
    const resolved = resolvePaceRiseUrl(search, competitions)

    // Then both values remain unchanged and no history replacement is needed.
    expect(resolved.competitionId).toBe(202)
    expect(resolved.tab).toBe('schedule')
    expect(resolved.hasStaleCompetitionLink).toBe(false)
    expect(resolved.needsCanonicalUrl).toBe(false)
    expect(resolved.canonicalSearch.toString()).toBe(search.toString())
  })
})
