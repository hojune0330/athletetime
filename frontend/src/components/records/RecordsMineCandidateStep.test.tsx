import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CandidateStep } from './RecordsMineCandidateStep'

describe('record collection empty search state', () => {
  it('offers one clear return action instead of a disabled next action', () => {
    const markup = renderToStaticMarkup(
      <CandidateStep
        athletes={[]}
        onNext={() => undefined}
        onResetSearch={() => undefined}
        onToggleDraft={() => undefined}
        selectedKeys={[]}
        state="ready"
      />,
    )

    expect(markup).toContain('아직 찾지 못했어요.')
    expect(markup).toContain('검색어 다시 입력')
    expect(markup).not.toContain('0개 선택됨')
  })
})
