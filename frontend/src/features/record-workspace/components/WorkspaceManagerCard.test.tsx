import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RecordWorkspaceSchema } from '../model'
import { WorkspaceManagerCard } from './WorkspaceManagerCard'

vi.mock('../useRecordWorkspacePreview', () => ({
  useRecordWorkspacePreview: () => ({ isError: false, preview: null }),
}))

describe('workspace manager card', () => {
  it('labels the saved item count as athlete candidates rather than collections', () => {
    // Given a saved collection containing three separately selected athlete candidates.
    const workspace = RecordWorkspaceSchema.parse({
      id: '9e410d5c-9a3e-4d75-ae99-3f8bae840b04',
      title: '시즌 확인',
      subjectKeys: ['at_runner_01', 'at_runner_02', 'at_runner_03'],
      excludedRecordIds: [],
      filter: {},
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    })

    // When the saved collection card is rendered.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkspaceManagerCard
          confirmingDelete={false}
          onCancelDelete={() => undefined}
          onDelete={() => undefined}
          onRename={() => true}
          onRequestDelete={() => undefined}
          workspace={workspace}
        />
      </MemoryRouter>,
    )

    // Then the count names the selected candidates, not a second collection.
    expect(html).toContain('선수 후보 3명')
    expect(html).not.toContain('선택 3묶음')
  })
})
