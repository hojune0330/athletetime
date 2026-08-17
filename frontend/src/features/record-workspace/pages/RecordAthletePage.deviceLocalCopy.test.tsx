import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RecordAthletePage from './RecordAthletePage'

vi.mock('../components/AffiliationHistory', () => ({ AffiliationHistory: () => null }))
vi.mock('../components/RecordCoverageReceipt', () => ({ RecordCoverageReceipt: () => null }))
vi.mock('../components/RecordIdentityHeader', () => ({ RecordIdentityHeader: () => null }))
vi.mock('../useRecordAthletePreview', () => ({
  useRecordAthletePreview: () => ({
    fetchNextPage: () => Promise.resolve(),
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    preview: {
      affiliations: [],
      coverage: { returned: 0, totalMatched: 0 },
      identity: { displayName: 'Alpha Kim', warning: 'none' },
      records: [],
      resolvedSubjectKeys: [{ requestedSubjectKey: 'alpha-2016', athleteKey: 'alpha-2016' }],
      subjects: [{ athleteKey: 'alpha-2016', name: 'Alpha Kim', note: '' }],
    },
    refetch: () => Promise.resolve(),
  }),
}))
vi.mock('../useRecordWorkspaceStore', () => ({
  useRecordWorkspaceStore: () => ({
    saveWorkspaceDraft: () => ({ ok: true, persistence: 'persistent', value: null }),
    workspaceDraft: { subjectKeys: ['alpha-2016'] },
  }),
}))
vi.mock('./RecordAthleteRecordTab', () => ({ RecordAthleteRecordTab: () => null }))
vi.mock('./RecordSourceList', () => ({ RecordSourceList: () => null }))

describe('RecordAthletePage device-local copy', () => {
  it('Given one current selection When the athlete page renders Then it separates the temporary selection from saved device-local collections', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/records/athletes/alpha-2016']}>
        <Routes>
          <Route path="/records/athletes/:athleteKey" element={<RecordAthletePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(markup).toContain('이 선수 임시 선택하기')
    expect(markup).toContain('임시 선택한 선수 보기 · 1명')
    expect(markup).toContain('이 기기에 저장한 기록 모음 목록')
  })
})
