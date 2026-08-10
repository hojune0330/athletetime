import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RecordsBrowseGateway } from './RecordsBrowseGateway'

describe('records browse gateway', () => {
  it('keeps legacy browse links focused on aggregate team performance', () => {
    // Given an older URL that still opens the browse gateway.
    const html = renderToStaticMarkup(
      <RecordsBrowseGateway onBackToHub={() => undefined} onPick={() => undefined} />,
    )

    // When the gateway is rendered.
    // Then direct athlete browsing is not presented as a competing first-use path.
    expect(html).toContain('팀 성과 보기')
    expect(html).not.toContain('선수 찾기')
  })
})
