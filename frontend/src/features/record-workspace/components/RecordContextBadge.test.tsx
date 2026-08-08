import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RecordContextBadge } from './RecordContextBadge'

describe('record context badges', () => {
  it('labels locally selected records without claiming ownership', () => {
    // Given a record candidate selected in this browser only.
    const markup = renderToStaticMarkup(<RecordContextBadge context="self" />)

    // When its context badge is rendered.
    // Then it describes the local selection and never implies verified ownership.
    expect(markup).toContain('이 기기에서 선택한 선수 후보')
    expect(markup).not.toContain('내 기록')
  })
})
