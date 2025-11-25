import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PostList from '../components/post/PostList'
import Pagination from '../components/common/Pagination'
import { PlusIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useCreatePost, usePosts } from '../hooks/usePosts'
import { getAnonymousId } from '../utils/anonymousUser'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page')) || 1
  const limit = 20
  
  // 게시글 목록 조회 (count 포함)
  const { data: postsData, isLoading, refetch } = usePosts({ page, limit })
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    author: '',
    password: '',
    hasImage: false,
    hasPoll: false,
  })
  const [sortBy, setSortBy] = useState<'latest' | 'hot' | 'comment'>('latest')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // 게시글 작성 mutation
  const createPostMutation = useCreatePost()
  const isSubmitting = createPostMutation.isPending

  const handleToggleWriteForm = () => {
    setShowWriteForm((prev) => !prev)
    setFormError(null)
    setFormSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!newPost.content.trim()) {
      setFormError('내용을 입력해주세요.')
      return
    }

    if (!newPost.password.trim()) {
      setFormError('삭제용 비밀번호를 입력해주세요.')
      return
    }

    try {
      await createPostMutation.mutateAsync({
        data: {
          title: newPost.title.trim() || '제목 없음',
          content: newPost.content.trim(),
          author: newPost.author.trim() || '익명',
          password: newPost.password.trim(),
          category: '자유',
          anonymousId: getAnonymousId(),
        },
        images: [],
      })

      setFormSuccess('게시글이 등록됐어요!')
      setNewPost({ title: '', content: '', author: '', password: '', hasImage: false, hasPoll: false })
      setShowWriteForm(false)
      refetch()
    } catch (error: unknown) {
      console.error(error)
      setFormError('게시글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  // 총 페이지 수 계산
  const totalPages = postsData?.count ? Math.ceil(postsData.count / limit) : 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* 익명게시판 헤더 */}
      <div className="bg-dark-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              🎭 익명게시판
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              자유롭게 이야기를 나누는 공간
            </p>
          </div>
          
          {/* 글쓰기 버튼 - 모바일 최적화 */}
          <button
            onClick={handleToggleWriteForm}
            className="flex items-center gap-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">글쓰기</span>
          </button>
        </div>

        {/* 정렬 옵션 */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'latest' 
                ? 'bg-primary-600 text-white' 
                : 'bg-dark-600 text-gray-400 hover:text-white'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy('hot')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'hot' 
                ? 'bg-primary-600 text-white' 
                : 'bg-dark-600 text-gray-400 hover:text-white'
            }`}
          >
            🔥 인기순
          </button>
          <button
            onClick={() => setSortBy('comment')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'comment' 
                ? 'bg-primary-600 text-white' 
                : 'bg-dark-600 text-gray-400 hover:text-white'
            }`}
          >
            💬 댓글순
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="bg-green-600/10 border border-green-500/40 text-green-200 rounded-lg px-4 py-3 mb-4">
          {formSuccess}
        </div>
      )}

      {/* 빠른 글쓰기 폼 */}
      {showWriteForm && (
        <div className="bg-dark-700 rounded-lg p-4 mb-4 animate-fadeIn">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="제목을 입력하세요 (선택)"
              value={newPost.title}
              onChange={(e) => setNewPost({...newPost, title: e.target.value})}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
            <textarea
              placeholder="내용을 입력하세요..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
              rows={4}
              required
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="닉네임 (선택)"
                value={newPost.author}
                onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
              <input
                type="password"
                placeholder="삭제용 비밀번호 (필수)"
                value={newPost.password}
                onChange={(e) => setNewPost({ ...newPost, password: e.target.value })}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                required
              />
            </div>

            {/* 옵션 버튼들 */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPost({...newPost, hasImage: !newPost.hasImage})}
                  className={`p-2 rounded-lg transition-colors ${
                    newPost.hasImage ? 'bg-primary-600 text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
                  }`}
                >
                  <PhotoIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setNewPost({...newPost, hasPoll: !newPost.hasPoll})}
                  className={`p-2 rounded-lg transition-colors ${
                    newPost.hasPoll ? 'bg-primary-600 text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
                  }`}
                >
                  📊
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWriteForm(false)
                    setFormError(null)
                  }}
                  className="px-4 py-2 text-sm bg-dark-600 text-gray-300 rounded-lg hover:bg-dark-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '작성 중...' : '익명으로 작성'}
                </button>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
            
            {/* 이미지 업로드 영역 */}
            {newPost.hasImage && (
              <div className="border-2 border-dashed border-dark-500 rounded-lg p-4 text-center">
                <PhotoIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                <p className="text-xs text-gray-500">클릭하여 이미지 업로드</p>
              </div>
            )}
            
            {/* 투표 만들기 */}
            {newPost.hasPoll && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="투표 질문"
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 text-sm"
                />
                <input
                  type="text"
                  placeholder="선택지 1"
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 text-sm"
                />
                <input
                  type="text"
                  placeholder="선택지 2"
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 text-sm"
                />
              </div>
            )}
          </form>
        </div>
      )}

      {/* 실시간 인기 태그 */}
      <div className="bg-dark-700 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">🔥 실시간:</span>
          {['서울마라톤', '100m', '훈련일지', '신발추천', '부상', '식단'].map((tag) => (
            <button
              key={tag}
              className="px-2 py-1 text-xs bg-dark-600 text-gray-300 rounded-full hover:bg-primary-600 hover:text-white transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 게시글 목록 */}
      <PostList posts={postsData?.posts} isLoading={isLoading} />

      {/* 페이지네이션 */}
      <div className="mt-6">
        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
        />
      </div>
      
      {/* 모바일 하단 여백 */}
      <div className="h-20 md:hidden"></div>
    </div>
  )
}
