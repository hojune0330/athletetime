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
    expect(html).toContain('이 기기에서 만든 기록 모음')
    expect(html).toContain('3명 담음')
    expect(html).toContain('원하는 선수 기록을 이 기기에 모아요.')
    expect(html).not.toContain('내 기록 찾기')
    expect(html).not.toContain('이 기기의 내 기록')
  })
})
