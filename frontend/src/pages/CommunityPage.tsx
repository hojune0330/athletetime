/**
 * 커뮤니티 페이지 (v2.0.0 - 침하하 스타일 구조)
 *
 * 구조: 헤더 → 인기글 스트립(전체/주간/월간/명예의 전당) →
 * 게시판 탭(전체글/자유/훈련/대회/장비/질문/공지) → 정렬 → 밀도 높은 리스트
 */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import Pagination from '../components/common/Pagination'
import { CommunityBestStrip } from '../components/community/CommunityBestStrip'
import { CommunityMagazineShelf } from '../components/community/CommunityMagazineShelf'
import { CommunityBoardTabs, type BoardTab } from '../components/community/CommunityBoardTabs'
import { CommunityQuickPostForm } from '../components/community/CommunityQuickPostForm'
import { RecordContextPrompt } from '../components/community/RecordContextPrompt'
import PostList from '../components/post/PostList'
import { usePosts } from '../hooks/usePosts'

type SortKey = 'latest' | 'hot' | 'comment'

const sortOptions: readonly { readonly key: SortKey; readonly label: string }[] = [
  { key: 'latest', label: '최신' },
  { key: 'hot', label: '인기' },
  { key: 'comment', label: '댓글' },
]

function cleanRecordContext(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 40)
}

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page')) || 1
  const recordContext = cleanRecordContext(searchParams.get('record') || '')
  const limit = 20
  const [sortBy, setSortBy] = useState<SortKey>('latest')
  const [boardKey, setBoardKey] = useState('all')
  const [boardCategory, setBoardCategory] = useState<string | undefined>(undefined)
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [initialTitle, setInitialTitle] = useState('')
  const { data: postsData } = usePosts({ category: boardCategory, page, limit, sort: sortBy })
  const totalPages = postsData?.count ? Math.ceil(postsData.count / limit) : 1

  const handleSelectBoard = (tab: BoardTab) => {
    setBoardKey(tab.key)
    setBoardCategory(tab.category)
    // 게시판을 바꾸면 1페이지로 (record 컨텍스트는 유지)
    const next = new URLSearchParams(searchParams)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

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
      {/* 헤더: 타이틀 + 글쓰기 (침하하식 간결 헤더) */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">커뮤니티</h1>
          <p className="mt-1 text-sm text-neutral-500">
            기록 이야기부터 가볍게 — 대회 후기, 훈련 루틴, 장비 사용감이 모이는 곳
          </p>
        </div>
        <button type="button" onClick={handleToggleWriteForm} className="btn-primary shrink-0">
          <PencilSquareIcon className="h-5 w-5" />
          <span className="ml-1 hidden sm:inline">글쓰기</span>
        </button>
      </div>

      {recordContext ? (
        <RecordContextPrompt recordContext={recordContext} onStart={handleStartRecordDiscussion} />
      ) : null}

      <CommunityMagazineShelf />

      {/* 인기글 스트립 (전체 인기글 | 주간 | 월간 | 명예의 전당) */}
      <CommunityBestStrip />

      {/* 게시판 탭 (전체글 | 자유 | 훈련 | 대회 | 장비 | 질문 | 공지) */}
      <CommunityBoardTabs activeKey={boardKey} onSelect={handleSelectBoard} />

      {/* 정렬 */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          {postsData?.count ? `전체 ${postsData.count.toLocaleString()}개` : ''}
        </p>
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

      <PostList category={boardCategory} sort={sortBy} page={page} limit={limit} />

      <div className="mt-6">
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>

      <div className="h-20 md:hidden" />
    </div>
  )
}
