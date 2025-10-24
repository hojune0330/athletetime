import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChatBubbleLeftIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useCreateComment, usePost, useVotePost } from '../hooks/usePosts'

function ensureAnonymousUserId() {
  if (typeof window === 'undefined') return 'anonymous'
  const storageKey = 'athletetime-anonymous-user'
  let stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    stored = `anon-${crypto.randomUUID?.() ?? Date.now().toString(36)}`
    window.localStorage.setItem(storageKey, stored)
  }
  return stored
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
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

export default function PostDetailPage() {
  const { postId } = useParams()
  const [userId] = useState(() => ensureAnonymousUserId())

  const { data: post, isLoading, isError, refetch } = usePost(postId ?? '')
  const votePost = useVotePost()
  const createComment = useCreateComment()

  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)

  const hasLiked = useMemo(() => (post?.likes ?? []).includes(userId), [post?.likes, userId])
  const hasDisliked = useMemo(() => (post?.dislikes ?? []).includes(userId), [post?.dislikes, userId])
  const commentCount = post?.comments?.length ?? 0

  const sortedComments = useMemo(() => {
    if (!post?.comments) return []
    return [...post.comments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [post?.comments])

  const handleVote = (type: 'like' | 'dislike') => {
    if (!post) return
    votePost.mutate({
      id: post.id,
      userId,
      type,
    })
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCommentError(null)

    if (!post) return

    if (!commentContent.trim()) {
      setCommentError('댓글 내용을 입력해주세요.')
      return
    }

    try {
      await createComment.mutateAsync({
        postId: post.id,
        content: commentContent.trim(),
        author: commentAuthor.trim() || '익명',
      })
      setCommentAuthor('')
      setCommentContent('')
      await refetch()
    } catch (error) {
      console.error(error)
      setCommentError('댓글 작성에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-xl bg-dark-700 p-6 border border-dark-600">
          <div className="h-6 w-32 bg-dark-500 rounded mb-4" />
          <div className="h-8 w-3/4 bg-dark-500 rounded mb-3" />
          <div className="h-4 w-full bg-dark-600 rounded mb-2" />
          <div className="h-4 w-2/3 bg-dark-600 rounded" />
        </div>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="rounded-xl bg-dark-700 border border-red-500/40 p-6 text-center">
        <p className="text-red-300 font-medium mb-2">게시글을 불러오는 중 문제가 발생했어요.</p>
        <p className="text-sm text-gray-300">URL을 확인해주시고, 아래 버튼으로 다시 시도해주세요.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4" /> 다시 불러오기
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-dark-600 px-4 py-2 text-gray-300 hover:bg-dark-500"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <article className="card-dark">
        <div className="p-6 border-b border-dark-600">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
            {post.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-dark-600 px-2 py-0.5 text-gray-300">
                {post.category}
              </span>
            )}
            {post.isNotice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">
                📢 공지
              </span>
            )}
            <span>{formatDateTime(post.date)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <EyeIcon className="h-3.5 w-3.5" />
              {post.views ?? 0}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
              {commentCount}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            {post.title || '제목 없음'}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="font-medium text-white">{post.author || '익명'}</span>
            <span className="text-gray-500">·</span>
            <span>{formatRelativeTime(post.date)}</span>
          </div>
        </div>

        <div className="p-6 space-y-4 text-gray-200">
          {post.content
            ? post.content.split('\n').map((line, index) => (
                <p key={index} className="leading-relaxed">
                  {line || '\u00A0'}
                </p>
              ))
            : (
              <p className="text-gray-400">내용이 없습니다.</p>
            )}

          {post.images && post.images.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {post.images.map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-dark-600">
                  <img src={image} alt="게시글 이미지" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-t border-dark-600">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote('like')}
              disabled={votePost.isPending}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                hasLiked
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-600 text-gray-200 hover:bg-dark-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <HandThumbUpIcon className="h-4 w-4" />
              <span>추천 {post.likes?.length ?? 0}</span>
            </button>
            <button
              onClick={() => handleVote('dislike')}
              disabled={votePost.isPending}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                hasDisliked
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-dark-600 text-gray-200 hover:bg-dark-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <HandThumbDownIcon className="h-4 w-4" />
              <span>비추천 {post.dislikes?.length ?? 0}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>게시글 ID: {post.id}</span>
          </div>
        </div>
      </article>

      <section className="card-dark p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>💬 댓글</span>
          <span className="text-primary-400">{commentCount}</span>
        </h2>

        <form onSubmit={handleCommentSubmit} className="mb-6 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder="닉네임 (선택)"
              className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-3 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
            rows={4}
          />
          {commentError && <p className="text-sm text-red-400">{commentError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createComment.isPending}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createComment.isPending ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {sortedComments.length === 0 && (
            <p className="rounded-lg bg-dark-700 border border-dark-600 px-4 py-6 text-center text-sm text-gray-400">
              아직 댓글이 없어요. 첫 댓글을 작성해보세요!
            </p>
          )}

          {sortedComments.map((comment) => (
            <div key={comment.id} className="border-b border-dark-600 pb-4 last:border-none last:pb-0">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <span className="font-medium text-white">{comment.author || '익명'}</span>
                <span>·</span>
                <span>{formatRelativeTime(comment.date)}</span>
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <Link
          to="/"
          className="rounded-lg bg-dark-700 px-6 py-2 text-sm font-medium text-white hover:bg-dark-600"
        >
          목록으로
        </Link>
      </div>
    </div>
  )
}
