import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StorageStatusNotice } from './StorageStatusNotice'

describe('workspace storage status notice', () => {
  it('stays absent while the browser keeps the collection persistently', () => {
    // Given a browser storage boundary that is working normally.
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <StorageStatusNotice status={{ mode: 'persistent', reason: null }} />
      </MemoryRouter>,
    )

    // When the surrounding page renders.
    // Then no recovery warning competes with the normal record flow.
    expect(markup).toBe('')
  })

  it.each([
    ['blocked', '브라우저가 이 기기의 저장을 허용하지 않았어요.'],
    ['corrupt', '기기에 저장된 이전 기록 모음을 읽을 수 없어요.'],
    ['oversized', '기기에 저장할 수 있는 크기를 넘었어요.'],
  ] as const)('explains %s volatile storage without deleting or uploading records', (reason, explanation) => {
    // Given a record collection that has fallen back to temporary device memory.
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <StorageStatusNotice status={{ mode: 'volatile', reason }} />
      </MemoryRouter>,
    )

    // When the storage notice renders.
    // Then it names the reason, the loss boundary, and one safe recovery action.
    expect(markup).toContain('기기 저장이 일시적으로 안 돼요')
    expect(markup).toContain(explanation)
    expect(markup).toContain('새로 고치거나 브라우저를 닫으면 사라질 수 있어요.')
    expect(markup).toContain('기록 다시 찾기')
    expect(markup).toContain('href="/records"')
    expect(markup).not.toContain('자동으로 지우')
    expect(markup).not.toContain('서버로 올리')
  })
})
