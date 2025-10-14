import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useBoardNavigation, usePosts } from '../features/board/hooks'
import Pagination from '../components/common/Pagination'
import { cn } from '../lib/utils'

const sortOptions = [
  { value: 'popular', label: '인기' },
  { value: 'latest', label: '전체' },
  { value: 'comments', label: '주간' },
  { value: 'views', label: '월간' },
] as const

type SortOption = (typeof sortOptions)[number]['value']

function HomePage() {
  const params = useParams<{ boardSlug?: string }>()
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '1') || 1
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'popular'
  const query = searchParams.get('q') ?? undefined

  const { activeBoard } = useBoardNavigation(params.boardSlug)
  const { data, isLoading } = usePosts({
    boardSlug: params.boardSlug,
    page,
    sort,
    query,
    pageSize: 20,
  })

  const notices = useMemo(() => data?.data.filter((post) => post.isNotice) ?? [], [data])
  const posts = useMemo(() => data?.data.filter((post) => !post.isNotice) ?? [], [data])

  return (
    <div className="space-y-4">
      {/* 침하하 스타일 상단 탭 */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex items-center gap-6 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-900">
            {sort === 'popular' ? '최~~~~고로 인기!' : activeBoard ? activeBoard.name : '전체 게시글'}
          </h2>
          <div className="flex gap-1 ml-auto">
            {sortOptions.map((option) => {
              return (
                <Link
                  key={option.value}
                  to={{ pathname: params.boardSlug ? `/boards/${params.boardSlug}` : '/', search: `?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), sort: option.value, page: '1' }).toString()}` }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-md',
                    sort === option.value
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {option.value === 'popular' && '👍'}
                  {option.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* 공지사항 - 침하하 스타일 */}
      {notices.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-yellow-800">필독</span>
          </div>
          {notices.map((post) => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="block py-2 border-t border-yellow-200 first:border-t-0 hover:bg-yellow-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">{post.title}</span>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{post.commentCount}</span>
                  <span>{post.likeCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 게시글 목록 - 침하하 스타일 테이블/카드 */}
      <section className="bg-white rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="h-16 animate-pulse bg-slate-100 rounded" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            {/* 데스크톱: 테이블 뷰 */}
            <div className="hidden md:block">
              <table className="w-full">
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/post/${post.id}`} className="block">
                          <div className="flex items-start gap-3">
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
                              {post.boardName || '일반'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 truncate">{post.title}</span>
                                {post.imageCount && post.imageCount > 0 && <span className="text-xs text-blue-500">📷</span>}
                                {post.commentCount > 0 && (
                                  <span className="text-xs text-orange-500 font-medium">{post.commentCount}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span>{post.author || post.authorNick}</span>
                                <span>{post.viewCount || post.views} 조회</span>
                                <span>{post.createdAtRelative || new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-orange-500">{post.likeCount}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일: 카드 뷰 */}
            <div className="md:hidden divide-y divide-slate-100">
              {posts.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`} className="block p-4 hover:bg-slate-50">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
                      {post.boardName || '일반'}
                    </span>
                    {post.imageCount && post.imageCount > 0 && <span className="text-xs text-blue-500">📷</span>}
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2">{post.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>{post.author || post.authorNick}</span>
                      <span>{post.createdAtRelative || new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3 h-3" />
                        {post.viewCount || post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <ChatBubbleLeftIcon className="w-3 h-3" />
                        {post.commentCount}
                      </span>
                      <span className="text-orange-500 font-medium">{post.likeCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-lg font-medium text-slate-500 mb-2">아직 게시글이 없습니다</p>
            <p className="text-sm text-slate-400 mb-4">첫 글의 주인공이 되어보세요!</p>
            <Link to="/write" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
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
