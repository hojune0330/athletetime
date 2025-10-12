import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createPost } from '../features/board/api'
import { useBoardNavigation } from '../features/board/hooks'
import { cn } from '../lib/utils'

function WritePage() {
  const navigate = useNavigate()
  const params = useParams<{ boardSlug?: string }>()
  const { boards, activeBoard } = useBoardNavigation(params.boardSlug)

  const [boardId, setBoardId] = useState(activeBoard?.id ?? boards[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [nickname, setNickname] = useState('익명')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      setStatusMessage('게시글이 정상적으로 등록되었습니다.')
      navigate(`/post/${post.id}`)
    },
    onError: (error) => {
      console.error(error)
      setStatusMessage('베타 서버 준비 중입니다. 잠시 후 다시 시도해주세요.')
    },
  })

  const boardOptions = useMemo(() => boards.map((board) => ({ value: board.id, label: board.name })), [boards])

  useEffect(() => {
    if (!boardId && boards.length > 0) {
      setBoardId(activeBoard?.id ?? boards[0].id)
    }
  }, [activeBoard?.id, boardId, boards])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    const files = Array.from(event.target.files).slice(0, 3)
    setAttachments(files)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!boardId || !title.trim() || !content.trim()) {
      setStatusMessage('필수 항목을 모두 입력해주세요.')
      return
    }

    mutation.mutate({
      boardId,
      title: title.trim(),
      content: content.trim(),
      authorNick: nickname.trim() || '익명',
      password: password.trim() || Math.random().toString(36).slice(-8),
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      attachments,
    })
  }

  return (
    <div className="space-y-6">
      <section className="card border-brand-100/80 bg-gradient-to-r from-brand-50 via-white to-white p-6">
        <h1 className="text-2xl font-bold text-ink-900">새 게시글 작성</h1>
        <p className="mt-2 text-sm text-ink-500">
          베타 기간에는 로그인 없이 비밀번호만으로 게시글을 관리할 수 있습니다. 게시글 삭제나 수정이 필요하면 작성 시 설정한 비밀번호가 반드시 필요합니다.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            게시판 선택
            <select
              value={boardId}
              onChange={(event) => setBoardId(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {boardOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            닉네임
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            비밀번호 (수정/삭제용)
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="최소 4자 이상"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            태그 (쉼표 구분)
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="예) 훈련,마라톤"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="제목을 입력해주세요"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          내용
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={12}
            placeholder="커뮤니티 가이드를 준수하여 내용을 작성해주세요. 베타 기간에는 이미지 업로드가 제한됩니다."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-ink-500">
          첨부 이미지 (최대 3개, 베타에서는 저장되지 않습니다)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs text-ink-400"
          />
          {attachments.length > 0 ? (
            <ul className="space-y-1 text-xs text-ink-400">
              {attachments.map((file) => (
                <li key={file.name}>
                  {file.name} · {(file.size / 1024).toFixed(0)}KB
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] text-ink-400">
            베타 서버에서는 이미지가 임시 저장만 됩니다. 정식 오픈 시 안정적인 저장소와 함께 제공될 예정입니다.
          </p>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-ink-400">
            글 작성 시 커뮤니티 이용 수칙을 준수해주세요. 욕설, 비방, 광고성 게시물은 예고 없이 삭제될 수 있습니다.
          </div>
          <button
            type="submit"
            className={cn('btn-primary px-6', mutation.isPending && 'cursor-progress opacity-70')}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '등록 중...' : '게시글 등록'}
          </button>
        </div>

        {statusMessage ? (
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-ink-500">{statusMessage}</div>
        ) : null}
      </form>
    </div>
  )
}

export default WritePage
