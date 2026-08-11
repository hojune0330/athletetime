import { resolveProviderLabel } from '@/config/dataPolicy'
import type { PublicRecord } from '@/api/recordAnalytics'

type RecordSourceListProps = {
  readonly records: readonly PublicRecord[]
}

type SourceItem = PublicRecord['source'] & {
  readonly recordCount: number
}

function safeSourceUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : null
}

function collectSources(records: readonly PublicRecord[]): readonly SourceItem[] {
  const sources = new Map<string, SourceItem>()
  for (const record of records) {
    const source = record.source
    const key = sourceKey(source)
    const current = sources.get(key)
    sources.set(key, {
      ...source,
      recordCount: (current?.recordCount ?? 0) + 1,
    })
  }
  return [...sources.values()].sort((left, right) => (
    right.capturedAt.localeCompare(left.capturedAt)
    || left.provider.localeCompare(right.provider, 'ko')
    || left.sourceUrl.localeCompare(right.sourceUrl)
    || left.sourceType.localeCompare(right.sourceType)
  ))
}

function sourceKey(source: PublicRecord['source']) {
  return [source.provider, source.sourceType, source.sourceUrl, source.capturedAt].join('\u0000')
}

export function RecordSourceList({ records }: RecordSourceListProps) {
  const sources = collectSources(records)

  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-4 py-4">
        <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">SOURCES</p>
        <h2 className="mt-1 text-body font-semibold text-ink">현재 표시 중 기록의 출처</h2>
        <p className="mt-1 text-body-sm leading-5 text-ink-3">
          불러온 기록 {records.length}개에서 확인한 출처를 보여드려요.
        </p>
      </header>

      {sources.length === 0 ? (
        <p className="px-4 py-5 text-body-sm text-ink-3">확인된 출처 정보가 없어요.</p>
      ) : (
        <ol>
          {sources.map((source) => {
            const url = safeSourceUrl(source.sourceUrl)
            return (
              <li key={sourceKey(source)} className="border-b border-hair px-4 py-3 last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-body-sm font-semibold text-ink">
                      {resolveProviderLabel(source.provider)}
                    </p>
                    <p className="mt-1 break-words font-mono text-[12px] leading-5 text-ink-3">
                      기록 {source.recordCount}개 · 수집 {source.capturedAt.slice(0, 10) || '확인 안 됨'}
                    </p>
                  </div>
                  {url && (
                    <a
                      className="inline-flex min-h-11 shrink-0 items-center border border-line px-3 text-body-sm font-semibold text-brand hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      원출처
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
