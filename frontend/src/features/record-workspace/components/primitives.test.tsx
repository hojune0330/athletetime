import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AffiliationHistory } from './AffiliationHistory'
import { RecordCoverageReceipt } from './RecordCoverageReceipt'
import { RecordIdentityHeader } from './RecordIdentityHeader'
import { WorkspaceRecoveryState } from './WorkspaceRecoveryState'

const coverage = {
  totalMatched: 124,
  returned: 50,
  hasMore: true,
  nextCursor: 'opaque',
  observedSeasons: [2024, 2022, 2021, 2019],
  competitionCount: 18,
  sourceCount: 7,
  lastCapturedAt: '2026-07-29T03:00:00.000Z',
  qualityState: 'visible_index' as const,
}

describe('record workspace trust primitives', () => {
  it('uses bounded identity and coverage language without official-history claims', () => {
    // Given a same-name workspace with partially displayed public records.
    const markup = renderToStaticMarkup(
      <>
        <RecordIdentityHeader
          context="workspace"
          displayName="김민준"
          subjectCount={3}
          recordCount={124}
          visibleRecordCount={50}
          affiliationCount={3}
          identityWarning="same_name"
        />
        <RecordCoverageReceipt context="workspace" subjectCount={3} coverage={coverage} />
      </>,
    )

    // When the shared identity and coverage primitives render.
    // Then they state the observed scope and never overclaim official completeness.
    expect(markup).toContain('선택한 기록 후보 3개에서 확인된 124개')
    expect(markup).toContain('확인된 124개 중 50개를 먼저 보여드려요')
    expect(markup).toContain('마지막 수집 2026.07.29')
    expect(markup).toContain('같은 사람으로 확인된 것은 아닙니다')
    expect(markup).not.toContain('현 소속')
    expect(markup).not.toContain('전체 기록')
    expect(markup).not.toContain('공식 이력')
  })

  it('labels affiliation chronology differently for one profile and a workspace', () => {
    // Given the same observed affiliation history in two different record contexts.
    const items = [
      {
        label: '서울고',
        firstObservedSeason: 2023,
        lastObservedSeason: 2024,
        recordCount: 12,
        status: 'latest_observed' as const,
      },
      {
        label: '서울중',
        firstObservedSeason: 2021,
        lastObservedSeason: 2022,
        recordCount: 8,
        status: 'past_observed' as const,
      },
    ]

    // When single-profile and multi-key histories render.
    const single = renderToStaticMarkup(<AffiliationHistory context="athlete" items={items} />)
    const workspace = renderToStaticMarkup(<AffiliationHistory context="workspace" items={items} />)

    // Then chronology is explicit without treating a multi-key workspace as one career.
    expect(single).toContain('최근 확인 소속')
    expect(single).toContain('이전 확인 소속')
    expect(workspace).toContain('선택한 기록 후보의 소속')
    expect(workspace).not.toContain('최근 확인 소속')
    expect(workspace).not.toContain('현 소속')
  })

  it('provides textual recovery status and 44px actions for every interactive state', () => {
    // Given a recoverable network failure with two available actions.
    const markup = renderToStaticMarkup(
      <WorkspaceRecoveryState
        kind="network"
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    )

    // When the shared recovery state renders.
    // Then assistive status, readable copy, and minimum touch targets are present.
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('모아 둔 선택은 그대로예요')
    expect(markup).toContain('다시 불러오기')
    expect(markup).toContain('검색으로 돌아가기')
    expect(markup.match(/min-h-11/g)).toHaveLength(2)
  })
})
