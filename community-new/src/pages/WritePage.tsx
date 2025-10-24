import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClockIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { useCreatePost } from '../hooks/usePosts'

export default function WritePage() {
  const navigate = useNavigate()
  const createPost = useCreatePost()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('track-sprint')
  const [eventType, setEventType] = useState('')
  const [record, setRecord] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [isOfficial, setIsOfficial] = useState(false)
  const [author, setAuthor] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const isSubmitting = createPost.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!password.trim()) {
      setSubmitError('삭제용 비밀번호를 입력해주세요.')
      return
    }

    try {
      await createPost.mutateAsync({
        title: title.trim() || '제목 없음',
        content: content.trim(),
        author: author.trim() || '익명',
        password: password.trim(),
        category,
      })

      setSubmitSuccess('게시글이 등록됐어요! 잠시 후 메인으로 이동합니다.')
      setTitle('')
      setContent('')
      setCategory('track-sprint')
      setEventType('')
      setRecord('')
      setRecordDate('')
      setIsOfficial(false)
      setAuthor('')
      setPassword('')

      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (error) {
      console.error(error)
      setSubmitError('게시글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  // 종목별 이벤트 목록
  const eventsByCategory: { [key: string]: string[] } = {
    'track-sprint': ['100m', '200m', '400m', '4x100m 릴레이'],
    'track-middle': ['800m', '1500m', '3000m'],
    'track-distance': ['5000m', '10000m', '3000m 장애물'],
    'track-hurdles': ['110m 허들', '100m 허들', '400m 허들'],
    'field-jumps': ['높이뛰기', '멀리뛰기', '세단뛰기', '장대높이뛰기'],
    'field-throws': ['포환던지기', '원반던지기', '창던지기', '해머던지기'],
    'running-marathon': ['풀코스', '하프', '10K', '5K'],
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-dark">
        <div className="p-6 border-b border-dark-500">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-primary-400" />
            <span>게시글 작성</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 카테고리 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                게시판 선택
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setEventType('') // 카테고리 변경시 종목 초기화
                }}
                className="input-dark"
              >
                <optgroup label="🏃 육상 (Track & Field)">
                  <option value="track-sprint">단거리 (Sprint)</option>
                  <option value="track-middle">중거리</option>
                  <option value="track-distance">장거리</option>
                  <option value="track-hurdles">허들</option>
                  <option value="field-jumps">도약 (점프)</option>
                  <option value="field-throws">투척</option>
                </optgroup>
                <optgroup label="👟 러닝">
                  <option value="running-marathon">마라톤/로드</option>
                  <option value="running-trail">트레일러닝</option>
                  <option value="running-crew">러닝크루</option>
                </optgroup>
                <optgroup label="🏆 대회/이벤트">
                  <option value="events-schedule">대회 정보</option>
                  <option value="events-review">대회 후기</option>
                  <option value="events-recruit">참가 모집</option>
                </optgroup>
                <optgroup label="📊 기록/훈련">
                  <option value="records-personal">내 기록</option>
                  <option value="training-log">훈련일지</option>
                </optgroup>
                <optgroup label="💬 커뮤니티">
                  <option value="community-free">자유게시판</option>
                  <option value="community-qna">질문/답변</option>
                  <option value="community-proof">인증/자랑</option>
                </optgroup>
              </select>
            </div>

            {/* 종목 선택 (육상/러닝 카테고리일 때만) */}
            {eventsByCategory[category] && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  종목 선택
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="input-dark"
                >
                  <option value="">종목 선택...</option>
                  {eventsByCategory[category].map(event => (
                    <option key={event} value={event}>{event}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                작성자 닉네임 (선택)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                삭제용 비밀번호 <span className="text-primary-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="게시글 삭제 시 필요한 비밀번호"
                className="input-dark"
                required
              />
              <p className="mt-1 text-xs text-gray-500">※ 비밀번호는 잊지 않도록 주의해주세요.</p>
            </div>
          </div>

          {/* 기록 입력 (육상/러닝 카테고리일 때만) */}
          {(category.includes('track') || category.includes('field') || category.includes('running')) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <TrophyIcon className="w-4 h-4 inline mr-1" />
                  기록
                </label>
                <input
                  type="text"
                  value={record}
                  onChange={(e) => setRecord(e.target.value)}
                  placeholder="예: 10.23, 2:15:30"
                  className="input-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  기록 날짜
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="input-dark"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOfficial}
                    onChange={(e) => setIsOfficial(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-500 bg-dark-700 border-dark-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-300">공식 기록</span>
                </label>
              </div>
            </div>
          )}

          {/* 제목 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="input-dark"
              required
            />
          </div>

          {/* 내용 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              내용
            </label>
            
            {/* 에디터 툴바 */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-dark-700 border border-dark-500 border-b-0 rounded-t-lg">
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm font-bold">B</span>
              </button>
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm italic">I</span>
              </button>
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm underline">U</span>
              </button>
              <div className="w-px h-6 bg-dark-500 mx-1" />
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm">🔗</span>
              </button>
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm">🖼️</span>
              </button>
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm">📹</span>
              </button>
              <div className="w-px h-6 bg-dark-500 mx-1" />
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm">⏱️</span>
              </button>
              <button type="button" className="p-2 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
                <span className="text-sm">🏃</span>
              </button>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요... (훈련 내용, 대회 후기, 기록 분석 등)"
              className="w-full px-4 py-3 bg-dark-700 border border-dark-500 border-t-0 rounded-b-lg text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500"
              rows={15}
              required
            />
          </div>

          {/* 파일 첨부 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              파일 첨부 (사진, 동영상, GPS 데이터 등)
            </label>
            <div className="border-2 border-dashed border-dark-500 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl text-gray-500">📁</span>
                <p className="text-sm text-gray-400">
                  클릭하거나 파일을 드래그하여 업로드
                </p>
                <p className="text-xs text-gray-500">
                  최대 10MB, JPG/PNG/GIF/MP4/GPX 지원
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.gpx"
                  multiple
                />
              </div>
            </div>
          </div>

          {/* 옵션 설정 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowComments"
                defaultChecked
                className="w-4 h-4 rounded text-primary-500 bg-dark-700 border-dark-500 focus:ring-primary-500"
              />
              <label htmlFor="allowComments" className="text-sm text-gray-300">
                댓글 허용
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shareRecord"
                defaultChecked
                className="w-4 h-4 rounded text-primary-500 bg-dark-700 border-dark-500 focus:ring-primary-500"
              />
              <label htmlFor="shareRecord" className="text-sm text-gray-300">
                기록 공개 (랭킹 반영)
              </label>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          {submitSuccess && <p className="text-sm text-green-400">{submitSuccess}</p>}

          {/* 버튼 영역 */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              취소
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
              >
                임시저장
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '작성 중...' : '게시글 작성'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 작성 가이드 */}
      <div className="mt-4 card-dark p-4">
        <h3 className="text-sm font-bold text-white mb-2">📝 게시글 작성 가이드</h3>
        <ul className="space-y-1 text-xs text-gray-400">
          <li>• 정확한 기록과 날짜를 입력하면 랭킹에 자동 반영됩니다.</li>
          <li>• 훈련 일지는 상세할수록 다른 선수들에게 도움이 됩니다.</li>
          <li>• 대회 후기는 사진과 함께 작성하면 더 생생합니다.</li>
          <li>• 부정확하거나 허위 기록은 제재 대상이 될 수 있습니다.</li>
          <li>• 서로 격려하고 응원하는 건전한 커뮤니티 문화를 만들어주세요.</li>
        </ul>
      </div>
    </div>
  )
}