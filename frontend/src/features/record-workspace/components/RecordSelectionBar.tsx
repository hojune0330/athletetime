import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RecordSelectionBarProps = {
  readonly busy?: boolean
  readonly className?: string
  readonly confirmLabel?: string
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly selectedCount: number
}

export function RecordSelectionBar({
  busy = false,
  className,
  confirmLabel = '선택 적용',
  onCancel,
  onConfirm,
  selectedCount,
}: RecordSelectionBarProps) {
  return (
    <section
      aria-label="선택한 기록 작업"
      className={cn(
        'fixed inset-x-3 z-40 border border-line bg-surface px-3 py-3 shadow-[0_8px_30px_rgba(14,20,18,0.16)]',
        'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:w-[26rem]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[13px] font-semibold text-ink [font-variant-numeric:tabular-nums]" role="status">
          기록 {selectedCount}개 선택
        </p>
        <div className="flex gap-2">
          <Button
            className="min-h-11"
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            className="min-h-11"
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={onConfirm}
          >
            {busy ? '처리 중' : confirmLabel}
          </Button>
        </div>
      </div>
    </section>
  )
}
