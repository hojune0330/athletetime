import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/common/PageHeader'
import Pagination from '../components/common/Pagination'
import { CommunityQuickPostForm } from '../components/community/CommunityQuickPostForm'
import { RecordContextPrompt } from '../components/community/RecordContextPrompt'
import PostList from '../components/post/PostList'
import { usePosts } from '../hooks/usePosts'

type SortKey = 'latest' | 'hot' | 'comment'

const sortOptions: readonly { readonly key: SortKey; readonly label: string }[] = [
  { key: 'latest', label: '최신' },
  { key: 'hot', label: '많이 본' },
  { key: 'comment', label: '댓글 많은' },
]

function cleanRecordContext(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 40)
}

export default function CommunityPage() {
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page')) || 1
  const recordContext = cleanRecordContext(searchParams.get('record') || '')
  const limit = 20
  const [sortBy, setSortBy] = useState<SortKey>('latest')
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [initialTitle, setInitialTitle] = useState('')
  const { data: postsData } = usePosts({ page, limit, sort: sortBy })
  const totalPages = postsData?.count ? Math.ceil(postsData.count / limit) : 1

  const handleToggleWriteForm = () => {
    setInitialTitle('')
    setShowWriteForm((prev) => !prev)
    setFormSuccess(null)
  }

  const handleStartRecordDiscussion = () => {
    if (!recordContext) return
    setInitialTitle(`${recordContext} 기록 이야기`)
    setShowWriteForm(true)
    setFormSuccess(null)
  }

  const handleCancelWrite = () => {
    setShowWriteForm(false)
    setInitialTitle('')
  }

  const handleSubmitted = (message: string) => {
    setFormSuccess(message)
    setShowWriteForm(false)
    setInitialTitle('')
  }

  return (
    <div>
      <PageHeader
        title="커뮤니티"
        icon="🎭"
        description="기록, 대회, 훈련 이야기가 모이는 곳"
        actions={
          <button type="button" onClick={handleToggleWriteForm} className="btn-primary">
            <PlusIcon className="h-5 w-5" />
            <span className="ml-1 hidden sm:inline">글쓰기</span>
          </button>
        }
      />

      <section className="card mb-4">
        <div className="card-body">
          <p className="text-sm font-semibold text-primary-600">러너들의 이야기</p>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">기록 이야기부터 가볍게</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            대회 후기, 훈련 루틴, 장비 사용감처럼 실제로 뛰는 사람들이 바로 남길 수 있는 이야기만 앞에 둡니다.
            닉네임은 선택이고, 삭제용 비밀번호만 있으면 익명으로 정리할 수 있어요.
          </p>
        </div>
      </section>

      {recordContext ? (
        <RecordContextPrompt recordContext={recordContext} onStart={handleStartRecordDiscussion} />
      ) : null}

      <div className="mb-4 flex justify-end">
        <div className="flex gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortBy(option.key)}
              className={`sort-pill ${sortBy === option.key ? 'sort-pill-active' : 'sort-pill-inactive'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {formSuccess && (
        <div className="mb-4 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-success-700">
          {formSuccess}
        </div>
      )}

      {showWriteForm && (
        <CommunityQuickPostForm
          initialTitle={initialTitle}
          onCancel={handleCancelWrite}
          onSubmitted={handleSubmitted}
        />
      )}

      <PostList sort={sortBy} page={page} limit={limit} />

      <div className="mt-6">
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>

      <div className="h-20 md:hidden" />
    </div>
  )
}
