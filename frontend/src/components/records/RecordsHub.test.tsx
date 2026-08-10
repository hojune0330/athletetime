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
        onOpenTeamPerformance={() => undefined}
      />,
    )

    // When the records hub is shown.
    // Then collection stays a reversible device-local action, not an identity claim.
    expect(html).toContain('이름 또는 소속으로 기록 찾기')
    expect(html).toContain('이름과 소속을 확인해 공개 기록 후보를 직접 고르세요.')
    expect(html).toContain('팀 성과 보기')
    expect(html).toContain('이 기기에서 만든 기록 모음')
    expect(html).toContain('3명 담음')
    expect(html).not.toContain('기록 찾아 모으기')
    expect(html).not.toContain('이 기기의 내 기록')
  })

  it('keeps first use focused on finding a record by name or affiliation', () => {
    // Given a visitor without an existing device-local collection.
    const html = renderToStaticMarkup(
      <RecordsHub
        myEntriesCount={0}
        myEntryName=""
        onOpenMyRecords={() => undefined}
        onStartMine={() => undefined}
        onOpenTeamPerformance={() => undefined}
      />,
    )

    // When the records hub is shown for the first time.
    // Then it offers one direct record-finding action and a team-statistics path.
    expect(html).toContain('이름 또는 소속으로 기록 찾기')
    expect(html).toContain('팀 성과 보기')
    expect(html).not.toContain('다른 기록 찾아보기')
  })
})
