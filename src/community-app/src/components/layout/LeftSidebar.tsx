import { useMemo } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useBoardNavigation, usePosts } from '../../features/board/hooks'
import { formatDate } from '../../lib/utils'

function LeftSidebar() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const boardSlug = segments[0] === 'boards' ? segments[1] : undefined
  const { boards } = useBoardNavigation(boardSlug)
  const {
    data: noticeResponse,
    isLoading: isLoadingNotices,
    isError: isNoticesError,
  } = usePosts({ boardSlug: 'notice', page: 1, pageSize: 5, sort: 'latest' })

  const serviceNotices = noticeResponse?.data ?? []

  const highlightedBoards = useMemo(
    () =>
      boards
        .filter((board) => board.isActive)
        .sort((a, b) => a.order - b.order)
        .slice(0, 12),
    [boards],
  )

  return (
    <div className="sticky top-[140px] space-y-5">
      <section className="card overflow-hidden">
        <header className="border-b border-slate-100 bg-ink-50/80 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-700">주요 게시판</h2>
        </header>
        <nav className="max-h-[420px] space-y-1 overflow-y-auto px-4 py-3" aria-label="주요 게시판">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-500/90 text-white shadow-subtle' : 'text-ink-600 hover:bg-slate-100'
              }`
            }
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">🏠</span>
              전체 게시글
            </span>
          </NavLink>
          {highlightedBoards.map((board) => (
            <NavLink
              key={board.id}
              to={`/boards/${board.slug}`}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-brand-500/90 text-white shadow-subtle' : 'text-ink-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{board.icon ?? '🏃'}</span>
                <span className="truncate">{board.name}</span>
              </span>
              <span className="text-xs text-ink-400">{board.todayPostCount ?? 0}건</span>
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="card overflow-hidden">
        <header className="border-b border-slate-100 bg-white px-5 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-700">서비스 공지</h2>
            <Link
              to="/boards/notice"
              className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
            >
              전체 보기
            </Link>
          </div>
        </header>
        <div className="px-5 py-4 text-sm text-ink-600">
          {isLoadingNotices ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`notice-skeleton-${index}`} className="space-y-2">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : isNoticesError ? (
            <p className="text-xs text-rose-500">공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          ) : serviceNotices.length > 0 ? (
            <ul className="space-y-3">
              {serviceNotices.map((notice) => (
                <li key={notice.id} className="space-y-1">
                  <Link to={`/post/${notice.id}`} className="block font-semibold text-ink-800 hover:text-brand-600">
                    {notice.title}
                  </Link>
                  <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">{notice.excerpt}</p>
                  <span className="text-[11px] text-ink-400">{formatDate(notice.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-400">등록된 공지가 없습니다.</p>
          )}
        </div>
      </section>

      <section className="card px-5 py-4">
        <h2 className="text-sm font-semibold text-ink-700">운영팀 연락처</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">
          서비스 문의나 긴급 신고는{' '}
          <a href="mailto:community@athletetime.kr" className="font-medium text-brand-600 hover:underline">
            community@athletetime.kr
          </a>
          로 보내주세요. 운영팀이 24시간 이내에 신속히 대응합니다.
        </p>
      </section>
    </div>
  )
}

export default LeftSidebar
