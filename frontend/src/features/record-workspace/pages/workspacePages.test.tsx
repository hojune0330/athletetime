import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PublicRecord } from '@/api/recordAnalytics'
import type { RecordWorkspacePreview } from '@/api/recordWorkspace'
import { WorkspaceReviewContent } from '../components/WorkspaceReviewContent'
import { WorkspaceSubjectList } from '../components/WorkspaceSubjectList'
import { WorkspaceRecordTab } from './WorkspaceRecordTab'

const KEY_A = '1111111111111111'
const KEY_B = '2222222222222222'

function record(): PublicRecord {
  return {
    id: 'record-1',
    athleteKey: KEY_A,
    name: '김선수',
    team: '서울고',
    season: 2026,
    competitionName: '테스트 대회',
    date: '2026-04-10',
    venue: '예천스타디움',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    gender: 'men',
    divisionLevel: 'high',
    divisionDetail: null,
    rawDivision: '남자 고등부',
    phase: '결승',
    record: '11.20',
    recordValue: 11.2,
    direction: 'lower',
    rank: 1,
    wind: '+0.4',
    windLegal: true,
    isComparable: true,
    note: '',
    source: {
      provider: 'KAAF',
      sourceType: 'result-file',
      sourceId: 'source-1',
      sourceUrl: 'https://example.com/result',
      capturedAt: '2026-07-31T01:00:00.000Z',
    },
  }
}

function preview(warning: RecordWorkspacePreview['identity']['warning']): RecordWorkspacePreview {
  const names = warning === 'different_names' ? ['김선수', '이선수'] : ['김선수']
  const records = [record()]
  return {
    subjects: [
      {
        athleteKey: KEY_A,
        name: '김선수',
        team: '서울고',
        teams: ['서울고'],
        years: [2026],
        events: ['100m'],
        divisions: ['남자 고등부'],
        recordCount: 1,
        ambiguity: 'name_team',
        note: '',
      },
      {
        athleteKey: KEY_B,
        name: warning === 'different_names' ? '이선수' : '김선수',
        team: '부산고',
        teams: ['부산고'],
        years: [2025],
        events: ['100m'],
        divisions: ['남자 고등부'],
        recordCount: 1,
        ambiguity: 'name_team',
        note: '',
      },
    ],
    unavailableSubjectKeys: [],
    identity: { displayName: names.join(' · '), distinctNames: names, warning },
    affiliations: [
      { label: '서울고', firstObservedSeason: 2026, lastObservedSeason: 2026, recordCount: 1, status: 'needs_review' },
      { label: '부산고', firstObservedSeason: 2025, lastObservedSeason: 2025, recordCount: 1, status: 'needs_review' },
    ],
    coverage: {
      totalMatched: 2,
      returned: 1,
      hasMore: false,
      nextCursor: null,
      observedSeasons: [2026, 2025],
      competitionCount: 1,
      sourceCount: 1,
      lastCapturedAt: '2026-07-31T01:00:00.000Z',
      qualityState: 'visible_index',
    },
    events: [{ eventKey: '100m', eventLabel: '100m', recordCount: 1, best: records[0] }],
    records,
  }
}

const emptyAction = () => undefined

describe('record workspace pages', () => {
  it('keeps the unverified identity warning while allowing same-name review', () => {
    // Given two public profile fragments with the same name.
    const markup = renderToStaticMarkup(
      <WorkspaceReviewContent
        busy={false}
        notice=""
        onClearSelection={emptyAction}
        onContinueSelection={emptyAction}
        onConfirm={emptyAction}
        onRemoveSubject={emptyAction}
        onTitleChange={emptyAction}
        preview={preview('same_name')}
        subjectKeys={[KEY_A, KEY_B]}
        title="기록 모음"
      />,
    )

    // Then one view can be created without claiming the profiles are one person.
    expect(markup).toContain('같은 사람으로 확인된 것은 아닙니다')
    expect(markup).toContain('기록 모음 만들기')
    expect(markup).not.toContain('현 소속')
  })

  it('keeps a mixed-name selection recoverable with explicit continue and reset actions', () => {
    // Given two public profile fragments with different names.
    const markup = renderToStaticMarkup(
      <WorkspaceReviewContent
        busy={false}
        notice=""
        onClearSelection={emptyAction}
        onContinueSelection={emptyAction}
        onConfirm={emptyAction}
        onRemoveSubject={emptyAction}
        onTitleChange={emptyAction}
        preview={preview('different_names')}
        subjectKeys={[KEY_A, KEY_B]}
        title="기록 모음"
      />,
    )

    // Then save is absent, the selected profiles stay visible, and reset is explicit.
    expect(markup).toContain('한 기록 모음으로 저장할 수 없어요')
    expect(markup).not.toContain('한 사람의 기록 모음')
    expect(markup).toContain('위 선택 목록에서 다른 이름의 선수를 빼거나')
    expect(markup).toContain('선택 계속 고치기')
    expect(markup).toContain('선택 모두 비우고 새로 찾기')
    expect(markup).not.toContain('선수 비교로 옮기기')
    expect(markup).not.toContain('기록 모음 만들기')
  })

  it('does not reveal a stale label or raw key for an unavailable subject', () => {
    // Given one subject key that the current public API cannot resolve.
    const markup = renderToStaticMarkup(
      <WorkspaceSubjectList
        onRemove={emptyAction}
        subjectKeys={[KEY_A, KEY_B]}
        subjects={[]}
        unavailableSubjectKeys={[KEY_B]}
      />,
    )

    // Then only a generic recovery message is rendered.
    expect(markup).toContain('선택한 선수를 불러오지 못했어요')
    expect(markup).not.toContain(KEY_B)
    expect(markup).not.toContain('현 소속')
  })

  it('separates local record hiding from comparison and keeps all-hidden recovery', () => {
    // Given a selected event in local record-edit mode.
    const athletePreview = preview('none')
    const shared = {
      isLoadingMore: false,
      onCancelSelection: emptyAction,
      onCloseRecord: emptyAction,
      onHideSelected: emptyAction,
      onLoadMore: emptyAction,
      onOpenRecord: emptyAction,
      onRestoreAll: emptyAction,
      onSelectEvent: emptyAction,
      onStartSelection: emptyAction,
      onToggleRecord: emptyAction,
      preview: athletePreview,
      selectedEventKey: '100m',
      selectedRecordId: null,
      selectedRecordIds: ['record-1'],
      selectionMode: true,
    }

    // When edit and all-hidden states render.
    const editMarkup = renderToStaticMarkup(<WorkspaceRecordTab {...shared} records={athletePreview.records} />)
    const emptyMarkup = renderToStaticMarkup(<WorkspaceRecordTab {...shared} records={[]} />)

    // Then editing offers hide and cancel only, and the empty state stays recoverable.
    expect(editMarkup).toContain('이 모음에서 숨기기')
    expect(editMarkup).toContain('취소')
    expect(editMarkup).not.toContain('비교')
    expect(emptyMarkup).toContain('다시 모두 보기')
  })

  it('keeps each selected profile visible beside a workspace record', () => {
    // Given a workspace that contains a public profile record.
    const athletePreview = preview('none')

    // When the selected event is rendered inside the workspace.
    const markup = renderToStaticMarkup(
      <WorkspaceRecordTab
        isLoadingMore={false}
        onCancelSelection={emptyAction}
        onCloseRecord={emptyAction}
        onHideSelected={emptyAction}
        onLoadMore={emptyAction}
        onOpenRecord={emptyAction}
        onRestoreAll={emptyAction}
        onSelectEvent={emptyAction}
        onStartSelection={emptyAction}
        onToggleRecord={emptyAction}
        preview={athletePreview}
        records={athletePreview.records}
        selectedEventKey="100m"
        selectedRecordId={null}
        selectedRecordIds={[]}
        selectionMode={false}
      />,
    )

    // Then the row identifies the public profile and the affiliation shown for that result.
    expect(markup).toContain('김선수 · 서울고')
    expect(markup).toContain('같은 이름의 선수 후보를 한 사람으로 합치지 않아요.')
  })

  it('requires an event before record-edit mode can start', () => {
    // Given a workspace at its event index.
    const athletePreview = preview('none')

    // When the index renders without a selected event.
    const markup = renderToStaticMarkup(
      <WorkspaceRecordTab
        isLoadingMore={false}
        onCancelSelection={emptyAction}
        onCloseRecord={emptyAction}
        onHideSelected={emptyAction}
        onLoadMore={emptyAction}
        onOpenRecord={emptyAction}
        onRestoreAll={emptyAction}
        onSelectEvent={emptyAction}
        onStartSelection={emptyAction}
        onToggleRecord={emptyAction}
        preview={athletePreview}
        records={athletePreview.records}
        selectedEventKey={null}
        selectedRecordId={null}
        selectedRecordIds={[]}
        selectionMode={false}
      />,
    )

    // Then the user sees the event choice before any edit action.
    expect(markup).toContain('종목을 고르면')
    expect(markup).not.toContain('기록 고르기')
  })
})
