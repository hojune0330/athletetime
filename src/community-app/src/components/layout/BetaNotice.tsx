import { MegaphoneIcon } from '@heroicons/react/24/outline'

function BetaNotice() {
  return (
    <div className="border-b border-brand-100/60 bg-brand-50/70">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-4 py-2 text-xs text-brand-700 sm:px-6 sm:text-sm">
        <MegaphoneIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        <span className="font-semibold text-beta">베타 안내</span>
        <p>
          로그인 없이 모든 기능을 체험할 수 있는 베타 버전입니다. 작성 시 비밀번호를 꼭 저장해 주세요. 회원제와 고급 기능은 곧
          오픈됩니다.
        </p>
      </div>
    </div>
  )
}

export default BetaNotice
