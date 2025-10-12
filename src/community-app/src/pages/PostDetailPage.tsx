import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePostDetail, postKeys } from '../features/board/hooks'
import { formatDate, formatNumber } from '../lib/utils'
import CommentThread from '../components/common/CommentThread'
import { submitComment } from '../features/board/api'

function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const queryClient = useQueryClient()
  const { data: post, isLoading, isError } = usePostDetail(postId)

  const [nickname, setNickname] = useState('익명')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')

  const commentMutation = useMutation({
    mutationFn: submitComment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postKeys.detail(postId ?? '') })
      setContent('')
      setPassword('')
    },
  })

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!postId || !content.trim()) {
      return
    }

    commentMutation.mutate({
      postId,
      authorNick: nickname.trim() || '익명',
      content: content.trim(),
      password: password.trim() || Math.random().toString(36).slice(-8),
    })
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
        <header className="border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
            <span className="pill bg-slate-100 text-ink-500">{post.boardName}</span>
            <span>{formatDate(post.createdAt)}</span>
            <span>조회 {formatNumber(post.views)}</span>
            <span>댓글 {formatNumber(post.commentCount)}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-ink-900 md:text-3xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-600">
            <span className="font-semibold">{post.authorNick}</span>
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs text-brand-600">
                {post.tags.map((tag) => (
                  <span key={tag} className="pill bg-brand-50/70">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="space-y-6 px-6 py-6">
          <div className="rounded-2xl bg-white">
            <div className="prose prose-slate max-w-none text-ink-800 prose-a:text-brand-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          {post.attachments.length > 0 ? (
            <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <h2 className="text-sm font-semibold text-ink-600">첨부 파일 (베타: 다운로드 제한)</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                {post.attachments.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-subtle">
                    <span className="line-clamp-1 font-medium">{file.fileName}</span>
                    <span className="text-xs text-ink-400">{Math.round(file.fileSize / 1024)}KB</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-400">
                베타 기간에는 파일 다운로드가 제한됩니다. 정식 오픈 후 원본 다운로드가 가능해집니다.
              </p>
            </section>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-4 text-sm">
          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary px-5" disabled title="베타 기간에는 추천 기능이 비활성화되어 있습니다.">
              <HandThumbUpIcon className="mr-2 h-5 w-5" />
              추천 {formatNumber(post.likeCount)}
            </button>
            <button type="button" className="btn-ghost" disabled>
              <HandThumbDownIcon className="mr-2 h-5 w-5" />
              비추천 {formatNumber(post.dislikeCount)}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <button type="button" className="btn-ghost" disabled>
              <ShareIcon className="mr-2 h-4 w-4" />
              공유 준비중
            </button>
            <button type="button" className="btn-ghost" disabled>
              <BookmarkIcon className="mr-2 h-4 w-4" />
              찜하기 준비중
            </button>
          </div>
        </footer>
      </article>

      <section className="card p-6" aria-label="댓글">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800">
            댓글 {formatNumber(post.commentCount)}
          </h2>
          <span className="text-xs text-ink-400">
            베타: 작성 후 수정/삭제는 비밀번호로만 가능합니다.
          </span>
        </header>

        <form className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4" onSubmit={handleCommentSubmit}>
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
              placeholder="러너들과 정보를 나눠보세요. 베타에서는 댓글 수정/삭제가 제한됩니다."
              className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
            <span>스팸 및 부적절한 댓글은 신고 시 자동으로 숨김 처리됩니다.</span>
            <button type="submit" className="btn-primary" disabled>
              <ChatBubbleLeftRightIcon className="mr-2 h-4 w-4" />
              베타 댓글 비활성화
            </button>
          </div>
        </form>

        <ul className="mt-6 space-y-4">
          {post.comments.map((comment) => (
            <CommentThread key={comment.id} comment={comment} />
          ))}
        </ul>
      </section>
    </div>
  )
}

export default PostDetailPage
