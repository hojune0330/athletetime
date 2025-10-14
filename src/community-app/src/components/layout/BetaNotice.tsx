import { MegaphoneIcon } from '@heroicons/react/24/outline'

function BetaNotice() {
  return (
    <div id="beta-notice" className="border-b border-brand-100/80 bg-brand-50/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 text-xs text-brand-700 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 font-semibold">
          <MegaphoneIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] uppercase tracking-wide text-brand-600 shadow-subtle">
            공지
          </span>
          <span className="text-sm">베타 운영 안내</span>
        </div>
        <p className="text-ink-600 sm:text-sm">
          익명 게시판은 베타 운영 중입니다. 비밀번호를 분실하면 게시글 수정/삭제가 어렵습니다. 신고 10회 이상 누적 시 자동으로 블라인드 처리가 됩니다.
        </p>
      </div>
    </div>
  )
}

export default BetaNotice
