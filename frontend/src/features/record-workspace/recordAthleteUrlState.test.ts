import { describe, expect, it } from 'vitest'
import {
  createRecordAthleteSharePath,
  parseRecordAthleteSeason,
  resolveRecordAthleteSeason,
  updateRecordAthleteSeason,
} from './recordAthleteUrlState'

describe('athlete record URL season state', () => {
  it('preserves a selected season across URL update, sharing, and reload parsing', () => {
    // Given an athlete record URL with an event and an open record.
    const current = new URLSearchParams('tab=records&event=100m&season=2026&record=result-1')

    // When the user selects 2025 and the resulting URL is parsed after a reload.
    const updated = updateRecordAthleteSeason(current, 2025)
    const reloaded = parseRecordAthleteSeason(new URLSearchParams(updated.toString()))

    // Then the season survives while the now-unrelated open record is cleared.
    expect(reloaded).toBe(2025)
    expect(updated.get('event')).toBe('100m')
    expect(updated.get('record')).toBeNull()
  })

  it('does not restore malformed or unsupported season values', () => {
    // Given malformed and out-of-range season query values.
    const values = ['twenty', '1899', '2201']

    // When each URL is parsed at the page boundary.
    const parsed = values.map((value) => parseRecordAthleteSeason(new URLSearchParams({ season: value })))

    // Then none becomes an internal season selection.
    expect(parsed).toEqual([null, null, null])
  })

  it('treats an absent season as latest without creating a second history entry', () => {
    // Given the event URL that browser Back restores before an explicit season selection.
    const restored = new URLSearchParams('event=100m')

    // When the page resolves its display season from available data.
    const selected = resolveRecordAthleteSeason(parseRecordAthleteSeason(restored), [2026, 2025])

    // Then latest is displayed without mutating the restored URL and trapping Back navigation.
    expect(selected).toBe(2026)
    expect(restored.toString()).toBe('event=100m')
  })

  it('creates a canonical athlete share path without local collection or search state', () => {
    // Given a detail page URL that also contains transient browsing and device-local state.
    const current = new URLSearchParams(
      'tab=records&event=100m&season=2026&record=result-1&flow=browse&step=review&mineDraft=athlete-1&compare=athlete-2&q=%EA%B9%80%EB%AF%BC%EC%A7%80',
    )

    // When the user creates a public link for the selected athlete.
    const path = createRecordAthleteSharePath('athlete/kim-minji', current)

    // Then the URL retains only public athlete-detail context.
    expect(path).toBe('/records/athletes/athlete%2Fkim-minji?event=100m&season=2026&record=result-1')
  })

  it('drops malformed public detail state from an athlete share path', () => {
    // Given state that cannot reliably restore a public record detail view.
    const current = new URLSearchParams('tab=unknown&event=%20&season=2201&record=result-1')

    // When the user creates a public link.
    const path = createRecordAthleteSharePath('athlete-1', current)

    // Then the link is reduced to the canonical athlete page.
    expect(path).toBe('/records/athletes/athlete-1')
  })
})
