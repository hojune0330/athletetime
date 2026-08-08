type WorkspaceDraftTrayProps = {
  readonly notice: string
  readonly onCancel: () => void
  readonly onContinue: () => void
  readonly selectedCount: number
}

export function WorkspaceDraftTray({
  notice,
  onCancel,
  onContinue,
  selectedCount,
}: WorkspaceDraftTrayProps) {
  return (
    <section
      aria-label="선택한 기록 후보"
      className="fixed inset-x-0 bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom))] z-40 border-y border-line bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:bottom-4 md:left-1/2 md:right-auto md:w-[min(44rem,calc(100vw-2rem))] md:-translate-x-1/2 md:border"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] font-semibold text-ink [font-variant-numeric:tabular-nums]">
            기록 후보 {selectedCount}개 선택
          </p>
          <p
            aria-live="polite"
            className="mt-0.5 min-h-4 truncate text-caption font-medium text-warn"
          >
            {notice}
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 shrink-0 border border-line px-4 text-body-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="button"
          className="min-h-11 shrink-0 border border-brand bg-brand px-4 text-body-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          disabled={selectedCount === 0}
          onClick={onContinue}
        >
          선택 완료
        </button>
      </div>
    </section>
  )
}
