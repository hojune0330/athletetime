import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamCategoryFilter } from './TeamCategoryFilter'

describe('team category filter', () => {
  it('keeps all six practical team types available with one pressed state', () => {
    // Given the corporate category is selected.
    // When the filter is rendered.
    const html = renderToStaticMarkup(
      <TeamCategoryFilter selected="corporate" onSelect={() => undefined} />,
    )

    // Then every supported type is readable and only the active button is pressed.
    for (const label of ['실업팀', '대학팀', '고등부', '중등부', '초등부', '분류 확인 중']) {
      expect(html).toContain(label)
    }
    expect(html.match(/aria-pressed="true"/gu)).toHaveLength(1)
  })
})
