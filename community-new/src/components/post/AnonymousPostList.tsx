import { Link } from 'react-router-dom'
import {
  ChatBubbleLeftIcon,
  EyeIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import type { Post } from '../../types/post'

interface AnonymousPostListProps {
  posts: Post[]
  sortBy: 'latest' | 'hot' | 'comment'
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

function formatRelativeTime(value?: string) {
  if (!value) return '방금 전'
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

function getVoteBadgeClass(likes: number, dislikes: number) {
  if (likes >= 10) return 'text-primary-400'
  if (dislikes >= 10) return 'text-red-400'
  return 'text-gray-400'
}

export default function AnonymousPostList({ posts, sortBy: _sortBy, isLoading, isError, onRetry }: AnonymousPostListProps) {
<<<<<<< HEAD
  // 데이터 검증
  const validPosts = posts?.filter(post => {
    if (!post || !post.id) return false
    // 백엔드 필드와 프론트엔드 필드 매핑
    if (!post.views) post.views = 0
    if (!post.likes) post.likes = []
    if (!post.dislikes) post.dislikes = []
    if (!post.comments) post.comments = []
    if (post.is_notice !== undefined) post.isNotice = post.is_notice
    if (post.is_blinded !== undefined) post.isBlinded = post.is_blinded
    return true
  }) || []
=======
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-lg bg-dark-700 p-4 border border-dark-600">
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
      <div className="rounded-lg bg-dark-700 border border-red-500/40 p-6 text-center">
        <p className="text-red-300 font-medium">익명 게시판을 불러오는 중 문제가 생겼어요.</p>
        <p className="text-sm text-gray-400 mt-2">잠시 후 다시 시도해주세요.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-500"
          >
            다시 시도하기
          </button>
        )}
      </div>
    )
  }

<<<<<<< HEAD
  if (!validPosts.length) {
=======
  if (!posts.length) {
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
    return (
      <div className="rounded-lg bg-dark-700 border border-dark-600 p-6 text-center text-gray-400">
        아직 게시글이 없어요. 첫 글을 작성해보세요!
      </div>
    )
  }

<<<<<<< HEAD
  const displayPosts = validPosts.slice(0, 20)
=======
  const displayPosts = posts.slice(0, 20)
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a

  return (
    <div className="space-y-3">
      {displayPosts.map((post) => {
<<<<<<< HEAD
        const likes = post.likes?.length ?? 0
        const dislikes = post.dislikes?.length ?? 0
        const comments = post.comments?.length ?? 0
        const hasImages = Boolean(post.images && post.images.length > 0)
        const isHot = likes >= 10 || comments >= 15 || (post.views ?? 0) >= 300
=======
        const likes = post.likesCount || 0
        const dislikes = post.dislikesCount || 0
        const comments = post.commentsCount || 0
        const hasImages = Boolean(post.images && post.images[0]?.cloudinaryUrl)
        const isHot = likes >= 20 // 좋아요 20개 이상
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a

        return (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="block rounded-lg bg-dark-700 border border-dark-600 hover:border-primary-500/60 hover:bg-dark-600 transition-colors"
          >
            <article className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {post.category && (
<<<<<<< HEAD
                  <span className="text-xs px-2 py-0.5 bg-dark-600 text-gray-400 rounded">
                    {post.category}
=======
                  <span 
                    className="text-xs px-2 py-0.5 bg-dark-600 rounded"
                    style={{ color: post.categoryColor || '#9CA3AF' }}
                  >
                    {post.categoryIcon && <span>{post.categoryIcon}</span>} {post.category}
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
                  </span>
                )}
                {post.isNotice && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                    📢 공지
                  </span>
                )}
                {isHot && (
                  <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded flex items-center gap-1">
                    🔥 HOT
                  </span>
                )}
                {hasImages && (
                  <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded">
                    🖼️ 사진
                  </span>
                )}
              </div>

              <h3 className="font-medium text-white mb-2 text-base line-clamp-2">
                {post.title || '제목 없음'}
              </h3>

              <p className="text-gray-300 text-sm mb-3 line-clamp-3 whitespace-pre-line">
                {post.content || '내용이 없습니다.'}
              </p>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  <span>{post.author || '익명'}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(post.date)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-3.5 h-3.5" />
<<<<<<< HEAD
                    {post.views ?? 0}
=======
                    {post.views}
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
                  </span>
                </div>

                <div className="flex items-center gap-1 text-gray-400">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded ${getVoteBadgeClass(likes, dislikes)}`}>
                    <HandThumbUpIcon className="w-4 h-4" />
                    {likes}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-gray-400">
                    <HandThumbDownIcon className="w-4 h-4" />
                    {dislikes}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-gray-400">
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    {comments}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-gray-400">
                    <ShareIcon className="w-4 h-4" />
                    공유
                  </span>
                </div>
              </div>
            </article>
          </Link>
        )
      })}
    </div>
  )
}
