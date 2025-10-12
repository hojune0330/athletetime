import { Link } from 'react-router-dom'
import { usePopularPosts } from '../../features/board/hooks'
import { formatRelativeTime } from '../../lib/utils'

const trendingKeywords = ['서울마라톤', '서브3', '트레일러닝', '나이키 줌X', 'LSD']
const lastUpdated = new Date().toISOString()

function RightSidebar() {
  const { data: popularPosts } = usePopularPosts(5)

  return (
    <div className="sticky top-[96px] space-y-4">
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-500">실시간 인기글</h2>
        <ol className="space-y-2 text-sm">
          {popularPosts?.map((post, index) => (
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
        <p className="mt-3 text-[11px] text-ink-400">
          {formatRelativeTime(lastUpdated)} 기준 인기글
        </p>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-500">트렌드 키워드</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {trendingKeywords.map((keyword) => (
            <span key={keyword} className="pill cursor-pointer bg-slate-100/80 hover:bg-brand-50 hover:text-brand-700">
              #{keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-500">오늘의 커뮤니티</h2>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-slate-100/80 p-3 text-center">
            <dt className="text-ink-500">실시간 방문자</dt>
            <dd className="mt-1 text-lg font-semibold text-ink-800">428명</dd>
            <dd className="text-[10px] text-ink-400">베타 기준 추정값</dd>
          </div>
          <div className="rounded-lg bg-slate-100/80 p-3 text-center">
            <dt className="text-ink-500">오늘 게시글</dt>
            <dd className="mt-1 text-lg font-semibold text-ink-800">99건</dd>
            <dd className="text-[10px] text-ink-400">오전 6시 기준 집계</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-ink-400">
          통계 기능은 베타 기간 동안 샘플 데이터로 제공됩니다. 정식 오픈 시 실시간 집계가 적용됩니다.
        </p>
      </section>
    </div>
  )
}

export default RightSidebar
