import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { useBoardNavigation, usePosts } from '../features/board/hooks'
import Pagination from '../components/common/Pagination'
import { cn, formatDate, formatNumber } from '../lib/utils'
import type { PostSummary } from '../lib/types'

const ESSENTIAL_NOTICE: PostSummary = {
  id: 'beta-policy-notice',
  boardId: 'notice',
  boardSlug: 'notice',
  boardName: '공지',
  title: '베타 운영 정책 안내',
  excerpt:
    'AthleteTime 익명 게시판은 2025년 10월 13일 기준 베타 운영 중입니다. 작성 시 설정한 비밀번호를 분실하면 수정/삭제가 불가능합니다.',
  authorNick: '운영팀',
  createdAt: '2025-10-13T00:00:00+09:00',
  updatedAt: '2025-10-13T00:00:00+09:00',
  views: 0,
  likeCount: 0,
  dislikeCount: 0,
  commentCount: 0,
  tags: ['공지'],
  isNotice: true,
  isHot: false,
  hasPoll: false,
}

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
  const { data, isLoading, isFetching, isError } = usePosts({
    boardSlug: params.boardSlug,
    page,
    sort,
    query,
    pageSize: 20,
  })

  const apiNotices = useMemo(() => data?.data.filter((post) => post.isNotice) ?? [], [data])
  const posts = useMemo(() => data?.data.filter((post) => !post.isNotice) ?? [], [data])

  const notices = useMemo(() => {
    const map = new Map<string, PostSummary>()
    map.set(ESSENTIAL_NOTICE.id, ESSENTIAL_NOTICE)
    for (const notice of apiNotices) {
      map.set(notice.id, notice)
    }
    return Array.from(map.values())
  }, [apiNotices])

  const totalTodayPosts = boards.reduce((acc, board) => acc + (board.todayPostCount ?? 0), 0)

  return (
    <div className="space-y-6">
      <section className="card border border-slate-200/70 bg-white px-5 py-6 shadow-subtle sm:px-8">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            {params.boardSlug ? 'Board' : 'Community'}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
                {activeBoard ? activeBoard.name : '전체 게시글'}
              </h1>
              <p className="mt-1 text-sm text-ink-600">
                {activeBoard
                  ? activeBoard.description ?? '러너들의 생생한 이야기를 한 곳에서 만나보세요.'
                  : '러닝을 사랑하는 사람들이 모인 AthleteTime 커뮤니티입니다. 자유롭게 질문하고 정보를 나누세요.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink-400">
              <span>
                오늘 게시글{' '}
                <strong className="text-ink-600">
                  {activeBoard ? activeBoard.todayPostCount ?? 0 : totalTodayPosts}
                </strong>
                건
              </span>
              <span>실시간 업데이트 {isFetching ? '동기화 중…' : '완료'}</span>
              {query ? <span className="rounded-full bg-ink-50 px-3 py-1 text-ink-500">검색어: {query}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="게시글 정렬">
            {sortOptions.map((option) => {
              const nextSearch = new URLSearchParams(Object.fromEntries(searchParams.entries()))
              nextSearch.set('sort', option.value)
              nextSearch.set('page', '1')

              return (
                <Link
                  key={option.value}
                  to={{ pathname: params.boardSlug ? `/boards/${params.boardSlug}` : '/', search: `?${nextSearch.toString()}` }}
                  className={cn(
                    'rounded-lg border px-4 py-1.5 text-sm font-medium transition',
                    sort === option.value
                      ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-subtle'
                      : 'border-slate-200 bg-white text-ink-500 hover:bg-slate-100',
                  )}
                  role="tab"
                  aria-selected={sort === option.value}
                >
                  {option.label}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden" aria-label="게시글 목록">
        <header className="flex flex-col gap-2 border-b border-slate-100 bg-ink-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-ink-700">
            {activeBoard ? `${activeBoard.name} 게시판` : '전체 게시글'}
          </h2>
          <span className="text-xs text-ink-400">
            {isLoading ? '목록을 불러오는 중입니다…' : `${formatNumber(data?.meta.totalItems ?? 0)}개의 게시글`}
          </span>
        </header>

        {isLoading ? (
          <div className="space-y-3 px-4 py-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100/80" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-ink-500">
            <p className="text-lg font-semibold">게시글을 불러오지 못했습니다.</p>
            <p className="text-sm">잠시 후 다시 시도하거나 네트워크 환경을 확인해주세요.</p>
          </div>
        ) : posts.length + notices.length > 0 ? (
          <>
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <colgroup>
                  <col className="w-28" />
                  <col />
                  <col className="w-28" />
                  <col className="w-20" />
                  <col className="w-24" />
                  <col className="w-32" />
                </colgroup>
                <thead className="bg-white text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">말머리</th>
                    <th scope="col" className="px-4 py-3 text-left">제목</th>
                    <th scope="col" className="px-4 py-3 text-left">닉네임</th>
                    <th scope="col" className="px-4 py-3 text-right">추천</th>
                    <th scope="col" className="px-4 py-3 text-right">조회</th>
                    <th scope="col" className="px-4 py-3 text-right">작성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {notices.map((post) => (
                    <tr key={post.id} className="bg-amber-50/70 text-ink-700">
                      <td className="px-4 py-3 text-xs font-semibold text-amber-600">공지</td>
                      <td className="px-4 py-3 font-semibold">
                        <Link to={`/post/${post.id}`} className="inline-flex items-center gap-2 text-ink-800 hover:text-brand-600">
                          {post.title}
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                            운영팀
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-600">{post.authorNick}</td>
                      <td className="px-4 py-3 text-right text-sm text-ink-500">{formatNumber(post.likeCount)}</td>
                      <td className="px-4 py-3 text-right text-sm text-ink-500">{formatNumber(post.views)}</td>
                      <td className="px-4 py-3 text-right text-xs text-ink-400">{formatDate(post.createdAt)}</td>
                    </tr>
                  ))}
                  {posts.map((post) => (
                    <tr key={post.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-ink-400">{post.boardName}</td>
                      <td className="px-4 py-3">
                        <Link to={`/post/${post.id}`} className="inline-flex items-center gap-2 text-ink-800 hover:text-brand-600">
                          <span className="line-clamp-1 font-medium">{post.title}</span>
                          {post.commentCount > 0 ? (
                            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-ink-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                              {formatNumber(post.commentCount)}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-600">{post.authorNick}</td>
                      <td className="px-4 py-3 text-right text-sm text-brand-600">{formatNumber(post.likeCount)}</td>
                      <td className="px-4 py-3 text-right text-sm text-ink-500">{formatNumber(post.views)}</td>
                      <td className="px-4 py-3 text-right text-xs text-ink-400">{formatDate(post.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {notices.map((post) => (
                <article key={post.id} className="bg-amber-50/80 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">공지</div>
                  <Link to={`/post/${post.id}`} className="mt-1 block text-base font-semibold text-ink-900">
                    {post.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    <span>운영팀</span>
                    <span>추천 {formatNumber(post.likeCount)}</span>
                    <span>조회 {formatNumber(post.views)}</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </article>
              ))}
              {posts.map((post) => (
                <article key={post.id} className="px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{post.boardName}</div>
                  <Link to={`/post/${post.id}`} className="mt-1 block text-base font-semibold text-ink-900">
                    {post.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    <span>{post.authorNick}</span>
                    {post.commentCount > 0 ? <span>댓글 {formatNumber(post.commentCount)}</span> : null}
                    <span>추천 {formatNumber(post.likeCount)}</span>
                    <span>조회 {formatNumber(post.views)}</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-ink-500">
            <p className="text-lg font-semibold">아직 게시글이 없습니다.</p>
            <p className="text-sm">첫 글을 작성하고 커뮤니티를 시작해보세요. 베타 기간에는 로그인 없이 바로 이용할 수 있습니다.</p>
            <Link to="/write" className="btn-primary">
              글쓰기
            </Link>
          </div>
        )}
      </section>

      <Pagination page={data?.meta.page ?? 1} totalPages={data?.meta.totalPages ?? 1} />
    </div>
  )
}

export default HomePage
