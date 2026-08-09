import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AthleteSearchCard } from '../../api/recordAnalytics'
import { CandidateStep } from './RecordsMineCandidateStep'

const selectionLimitCandidates: readonly AthleteSearchCard[] = Array.from({ length: 7 }, (_, index) => ({
  athleteKey: `candidate-${index + 1}`,
  name: `선수 ${index + 1}`,
  team: '테스트고',
  teams: ['테스트고'],
  years: [2026],
  events: ['100m'],
  divisions: ['남자 고등부'],
  recordCount: 1,
  ambiguity: 'name_team',
  note: '',
}));

describe('record collection empty search state', () => {
  it('offers one clear return action instead of a disabled next action', () => {
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={[]}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[]}
        state="ready"
      />,
    )

    expect(markup).toContain('아직 찾지 못했어요.')
    expect(markup).toContain('검색어 다시 입력')
    expect(markup).not.toContain('0개 선택됨')
  })

  it('explains the six-athlete limit and leaves only deselection available at capacity', () => {
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={selectionLimitCandidates}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={selectionLimitCandidates.slice(0, 6).map((athlete) => athlete.athleteKey)}
        state="ready"
      />,
    )

    expect(markup).toContain('한 번에 6명까지');
    expect(markup).toContain('선택을 빼고 다시 골라주세요.');
    expect(markup).toContain('disabled=""');
  })

  it('shows selection progress before the user reaches the next action', () => {
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={selectionLimitCandidates.slice(0, 2)}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[selectionLimitCandidates[0].athleteKey]}
        state="ready"
      />,
    )

    expect(markup).toContain('1명 선택됨 / 최대 6명')
  })

  it('keeps a visible keyboard focus indicator on a selectable athlete', () => {
    // Given a ready candidate search with one selectable athlete.
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={selectionLimitCandidates.slice(0, 1)}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[]}
        state="ready"
      />,
    )

    // When the candidate row is rendered.
    // Then keyboard users receive the same clear selection boundary as touch users.
    expect(markup).toMatch(/<button(?=[^>]*aria-label="선수 1 기록 선택 안 됨")(?=[^>]*focus-visible:ring-2)[^>]*>/)
  })
})
