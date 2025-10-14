import { useParams } from 'react-router-dom'
import { HandThumbUpIcon, HandThumbDownIcon, ShareIcon, BookmarkIcon } from '@heroicons/react/24/outline'

export default function PostDetailPage() {
  const { postId } = useParams()
  console.log('Post ID:', postId) // Use postId to prevent warning

  return (
    <div className="space-y-4">
      <div className="card">
        {/* Post Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-category">유머</span>
            <span className="text-xs text-gray-500">2024.10.14 15:30</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            침착맨 교토 여행사진 4장
          </h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">섹시한 정치력32 학소</span>
              <span>조회 1,667</span>
              <span>댓글 42</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                <ShareIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                <BookmarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-6 prose prose-gray max-w-none">
          <p>교토 여행 다녀왔습니다.</p>
          <p>사진 공유합니다~</p>
          <img src="https://via.placeholder.com/600x400" alt="교토 사진 1" className="rounded-lg" />
          <img src="https://via.placeholder.com/600x400" alt="교토 사진 2" className="rounded-lg" />
          <img src="https://via.placeholder.com/600x400" alt="교토 사진 3" className="rounded-lg" />
          <img src="https://via.placeholder.com/600x400" alt="교토 사진 4" className="rounded-lg" />
        </div>

        {/* Post Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              <HandThumbUpIcon className="w-5 h-5" />
              <span>추천 21</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <HandThumbDownIcon className="w-5 h-5" />
              <span>비추 2</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          댓글 <span className="text-orange-500">42</span>
        </h3>
        
        {/* Comment Input */}
        <div className="mb-6">
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder="댓글을 입력하세요..."
          />
          <div className="flex justify-end mt-2">
            <button className="btn-primary">댓글 작성</button>
          </div>
        </div>

        {/* Comment List */}
        <div className="space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-medium text-gray-900">평민콩탄맨</span>
                <span className="ml-2 text-xs text-gray-500">5시간전</span>
              </div>
              <button className="text-xs text-gray-500 hover:text-gray-700">신고</button>
            </div>
            <p className="text-gray-700">와 진짜 예쁘네요! 저도 가보고 싶어요</p>
            <div className="flex items-center gap-4 mt-2">
              <button className="text-xs text-gray-500 hover:text-gray-700">답글</button>
              <button className="text-xs text-gray-500 hover:text-gray-700">👍 5</button>
            </div>
          </div>

          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-medium text-gray-900">깐깐한 통솔력6 장집</span>
                <span className="ml-2 text-xs text-gray-500">11시간전</span>
              </div>
              <button className="text-xs text-gray-500 hover:text-gray-700">신고</button>
            </div>
            <p className="text-gray-700">사진 퀄리티 좋네요 ㅋㅋ</p>
            <div className="flex items-center gap-4 mt-2">
              <button className="text-xs text-gray-500 hover:text-gray-700">답글</button>
              <button className="text-xs text-gray-500 hover:text-gray-700">👍 3</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}