import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AthleteSearchCard } from '../../api/recordAnalytics'
import { CandidateStep } from './RecordsMineCandidateStep'

const ATHLETE: AthleteSearchCard = {
  athleteKey: 'aaaaaaaaaaaaaaaa',
  name: '김선수',
  team: '서울고',
  teams: ['서울고'],
  years: [2026],
  events: ['100m'],
  divisions: ['남자 고등부'],
  recordCount: 2,
  ambiguity: 'none',
  note: '',
}

describe('RecordsMineCandidateStep', () => {
  it('keeps a visible keyboard focus indicator on a selectable athlete', () => {
    // Given a ready candidate search with one selectable athlete.
    const markup = renderToStaticMarkup(
      <CandidateStep athletes={[ATHLETE]} state="ready" selectedKeys={[]} onResetSearch={() => undefined} onToggleDraft={() => undefined} onNext={() => undefined} />,
    )

    // When the candidate row is rendered.
    // Then keyboard users receive the same clear selection boundary as touch users.
    expect(markup).toMatch(/<button(?=[^>]*aria-label="김선수 기록 선택 안 됨")(?=[^>]*focus-visible:ring-2)[^>]*>/)
  })
})
