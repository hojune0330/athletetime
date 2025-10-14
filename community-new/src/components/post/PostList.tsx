import { Link } from 'react-router-dom'
import { ChatBubbleLeftIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline'

// Mock data
const posts = [
  {
    id: '1',
    category: '유머',
    title: '뇌정지오는 동서양 역사',
    author: '굳센 매력11 장억',
    views: 567,
    comments: 13,
    likes: 7,
    createdAt: '1일전',
    hasImage: false,
  },
  {
    id: '2',
    category: '유머',
    title: '여자들도 잘생긴 남자는 불편해 함',
    author: '깐깐한 매력55 맹절',
    views: 815,
    comments: 11,
    likes: 13,
    createdAt: '23시간전',
    hasImage: true,
  },
  {
    id: '3',
    category: '인방',
    title: '고3 10월 모의고사에 주펄 등장ㄷㄷ',
    author: '침교동세개5트만에나온사람',
    views: 537,
    comments: 17,
    likes: 3,
    createdAt: '5시간전',
    hasImage: true,
  },
  {
    id: '4',
    category: '유머',
    title: '정일영 선생님을 닮으신 만학도',
    author: '덤덤한 매력9 공손연',
    views: 469,
    comments: 10,
    likes: 8,
    createdAt: '7시간전',
    hasImage: false,
  },
  {
    id: '5',
    category: '침착맨',
    title: '침착맨 교토 여행사진 4장',
    author: '섹시한 정치력32 학소',
    views: 1667,
    comments: 42,
    likes: 21,
    createdAt: '6시간전',
    hasImage: true,
  },
]

export default function PostList() {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full">
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/post/${post.id}`} className="block">
                    <div className="flex items-start gap-3">
                      <span className="badge-category">
                        {post.category}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {post.title}
                          </span>
                          {post.hasImage && <PhotoIcon className="w-4 h-4 text-blue-500" />}
                          {post.comments > 0 && (
                            <span className="text-xs text-orange-500 font-medium">
                              {post.comments}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{post.author}</span>
                          <span>{post.views} 조회</span>
                          <span>{post.createdAt}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-orange-500">
                          {post.likes}
                        </div>
                      </div>
                    </div>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-100">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="block p-4 hover:bg-gray-50"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="badge-category">
                {post.category}
              </span>
              {post.hasImage && <PhotoIcon className="w-4 h-4 text-blue-500" />}
            </div>
            <h3 className="font-medium text-gray-900 mb-2">{post.title}</h3>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span>{post.author}</span>
                <span>{post.createdAt}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-3 h-3" />
                  {post.views}
                </span>
                <span className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-3 h-3" />
                  {post.comments}
                </span>
                <span className="text-orange-500 font-medium">{post.likes}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center p-4">
        <nav className="flex gap-1">
          <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded">
            이전
          </button>
          <button className="px-3 py-1 text-sm bg-gray-900 text-white rounded">
            1
          </button>
          <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">
            2
          </button>
          <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">
            3
          </button>
          <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded">
            다음
          </button>
        </nav>
      </div>
    </>
  )
}