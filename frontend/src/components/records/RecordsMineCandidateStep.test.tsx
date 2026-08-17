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
        savedEntryCount={0}
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
        savedEntryCount={0}
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
        savedEntryCount={0}
        state="ready"
      />,
    )

    expect(markup).toContain('1명 선택됨 / 최대 6명')
  })

  it('labels every candidate fact so same-name visitors can compare context before selecting', () => {
    // Given a same-name candidate with observed team, period, event, and public-source scope.
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={selectionLimitCandidates.slice(0, 1)}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[]}
        savedEntryCount={0}
        state="ready"
      />,
    )

    // When the candidate is rendered.
    // Then each fact keeps its meaning instead of appearing as an unlabeled, merge-like summary.
    expect(markup).toContain('기록에 적힌 소속')
    expect(markup).toContain('확인된 기간')
    expect(markup).toContain('종목')
    expect(markup).toContain('출처 범위')
    expect(markup).toContain('공개 경기 결과')
  })

  it('keeps every canonical division and event visible in a same-name candidate', () => {
    // Given one candidate spanning several events and competition divisions.
    const candidate = {
      ...selectionLimitCandidates[0],
      events: ['100m', '200m', '400m', '800m'],
      divisions: ['남자 중등부', '남자 고등부'],
    };

    // When the candidate selection step renders.
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={[candidate]}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[]}
        savedEntryCount={0}
        state="ready"
      />,
    );

    // Then no event or canonical division is clipped or summarized away.
    expect(markup).toContain('경기 부문')
    expect(markup).toContain('남자 중등부 · 남자 고등부')
    expect(markup).toContain('100m · 200m · 400m · 800m')
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
        savedEntryCount={0}
        state="ready"
      />,
    )

    // When the candidate row is rendered.
    // Then keyboard users receive the same clear selection boundary as touch users.
    expect(markup).toMatch(/<button(?=[^>]*aria-label="선수 1 기록 선택 안 됨")(?=[^>]*focus-visible:ring-2)[^>]*>/)
  })

  it('only allows the remaining record collection space when prior candidates are already saved', () => {
    // Given: five candidates are already saved on this device.
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={selectionLimitCandidates.slice(0, 2)}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[selectionLimitCandidates[0].athleteKey]}
        savedEntryCount={5}
        state="ready"
      />,
    )

    // When: the user selects the one remaining candidate slot.
    // Then: the limit is explicit and further candidates cannot be silently dropped.
    expect(markup).toContain('기록 모음 5명 · 지금 1명 더 선택 가능')
    expect(markup).toContain('기록 모음은 총 6명까지예요.')
    expect(markup).toContain('disabled=""')
  })
})
