import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChartBarIcon, MegaphoneIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useCreatePost } from '../../hooks/usePosts'
import { getAnonymousId } from '../../utils/anonymousUser'
import { CommunityImagePicker } from './CommunityImagePicker'
import { CommunityPollBuilder } from './CommunityPollBuilder'

type CommunityDraft = {
  readonly title: string
  readonly content: string
  readonly author: string
  readonly password: string
  readonly hasImage: boolean
  readonly hasPoll: boolean
  readonly isNotice: boolean
}

type CommunityQuickPostFormProps = {
  readonly initialTitle: string
  readonly onCancel: () => void
  readonly onSubmitted: (message: string) => void
}

const emptyDraft: CommunityDraft = {
  title: '',
  content: '',
  author: '',
  password: '',
  hasImage: false,
  hasPoll: false,
  isNotice: false,
}

export function CommunityQuickPostForm({
  initialTitle,
  onCancel,
  onSubmitted,
}: CommunityQuickPostFormProps) {
  const { user } = useAuth()
  const isAdmin = user?.isAdmin || false
  const createPostMutation = useCreatePost()
  const [newPost, setNewPost] = useState<CommunityDraft>({ ...emptyDraft, title: initialTitle })
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  useEffect(() => {
    setNewPost((prev) => ({ ...prev, title: initialTitle }))
  }, [initialTitle])

  const updateDraft = (patch: Partial<CommunityDraft>) => {
    setNewPost((prev) => ({ ...prev, ...patch }))
  }

  const resetForm = () => {
    setNewPost(emptyDraft)
    setSelectedImages([])
    setImagePreviews([])
    setImageError(null)
    setPollQuestion('')
    setPollOptions(['', ''])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!newPost.content.trim()) {
      setFormError('내용을 입력해주세요.')
      return
    }
    if (!newPost.password.trim()) {
      setFormError('삭제용 비밀번호를 입력해주세요.')
      return
    }

    const validPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
    const poll = newPost.hasPoll && pollQuestion.trim() && validPollOptions.length >= 2
      ? { question: pollQuestion.trim(), options: validPollOptions }
      : undefined
    const author = isAdmin ? (user?.nickname || '관리자') : (newPost.author.trim() || '익명')

    try {
      await createPostMutation.mutateAsync({
        data: {
          title: newPost.title.trim() || '제목 없음',
          content: newPost.content.trim(),
          author,
          password: newPost.password.trim(),
          category: '자유',
          anonymousId: getAnonymousId(),
          isNotice: isAdmin && newPost.isNotice,
          poll,
        },
        images: selectedImages,
      })
      resetForm()
      onSubmitted(newPost.isNotice ? '공지사항이 등록됐어요!' : '게시글이 등록됐어요!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '게시글을 등록하지 못했어요.'
      console.error(message)
      setFormError('게시글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const isSubmitting = createPostMutation.isPending

  return (
    <div className="card mb-4">
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="제목을 입력하세요 (선택)"
            value={newPost.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
            className="input"
          />
          <textarea
            placeholder="내용을 입력하세요..."
            value={newPost.content}
            onChange={(event) => updateDraft({ content: event.target.value })}
            className="textarea"
            rows={4}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <input
                type="text"
                placeholder="닉네임 (선택)"
                value={isAdmin ? (user?.nickname || '관리자') : newPost.author}
                onChange={(event) => !isAdmin && updateDraft({ author: event.target.value })}
                autoComplete="off"
                className={`input ${isAdmin ? 'bg-neutral-100 cursor-not-allowed' : ''}`}
                readOnly={isAdmin}
              />
              {isAdmin && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary-600">
                  관리자
                </span>
              )}
            </div>
            <input
              type="password"
              placeholder="삭제용 비밀번호 (필수)"
              value={newPost.password}
              onChange={(event) => updateDraft({ password: event.target.value })}
              autoComplete="off"
              className="input"
              required
            />
          </div>

          {isAdmin && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
              <input
                type="checkbox"
                checked={newPost.isNotice}
                onChange={(event) => updateDraft({ isNotice: event.target.checked })}
                className="h-5 w-5 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <MegaphoneIcon className="h-5 w-5 text-primary-600" />
              <span className="font-medium text-primary-700">공지사항으로 등록</span>
            </label>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateDraft({ hasImage: !newPost.hasImage })}
                className={`rounded-lg p-2.5 transition-colors ${
                  newPost.hasImage ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
                aria-label="이미지 추가"
              >
                <PhotoIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ hasPoll: !newPost.hasPoll })}
                className={`rounded-lg p-2.5 transition-colors ${
                  newPost.hasPoll ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
                aria-label="투표 추가"
              >
                <ChartBarIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="btn-secondary">
                취소
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? '작성 중...' : '익명으로 작성'}
              </button>
            </div>
          </div>

          {formError && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{formError}</div>}

          {newPost.hasImage && (
            <CommunityImagePicker
              selectedImages={selectedImages}
              imagePreviews={imagePreviews}
              imageError={imageError}
              onError={setImageError}
              onImagesAdded={(files, previews) => {
                setSelectedImages((prev) => [...prev, ...files])
                setImagePreviews((prev) => [...prev, ...previews])
              }}
              onRemoveImage={(index) => {
                setSelectedImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index))
                setImagePreviews((prev) => prev.filter((_, previewIndex) => previewIndex !== index))
                setImageError(null)
              }}
            />
          )}

          {newPost.hasPoll && (
            <CommunityPollBuilder
              pollQuestion={pollQuestion}
              pollOptions={pollOptions}
              onQuestionChange={setPollQuestion}
              onOptionsChange={setPollOptions}
            />
          )}
        </form>
      </div>
    </div>
  )
}
