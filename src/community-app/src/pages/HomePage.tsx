import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { useBoardNavigation, usePosts } from '../features/board/hooks'
import PostCard from '../components/common/PostCard'
import Pagination from '../components/common/Pagination'
import { cn } from '../lib/utils'

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'comments', label: '댓글순' },
  { value: 'views', label: '조회순' },
] as const

type SortOption = (typeof sortOptions)[number]['value']

function HomePage() {
  const params = useParams<{ boardSlug?: string }>()
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '1') || 1
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'latest'
  const query = searchParams.get('q') ?? undefined

  const { boards, activeBoard } = useBoardNavigation(params.boardSlug)
  const { data, isLoading, isFetching } = usePosts({
    boardSlug: params.boardSlug,
    page,
    sort,
    query,
    pageSize: 20,
  })

  const notices = useMemo(() => data?.data.filter((post) => post.isNotice) ?? [], [data])
  const posts = useMemo(() => data?.data.filter((post) => !post.isNotice) ?? [], [data])

  return (
    <div className="space-y-6">
      <section className="card border-brand-100/80 bg-gradient-to-br from-brand-50 via-white to-white p-6">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            {params.boardSlug ? 'Board' : 'Community'}
          </span>
          <h1 className="text-2xl font-bold text-ink-900 md:text-3xl">
            {activeBoard ? activeBoard.name : '전체 게시글'}
          </h1>
          <p className="max-w-2xl text-sm text-ink-600">
            {activeBoard
              ? activeBoard.description ?? '러너들의 생생한 이야기를 한 곳에서 만나보세요.'
              : '러닝을 사랑하는 사람들이 모인 AthleteTime 커뮤니티입니다. 자유롭게 질문하고, 정보를 나누고, 경험을 공유하세요.'}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-ink-400">
            <span>오늘 게시판 {activeBoard ? activeBoard.todayPostCount : boards.reduce((acc, board) => acc + board.todayPostCount, 0)}건</span>
            <span>실시간 업데이트 {isFetching ? '동기화 중...' : '완료'}</span>
            {query ? <span className="rounded-full bg-white px-3 py-1 text-ink-500">검색어: {query}</span> : null}
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="게시글 정렬">
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                to={{ pathname: params.boardSlug ? `/boards/${params.boardSlug}` : '/', search: `?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), sort: option.value, page: '1' }).toString()}` }}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm transition',
                  sort === option.value
                    ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-subtle'
                    : 'border-slate-200 bg-white text-ink-500 hover:bg-slate-100',
                )}
                role="tab"
                aria-selected={sort === option.value}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {notices.length > 0 ? (
        <section className="space-y-3" aria-label="공지사항">
          <header className="flex items-center justify-between text-sm font-semibold text-ink-500">
            <span>공지사항</span>
            <Link to="/boards/general" className="text-brand-600 hover:text-brand-500">
              더보기
            </Link>
          </header>
          <div className="space-y-3">
            {notices.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3" aria-label="게시글 목록">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="card h-32 animate-pulse bg-slate-100/70" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center text-ink-400">
            <p className="text-lg font-semibold">아직 게시글이 없습니다.</p>
            <p className="text-sm">첫 글의 주인공이 되어보세요! 베타 기간에는 로그인 없이 바로 작성할 수 있습니다.</p>
            <Link to="/write" className="btn-primary">
              새 글쓰기
            </Link>
          </div>
        )}
      </section>

      <Pagination page={data?.meta.page ?? 1} totalPages={data?.meta.totalPages ?? 1} />
    </div>
  )
}

export default HomePage
