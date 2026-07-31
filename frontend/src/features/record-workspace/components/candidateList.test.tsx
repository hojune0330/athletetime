import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AthleteSearchCard } from '@/api/recordAnalytics'
import { RecordCandidateCard } from './RecordCandidateCard'
import {
  RecordCandidateList,
  nextWorkspaceDraftSelection,
} from './RecordCandidateList'
import { WorkspaceDraftTray } from './WorkspaceDraftTray'

function candidate(index: number): AthleteSearchCard {
  return {
    athleteKey: `${String(index).repeat(16)}`,
    name: `김선수${index}`,
    team: index % 2 === 0 ? '서울중' : '서울고',
    teams: ['서울중', '서울고'],
    years: [2026, 2024, 2025],
    events: ['100m', '200m'],
    divisions: ['남자 중등부'],
    recordCount: index + 2,
    ambiguity: index === 1 ? 'name' : 'none',
    note: '',
  }
}

const CANDIDATES = Array.from({ length: 7 }, (_, index) => candidate(index + 1))

describe('record candidate browsing', () => {
  it('keeps browse cards to one action and four visible facts', () => {
    // Given a candidate with multiple teams, events, and divisions.
    const athlete = candidate(1)

    // When its browse card is rendered.
    const markup = renderToStaticMarkup(
      <RecordCandidateCard
        athlete={athlete}
        mode="browse"
        selected={false}
        onActivate={() => undefined}
      />,
    )

    // Then one whole-card action shows only name, affiliation, seasons, and record count.
    expect(markup.match(/<button/g)).toHaveLength(1)
    expect(markup).toContain(athlete.name)
    expect(markup).toContain(athlete.team)
    expect(markup).toContain('2024-2026 시즌')
    expect(markup).toContain(`기록 ${athlete.recordCount}건`)
    expect(markup).not.toContain('100m')
    expect(markup).not.toContain('남자 중등부')
    expect(markup).not.toContain('비교')
    expect(markup).not.toContain('내 기록')
  })

  it('enters selection only through the explicit collect action', () => {
    // Given the same candidates in browse and collect modes.
    const shared = {
      athletes: CANDIDATES,
      draftSubjectKeys: [] as readonly string[],
      onDraftChange: () => undefined,
      onEnterSelectionMode: () => undefined,
      onExitSelectionMode: () => undefined,
      onOpenAthlete: () => undefined,
      onReviewDraft: () => undefined,
    }

    // When both list modes are rendered.
    const browse = renderToStaticMarkup(
      <RecordCandidateList {...shared} selectionMode={false} />,
    )
    const collect = renderToStaticMarkup(
      <RecordCandidateList {...shared} selectionMode />,
    )

    // Then browse exposes entry but no tray, while collect exposes selectable cards and one tray.
    expect(browse).toContain('기록 묶어 보기')
    expect(browse).not.toContain('선택한 기록 묶음')
    expect(collect).not.toContain('기록 묶어 보기')
    expect(collect.match(/aria-pressed="false"/g)).toHaveLength(7)
    expect(collect.match(/aria-label="선택한 기록 묶음"/g)).toHaveLength(1)
  })

  it('rejects a seventh subject without changing the six-key draft', () => {
    // Given a full six-subject workspace draft.
    const sixKeys = CANDIDATES.slice(0, 6).map((athlete) => athlete.athleteKey)

    // When a seventh candidate is selected and an existing candidate is toggled.
    const rejected = nextWorkspaceDraftSelection(sixKeys, CANDIDATES[6]?.athleteKey ?? '')
    const removed = nextWorkspaceDraftSelection(sixKeys, sixKeys[0] ?? '')

    // Then the seventh selection is explicit and removal remains immediately available.
    expect(rejected).toEqual({ kind: 'limit', subjectKeys: sixKeys })
    expect(removed).toEqual({ kind: 'updated', subjectKeys: sixKeys.slice(1) })
  })

  it('keeps the draft tray above mobile navigation and announces limit feedback', () => {
    // Given a full draft and its limit notice.
    // When the fixed tray renders.
    const markup = renderToStaticMarkup(
      <WorkspaceDraftTray
        notice="한 번에 6개까지 선택할 수 있어요."
        selectedCount={6}
        onCancel={() => undefined}
        onContinue={() => undefined}
      />,
    )

    // Then the count, live notice, and safe-area offset remain visible.
    expect(markup).toContain('6개 선택')
    expect(markup).toContain('한 번에 6개까지')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('safe-area-inset-bottom')
    expect(markup).toContain('var(--mobile-tabbar-height)')
  })
})
