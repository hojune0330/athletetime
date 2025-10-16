import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChatBubbleLeftRightIcon, HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePostDetail, postKeys } from '../features/board/hooks'
import { formatDate, formatNumber } from '../lib/utils'
import CommentThread from '../components/common/CommentThread'
import { submitComment, submitVote } from '../features/board/api'
import { getAnonymousUserId } from '../lib/user'

function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const queryClient = useQueryClient()
  const { data: post, isLoading, isError } = usePostDetail(postId)

  const [nickname, setNickname] = useState('익명')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')
  const [commentStatus, setCommentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [userId] = useState(() => getAnonymousUserId())

  const commentMutation = useMutation({
    mutationFn: submitComment,
    onSuccess: async () => {
      if (postId) {
        await queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) })
      }
      setContent('')
      setPassword('')
      setCommentStatus({ type: 'success', message: '댓글이 등록되었습니다.' })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '댓글 등록 중 오류가 발생했습니다.'
      setCommentStatus({ type: 'error', message })
    },
  })

  const voteMutation = useMutation({
    mutationFn: submitVote,
    onSuccess: async () => {
      if (postId) {
        await queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) })
      }
      setVoteError(null)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '추천 처리 중 문제가 발생했습니다.'
      setVoteError(message)
    },
  })

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!postId || !content.trim()) {
      return
    }

    setCommentStatus(null)
    commentMutation.mutate({
      postId,
      authorNick: nickname.trim() || '익명',
      content: content.trim(),
      password: password.trim() || Math.random().toString(36).slice(-8),
    })
  }

  const handleVote = (type: 'like' | 'dislike') => {
    if (!postId) {
      return
    }

    setVoteError(null)
    voteMutation.mutate({ postId, type, userId })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center text-ink-500">
        <p className="text-lg font-semibold">게시글을 불러오는 중 문제가 발생했습니다.</p>
        <Link to="/" className="btn-primary">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <article className="card overflow-hidden">
        <header className="border-b border-slate-100 bg-white px-6 py-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
            <span className="pill bg-ink-50 text-ink-600">{post.boardName}</span>
            <span>글 번호 {post.id}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-ink-900 md:text-3xl">{post.title}</h1>
          <div className="mt-5 grid gap-4 text-sm text-ink-600 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-ink-400">작성자</p>
              <p className="font-semibold text-ink-800">{post.authorNick}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-ink-400">작성일</p>
              <p>{formatDate(post.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-ink-400">조회수</p>
              <p>{formatNumber(post.views)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-ink-400">댓글</p>
              <p>{formatNumber(post.commentCount)}</p>
            </div>
          </div>
          {post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-brand-600">
              {post.tags.map((tag) => (
                <span key={tag} className="pill bg-brand-50/70">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="space-y-6 px-6 py-6">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-6">
            <div className="prose prose-slate max-w-none text-ink-800 prose-a:text-brand-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          {post.attachments.length > 0 ? (
            <section className="rounded-2xl border border-slate-100 bg-ink-50/70 p-4">
              <h2 className="text-sm font-semibold text-ink-700">첨부 파일</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                {post.attachments.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-subtle">
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.fileName ?? true}
                      className="line-clamp-1 font-medium text-brand-600 hover:underline"
                    >
                      {file.fileName ?? file.fileUrl}
                    </a>
                    <span className="text-xs text-ink-400">
                      {typeof file.fileSize === 'number' ? `${Math.max(1, Math.round(file.fileSize / 1024))}KB` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-400">
                업로드된 자료는 암호화되어 저장되며, 신고 접수 시 운영팀이 즉시 검토합니다.
              </p>
            </section>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary px-5 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => handleVote('like')}
              disabled={voteMutation.isPending}
            >
              <HandThumbUpIcon className="mr-2 h-5 w-5" />
              추천 {formatNumber(post.likeCount)}
            </button>
            <button
              type="button"
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => handleVote('dislike')}
              disabled={voteMutation.isPending}
            >
              <HandThumbDownIcon className="mr-2 h-5 w-5" />
              비추천 {formatNumber(post.dislikeCount)}
            </button>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-ink-400">
            <span>추천·비추천은 IP 기준으로 1시간에 한 번만 가능합니다.</span>
            {voteError ? (
              <span className="text-rose-500" role="alert" aria-live="assertive">
                {voteError}
              </span>
            ) : null}
          </div>
        </footer>
      </article>

      <section className="card p-6" aria-label="댓글">
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink-800">
            댓글 {formatNumber(post.commentCount)}
          </h2>
          <span className="text-xs text-ink-400">
            커뮤니티 가이드라인을 준수하고 서로를 존중하는 댓글 문화를 만들어주세요.
          </span>
        </header>

        <form className="space-y-3 rounded-2xl border border-slate-100 bg-ink-50/60 p-4" onSubmit={handleCommentSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-xs text-ink-400">
              닉네임
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="익명"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex w-full max-w-xs flex-col gap-1 text-xs text-ink-400">
              비밀번호 (수정/삭제용)
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상"
                type="password"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-ink-400">
            댓글 내용
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              placeholder="커뮤니티 수칙을 준수하여 댓글을 작성해주세요."
              className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
            <span>신고 10회 이상 누적 시 자동으로 블라인드 처리됩니다.</span>
            <button
              type="submit"
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
              disabled={commentMutation.isPending}
            >
              <ChatBubbleLeftRightIcon className="mr-2 h-4 w-4" />
              {commentMutation.isPending ? '등록 중…' : '댓글 등록'}
            </button>
          </div>
          {commentStatus ? (
            <p
              className={`text-xs ${commentStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}
              aria-live="polite"
            >
              {commentStatus.message}
            </p>
          ) : null}
        </form>

        {post.comments.length > 0 ? (
          <ul className="mt-6 space-y-4">
            {post.comments.map((comment) => (
              <CommentThread key={comment.id} comment={comment} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-ink-50/60 px-6 py-10 text-center text-sm text-ink-400">
            첫 댓글을 남겨보세요. 로그인 없이도 자유롭게 참여할 수 있습니다.
          </div>
        )}
      </section>
    </div>
  )
}

export default PostDetailPage
