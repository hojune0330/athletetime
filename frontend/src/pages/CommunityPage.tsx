import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import PostList from '../components/post/PostList'
import Pagination from '../components/common/Pagination'
import { PlusIcon, PhotoIcon, ChartBarIcon, MegaphoneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useCreatePost, usePosts } from '../hooks/usePosts'
import { getAnonymousId } from '../utils/anonymousUser'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'

// 허용된 이미지 타입
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function CommunityPage() {
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page')) || 1
  const limit = 20
  
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  // 관리자 여부 확인
  const isAdmin = user?.isAdmin || false
  
  const [sortBy, setSortBy] = useState<'latest' | 'hot' | 'comment'>('latest')
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    author: '',
    password: '',
    hasImage: false,
    hasPoll: false,
    isNotice: false,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  
  // 이미지 업로드 관련 상태
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 투표 관련 상태
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']) // 최소 2개
  
  // 페이지네이션을 위한 데이터 조회
  const { data: postsData } = usePosts({ page, limit, sort: sortBy })

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

    // 투표 데이터 준비 (hasPoll이 true이고 질문과 최소 2개 선택지가 있을 때만)
    const validPollOptions = pollOptions.filter(opt => opt.trim())
    const pollData = newPost.hasPoll && pollQuestion.trim() && validPollOptions.length >= 2
      ? { question: pollQuestion.trim(), options: validPollOptions }
      : undefined

    try {
      await createPostMutation.mutateAsync({
        data: {
          title: newPost.title.trim() || '제목 없음',
          content: newPost.content.trim(),
          author: newPost.author.trim() || '익명',
          password: newPost.password.trim(),
          category: '자유',
          anonymousId: getAnonymousId(),
          isNotice: isAdmin && newPost.isNotice,
          poll: pollData,
        },
        images: selectedImages,
      })

      setFormSuccess(newPost.isNotice ? '공지사항이 등록됐어요!' : '게시글이 등록됐어요!')
      setNewPost({ title: '', content: '', author: '', password: '', hasImage: false, hasPoll: false, isNotice: false })
      // 이미지 상태 초기화
      setSelectedImages([])
      setImagePreviews([])
      setImageError(null)
      // 투표 상태 초기화
      setPollQuestion('')
      setPollOptions(['', ''])
      setShowWriteForm(false)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    } catch (error: unknown) {
      console.error(error)
      setFormError('게시글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const totalPages = postsData?.count ? Math.ceil(postsData.count / limit) : 1

  return (
    <div className="max-w-4xl mx-auto">
      {/* 익명게시판 헤더 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                🎭 익명게시판
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                자유롭게 이야기를 나누는 공간
              </p>
            </div>
            
            {/* 글쓰기 버튼 */}
            <button
              onClick={handleToggleWriteForm}
              className="btn-primary"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline ml-1">글쓰기</span>
            </button>
          </div>

          {/* 정렬 옵션 (Pills) */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('latest')}
              className={`sort-pill ${sortBy === 'latest' ? 'sort-pill-active' : 'sort-pill-inactive'}`}
            >
              최신순
            </button>
            <button
              onClick={() => setSortBy('hot')}
              className={`sort-pill ${sortBy === 'hot' ? 'sort-pill-active' : 'sort-pill-inactive'}`}
            >
              🔥 인기순
            </button>
            <button
              onClick={() => setSortBy('comment')}
              className={`sort-pill ${sortBy === 'comment' ? 'sort-pill-active' : 'sort-pill-inactive'}`}
            >
              💬 댓글순
            </button>
          </div>
        </div>
      </div>

      {/* 성공 메시지 */}
      {formSuccess && (
        <div className="bg-success-50 border border-success-200 text-success-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-fadeIn">
          <span className="text-lg">✅</span>
          {formSuccess}
        </div>
      )}

      {/* 빠른 글쓰기 폼 */}
      {showWriteForm && (
        <div className="card mb-4 animate-fadeInUp">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="제목을 입력하세요 (선택)"
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="input"
              />
              <textarea
                placeholder="내용을 입력하세요..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="textarea"
                rows={4}
                required
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="닉네임 (선택)"
                  value={newPost.author}
                  onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
                  className="input"
                />
                <input
                  type="password"
                  placeholder="삭제용 비밀번호 (필수)"
                  value={newPost.password}
                  onChange={(e) => setNewPost({ ...newPost, password: e.target.value })}
                  className="input"
                  required
                />
              </div>

              {/* 관리자 전용: 공지사항 체크박스 */}
              {isAdmin && (
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPost.isNotice}
                      onChange={(e) => setNewPost({...newPost, isNotice: e.target.checked})}
                      className="w-5 h-5 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-2">
                      <MegaphoneIcon className="w-5 h-5 text-primary-600" />
                      <span className="font-medium text-primary-700">공지사항으로 등록</span>
                    </div>
                  </label>
                  <p className="mt-1 text-xs text-primary-600 ml-8">
                    공지사항은 게시판 목록 상단에 고정됩니다.
                  </p>
                </div>
              )}

              {/* 옵션 버튼들 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPost({...newPost, hasImage: !newPost.hasImage})}
                    className={`p-2.5 rounded-lg transition-colors ${
                      newPost.hasImage 
                        ? 'bg-primary-100 text-primary-600' 
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                  >
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPost({...newPost, hasPoll: !newPost.hasPoll})}
                    className={`p-2.5 rounded-lg transition-colors ${
                      newPost.hasPoll 
                        ? 'bg-primary-100 text-primary-600' 
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                  >
                    <ChartBarIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWriteForm(false)
                      setFormError(null)
                    }}
                    className="btn-secondary"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '작성 중...' : '익명으로 작성'}
                  </button>
                </div>
              </div>

              {/* 에러 메시지 */}
              {formError && (
                <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">
                  <span>⚠️</span>
                  {formError}
                </div>
              )}
              
              {/* 이미지 업로드 영역 */}
              {newPost.hasImage && (
                <div className="space-y-3">
                  {/* 이미지 에러 메시지 */}
                  {imageError && (
                    <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">
                      <span>⚠️</span>
                      {imageError}
                    </div>
                  )}
                  
                  {/* 숨겨진 파일 입력 */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setImageError(null)
                      
                      // 파일 개수 제한 (최대 5개)
                      if (selectedImages.length + files.length > 5) {
                        setImageError('이미지는 최대 5개까지 업로드할 수 있습니다.')
                        return
                      }
                      
                      // 파일 유효성 검사
                      for (const file of files) {
                        // 파일 타입 검사
                        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                          setImageError('JPG, PNG, GIF 파일만 업로드할 수 있습니다.')
                          return
                        }
                        // 파일 크기 검사 (5MB)
                        if (file.size > MAX_FILE_SIZE) {
                          setImageError(`파일 크기는 5MB를 초과할 수 없습니다. (${file.name})`)
                          return
                        }
                      }
                      
                      // 파일 추가 및 미리보기 생성
                      const newPreviews: string[] = []
                      files.forEach((file) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          newPreviews.push(reader.result as string)
                          if (newPreviews.length === files.length) {
                            setImagePreviews(prev => [...prev, ...newPreviews])
                          }
                        }
                        reader.readAsDataURL(file)
                      })
                      setSelectedImages(prev => [...prev, ...files])
                      
                      // 입력 초기화 (같은 파일 다시 선택 가능하도록)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  
                  {/* 업로드 버튼 영역 */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-primary-300 transition-colors cursor-pointer"
                  >
                    <PhotoIcon className="w-10 h-10 mx-auto text-neutral-400 mb-2" />
                    <p className="text-sm text-neutral-500">클릭하여 이미지 업로드</p>
                    <p className="text-xs text-neutral-400 mt-1">최대 5MB, JPG/PNG/GIF (최대 5개)</p>
                    {selectedImages.length > 0 && (
                      <p className="text-xs text-primary-600 mt-1 font-medium">
                        {selectedImages.length}/5개 선택됨
                      </p>
                    )}
                  </div>
                  
                  {/* 이미지 미리보기 */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img
                            src={preview}
                            alt={`미리보기 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-neutral-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImages(prev => prev.filter((_, i) => i !== index))
                              setImagePreviews(prev => prev.filter((_, i) => i !== index))
                              setImageError(null)
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-danger-600"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* 투표 만들기 */}
              {newPost.hasPoll && (
                <div className="space-y-3 p-4 bg-neutral-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700">📊 투표 만들기</p>
                    <span className="text-xs text-neutral-400">{pollOptions.length}/5개 선택지</span>
                  </div>
                  <input
                    type="text"
                    placeholder="투표 질문"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="input"
                  />
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`선택지 ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions]
                          newOptions[index] = e.target.value
                          setPollOptions(newOptions)
                        }}
                        className="input flex-1"
                      />
                      {/* 최소 2개는 유지, 3개 이상일 때만 삭제 가능 */}
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPollOptions(prev => prev.filter((_, i) => i !== index))
                          }}
                          className="p-2.5 rounded-lg bg-danger-50 text-danger-500 hover:bg-danger-100 transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* 최대 5개까지 추가 가능 */}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(prev => [...prev, ''])}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + 선택지 추가
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 실시간 인기 태그 */}
      {/* <div className="card mb-4">
        <div className="card-body py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-neutral-500">🔥 실시간:</span>
            {['서울마라톤', '100m', '훈련일지', '신발추천', '부상', '식단'].map((tag) => (
              <button
                key={tag}
                className="px-3 py-1 text-xs bg-neutral-100 text-neutral-600 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div> */}

      {/* 게시글 목록 */}
      <PostList sort={sortBy} page={page} limit={limit} />

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
