import { Link } from 'react-router-dom'
import { MegaphoneIcon } from '@heroicons/react/24/outline'
import { usePosts } from '../../features/board/hooks'
import { formatRelativeTime } from '../../lib/utils'

function AnnouncementBar() {
  const { data, isLoading, isError } = usePosts({ boardSlug: 'notice', page: 1, pageSize: 1, sort: 'latest' })

  const latestNotice = !isError ? data?.data?.[0] : undefined

  const description = latestNotice
    ? `${latestNotice.boardName} · ${formatRelativeTime(latestNotice.createdAt)} 업데이트`
    : 'AthleteTime 익명 게시판이 정식 오픈되었습니다. 커뮤니티 이용 수칙을 확인하고 자유롭게 참여하세요.'

  return (
    <div className="border-b border-brand-100/70 bg-brand-50/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 text-xs text-brand-700 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
        <div className="inline-flex min-h-[1.5rem] items-center gap-2 font-semibold">
          <MegaphoneIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] uppercase tracking-wide text-brand-600 shadow-subtle">
            공지
          </span>
          {isLoading ? (
            <span className="h-4 w-40 animate-pulse rounded bg-brand-100/80" aria-hidden="true" />
          ) : latestNotice ? (
            <Link to={`/post/${latestNotice.id}`} className="text-sm text-brand-800 underline-offset-4 hover:underline">
              {latestNotice.title}
            </Link>
          ) : (
            <span className="text-sm text-brand-800">커뮤니티 운영 안내</span>
          )}
        </div>
        <p className="text-ink-600 sm:text-sm">{description}</p>
      </div>
    </div>
  )
}

export default AnnouncementBar
