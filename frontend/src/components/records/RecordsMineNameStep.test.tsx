import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NameStep } from './RecordsMineNameStep'

describe('record collection name entry', () => {
  it('waits for an explicit tap before opening a mobile keyboard', () => {
    const markup = renderToStaticMarkup(
      <NameStep
        query=""
        onQueryChange={() => undefined}
        onSubmitName={() => undefined}
      />,
    )

    expect(markup).not.toContain('autofocus')
    expect(markup).toContain('data-records-sticky-cta="mine-name"')
  })
})
