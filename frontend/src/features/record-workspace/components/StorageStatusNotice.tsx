import { Link } from 'react-router-dom'
import type { StorageStatus } from '../storage'

type StorageStatusNoticeProps = {
  readonly status: StorageStatus
}

const REASON_COPY = {
  blocked: '브라우저가 이 기기의 저장을 허용하지 않았어요.',
  corrupt: '기기에 저장된 이전 기록 모음을 읽을 수 없어요.',
  oversized: '기기에 저장할 수 있는 크기를 넘었어요.',
} as const satisfies Readonly<Record<Exclude<StorageStatus['reason'], null>, string>>

const FALLBACK_COPY = '이 기기에서 기록 모음을 계속 저장할 수 없어요.'

export function StorageStatusNotice({ status }: StorageStatusNoticeProps) {
  if (status.mode === 'persistent') return null

  const reasonCopy = status.reason === null ? FALLBACK_COPY : REASON_COPY[status.reason]

  return (
    <section
      aria-live="polite"
      className="border border-warn bg-[#F7EDE0] px-4 py-4"
      data-workspace-storage-status="volatile"
      role="status"
    >
      <h2 className="text-body font-semibold text-ink">기기 저장이 일시적으로 안 돼요</h2>
      <p className="mt-1 text-body-sm leading-5 text-ink-2">{reasonCopy}</p>
      <p className="mt-1 text-body-sm leading-5 text-ink-2">
        지금 만든 기록 모음은 이 화면에서만 유지돼요. 새로 고치거나 브라우저를 닫으면 사라질 수 있어요.
      </p>
      <Link
        className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        to="/records"
      >
        기록 다시 찾기
      </Link>
    </section>
  )
}
