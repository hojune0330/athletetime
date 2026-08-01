import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamCategoryFilter } from './TeamCategoryFilter'

describe('team category filter', () => {
  it('keeps an overall view and all six practical team types with one pressed state', () => {
    // Given no category has been selected yet.
    // When the filter is rendered.
    const html = renderToStaticMarkup(
      <TeamCategoryFilter selected={null} onSelect={() => undefined} />,
    )

    // Then the neutral view and every supported type are readable with only overall pressed.
    for (const label of ['전체', '실업팀', '대학팀', '고등부', '중등부', '초등부', '분류 확인 중']) {
      expect(html).toContain(label)
    }
    expect(html.match(/aria-pressed="true"/gu)).toHaveLength(1)
  })
})
