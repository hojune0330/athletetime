import { Link } from 'react-router-dom'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useBoards, usePopularPosts } from '../../features/board/hooks'
import { formatNumber, formatRelativeTime } from '../../lib/utils'

function RightSidebar() {
  const {
    data: popularPosts,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = usePopularPosts(5)
  const { data: boards, dataUpdatedAt: boardsUpdatedAt, isLoading: isBoardsLoading } = useBoards()

  const activeBoards = boards?.filter((board) => board.isActive) ?? []
  const totalTodayPosts = activeBoards.reduce((acc, board) => acc + (board.todayPostCount ?? 0), 0)
  const totalTodayComments = activeBoards.reduce((acc, board) => acc + (board.todayCommentCount ?? 0), 0)
  const busiestBoard = activeBoards.reduce<typeof activeBoards[number] | undefined>((top, board) => {
    if (!top) return board
    return board.todayPostCount > top.todayPostCount ? board : top
  }, undefined)

  const updatedAtLabel = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt) : null
  const boardStatsUpdatedLabel = boardsUpdatedAt ? formatRelativeTime(boardsUpdatedAt) : null
  const activeBoardsCountLabel = isBoardsLoading ? '—' : formatNumber(activeBoards.length)
  const todayPostsLabel = isBoardsLoading ? '—' : formatNumber(totalTodayPosts)
  const todayCommentsLabel = isBoardsLoading ? '—' : formatNumber(totalTodayComments)
  const popularPostsCountLabel = isLoading && !popularPosts ? '—' : formatNumber(popularPosts?.length ?? 0)

  return (
    <div className="sticky top-[96px] space-y-4">
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-500">실시간 인기글</h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
            aria-label="인기글 새로고침"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" /> 새로고침
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`popular-skeleton-${index}`} className="h-12 animate-pulse rounded-lg bg-slate-100/80" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-rose-50 px-3 py-4 text-xs text-rose-600">
            인기글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : popularPosts && popularPosts.length > 0 ? (
          <ol className="space-y-2 text-sm">
            {popularPosts.map((post, index) => (
              <li key={post.id} className="group">
                <Link to={`/post/${post.id}`} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-ink-700 group-hover:text-brand-600">
                      {post.title}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {post.boardName} · 추천 {post.likeCount.toLocaleString()} · 조회 {post.views.toLocaleString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg bg-slate-100/80 px-3 py-6 text-center text-xs text-ink-500">
            아직 인기글이 없습니다. 첫 게시글을 작성해보세요!
          </p>
        )}

        {updatedAtLabel ? (
          <p className="mt-3 text-[11px] text-ink-400">{updatedAtLabel} 기준</p>
        ) : null}
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-600">커뮤니티 스냅샷</h2>
          {boardStatsUpdatedLabel ? <span className="text-[11px] text-ink-400">{boardStatsUpdatedLabel} 기준</span> : null}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
          <div>
            <dt className="text-ink-400">활성 게시판</dt>
            <dd className="text-lg font-semibold text-ink-800">{activeBoardsCountLabel}</dd>
          </div>
          <div>
            <dt className="text-ink-400">오늘 게시글</dt>
            <dd className="text-lg font-semibold text-brand-600">{todayPostsLabel}</dd>
          </div>
          <div>
            <dt className="text-ink-400">오늘 댓글</dt>
            <dd className="text-lg font-semibold text-ink-800">{todayCommentsLabel}</dd>
          </div>
          <div>
            <dt className="text-ink-400">인기글 집계</dt>
            <dd className="text-lg font-semibold text-ink-800">{popularPostsCountLabel}</dd>
          </div>
        </dl>
        {isBoardsLoading ? (
          <p className="mt-4 text-xs text-ink-400">게시판 정보를 불러오는 중입니다.</p>
        ) : busiestBoard ? (
          <p className="mt-4 rounded-lg bg-ink-50/80 px-3 py-2 text-xs text-ink-500">
            오늘 가장 활발한 게시판은{' '}
            <Link to={`/boards/${busiestBoard.slug}`} className="font-medium text-brand-600 hover:underline">
              {busiestBoard.name}
            </Link>
            입니다. 게시글 {formatNumber(busiestBoard.todayPostCount)}건이 등록되었습니다.
          </p>
        ) : (
          <p className="mt-4 text-xs text-ink-400">활성화된 게시판이 아직 없습니다.</p>
        )}
      </section>
    </div>
  )
}

export default RightSidebar
