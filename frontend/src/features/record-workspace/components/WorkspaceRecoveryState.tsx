import type { ComponentProps } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type WorkspaceRecoveryKind =
  | 'corrupt'
  | 'loading'
  | 'network'
  | 'partial'
  | 'rate_limited'
  | 'volatile'

type WorkspaceRecoveryStateProps = {
  readonly className?: string
  readonly kind: WorkspaceRecoveryKind
  readonly onBack?: () => void
  readonly onRetry?: () => void
}

type RecoveryCopy = {
  readonly description: string
  readonly title: string
}

const COPY: Readonly<Record<WorkspaceRecoveryKind, RecoveryCopy>> = {
  corrupt: {
    title: '저장한 기록 모음을 열 수 없어요',
    description: '손상된 저장값은 사용하지 않았어요. 검색에서 다시 선택해 주세요.',
  },
  loading: {
    title: '기록을 모으고 있어요',
    description: '선택한 기록을 바꾸지 않고 확인 중이에요.',
  },
  network: {
    title: '기록을 불러오지 못했어요',
    description: '모아 둔 선택은 그대로예요. 연결을 확인하고 다시 불러와 주세요.',
  },
  partial: {
    title: '일부 기록만 확인했어요',
    description: '지금 확인된 범위부터 볼 수 있어요. 다시 불러오면 나머지를 확인해요.',
  },
  rate_limited: {
    title: '요청이 잠시 많아요',
    description: '모아 둔 선택은 그대로예요. 잠시 뒤 다시 불러와 주세요.',
  },
  volatile: {
    title: '이 기기에 저장할 수 없어요',
    description: '지금 화면에서는 계속 볼 수 있지만, 닫으면 기록 모음이 사라질 수 있어요.',
  },
}

type RecoveryButtonProps = ComponentProps<typeof Button>

function RecoveryButton({
  children,
  className,
  ...props
}: RecoveryButtonProps) {
  return (
    <Button
      className={cn(
        'min-h-11 active:translate-y-px motion-reduce:transform-none motion-reduce:duration-0',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

export function WorkspaceRecoveryState({
  className,
  kind,
  onBack,
  onRetry,
}: WorkspaceRecoveryStateProps) {
  const copy = COPY[kind]
  const isLoading = kind === 'loading'

  return (
    <section
      aria-busy={isLoading || undefined}
      aria-live="polite"
      className={cn('border border-line bg-surface px-4 py-5', className)}
      role="status"
    >
      <div className="flex items-start gap-3">
        {isLoading && (
          <LoaderCircle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand motion-reduce:animate-none"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-body font-semibold leading-6 text-ink">{copy.title}</h2>
          <p className="mt-1 text-body-sm leading-5 text-ink-2">{copy.description}</p>
        </div>
      </div>

      {!isLoading && (onBack || onRetry) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {onRetry && (
            <RecoveryButton onClick={onRetry}>다시 불러오기</RecoveryButton>
          )}
          {onBack && (
            <RecoveryButton variant="outline" onClick={onBack}>검색으로 돌아가기</RecoveryButton>
          )}
        </div>
      )}
    </section>
  )
}
