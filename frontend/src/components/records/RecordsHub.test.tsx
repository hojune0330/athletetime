import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RecordsHub } from './RecordsHub'

describe('records hub collection language', () => {
  it('describes local collection without claiming a searched athlete is the visitor', () => {
    // Given a device that already has explicitly selected athlete candidates.
    const html = renderToStaticMarkup(
      <RecordsHub
        myEntriesCount={3}
        myEntryName="김하늘"
        onOpenMyRecords={() => undefined}
        onStartMine={() => undefined}
        onStartBrowse={() => undefined}
      />,
    )

    // When the records hub is shown.
    // Then collection stays a reversible device-local action, not an identity claim.
    expect(html).toContain('기록 찾아 모으기')
    expect(html).toContain('이 기기에서 모아 본 기록')
    expect(html).toContain('3명 선택')
    expect(html).not.toContain('내 기록 찾기')
    expect(html).not.toContain('이 기기의 내 기록')
  })
})
