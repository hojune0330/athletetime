import { Link } from 'react-router-dom'
import { ChatBubbleLeftIcon, EyeIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import { usePosts } from '../../hooks/usePosts'
import type { Post } from '../../types/post'

const categoryColorMap: Record<string, string> = {
  공지: 'bg-amber-500/10 text-amber-400',
  자유: 'bg-blue-500/10 text-blue-400',
  질문: 'bg-purple-500/10 text-purple-400',
  마라톤: 'bg-emerald-500/10 text-emerald-400',
}

function formatRelativeTime(value?: string) {
  if (!value) return '방금'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString()
}

function getCategoryColor(category?: string) {
  if (!category) return 'bg-dark-600 text-gray-300'
  return categoryColorMap[category] ?? 'bg-dark-600 text-gray-300'
}

function sortPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateB - dateA
  })
}

export default function PostListReal() {
  const { data, isLoading, isError, refetch } = usePosts()
  const posts = data ? sortPosts(data) : []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl bg-dark-700 p-4 border border-dark-600"
          >
            <div className="h-4 w-20 bg-dark-500 rounded mb-3" />
            <div className="h-6 w-3/4 bg-dark-500 rounded mb-2" />
            <div className="h-4 w-1/2 bg-dark-600 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl bg-dark-700 border border-red-500/40 p-6 text-center">
        <p className="text-red-300 font-medium">게시글을 불러오지 못했어요.</p>
        <p className="text-sm text-gray-400 mt-2">인터넷 연결을 확인한 뒤 다시 시도해주세요.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-500"
        >
          다시 시도하기
        </button>
      </div>
    )
  }

  if (!posts.length) {
    return (
      <div className="rounded-xl bg-dark-700 border border-dark-600 p-6 text-center text-gray-400">
        아직 등록된 게시글이 없어요. 첫 번째 주인공이 되어주세요!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          to={`/post/${post.id}`}
          className="block rounded-xl border border-dark-600 bg-dark-700 p-4 hover:border-primary-500/60 hover:bg-dark-600 transition-colors"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {post.category && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor(post.category)}`}>
                    {post.category}
                  </span>
                )}
                {post.isNotice && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    📢 공지
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-white line-clamp-2 md:text-xl">
                {post.title || '제목 없음'}
              </h3>

              <p className="text-sm text-gray-400 line-clamp-2 whitespace-pre-line">
                {post.content || '내용이 없습니다.'}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400 md:flex-col md:items-end md:text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{post.author || '익명'}</span>
                <span className="text-gray-500">·</span>
                <span>{formatRelativeTime(post.date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <EyeIcon className="h-4 w-4" />
                  {post.views ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <HandThumbUpIcon className="h-4 w-4" />
                  {post.likes?.length ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="h-4 w-4" />
                  {post.comments?.length ?? 0}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
