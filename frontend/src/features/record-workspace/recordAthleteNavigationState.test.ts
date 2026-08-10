import { describe, expect, it } from 'vitest'
import {
  createRecordAthleteReturnState,
  resolveRecordAthleteReturnPath,
} from './recordAthleteNavigationState'

describe('record athlete navigation state', () => {
  it('keeps only the active public candidate query for an in-app return', () => {
    const state = createRecordAthleteReturnState({
      pathname: '/records',
      search: '?flow=browse&browse=athlete&q=Alpha&compare=beta-2016&mineDraft=alpha-2016',
    })

    expect(state).toEqual({ recordsReturnPath: '/records?flow=browse&browse=athlete&q=Alpha' })
  })

  it('rejects any return state that is not an athlete search result route', () => {
    expect(resolveRecordAthleteReturnPath({ recordsReturnPath: 'https://example.com/records?flow=browse&browse=athlete&q=Alpha' })).toBeNull()
    expect(resolveRecordAthleteReturnPath({ recordsReturnPath: '/records?flow=mine&browse=athlete&q=Alpha' })).toBeNull()
    expect(resolveRecordAthleteReturnPath({ recordsReturnPath: '/records?flow=browse&browse=athlete&q=A' })).toBeNull()
  })

  it('keeps the finished device-local collection as a safe return destination', () => {
    // Given the dedicated athlete page opened from the completed collection flow.
    const state = { recordsReturnPath: '/records?flow=mine&step=done' }

    // When the page resolves the return destination.
    // Then it restores the completed local collection without carrying an athlete identity through the URL.
    expect(resolveRecordAthleteReturnPath(state)).toBe('/records?flow=mine&step=done')
  })
})
