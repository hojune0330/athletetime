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
    for (const label of ['전체', '실업·기관 소속', '대학 소속', '고교 소속', '중학교 소속', '초등학교 소속', '소속 유형 미확인']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('수집된 기록의 소속 표기를 바탕으로 추정하며 경기 부문과 다를 수 있어요.')
    expect(html.match(/aria-pressed="true"/gu)).toHaveLength(1)
  })
})
