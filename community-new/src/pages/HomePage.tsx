import { Link, useSearchParams } from 'react-router-dom'
import PostList from '../components/post/PostList'

const sortTabs = [
  { value: 'popular', label: '인기', emoji: '👍' },
  { value: 'latest', label: '전체' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
]

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const sort = searchParams.get('sort') || 'popular'

  return (
    <div className="space-y-4">
      {/* 상단 탭 */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {sort === 'popular' ? '최~~~~고로 인기!' : '전체 게시글'}
          </h2>
          <div className="flex gap-1">
            {sortTabs.map((tab) => (
              <Link
                key={tab.value}
                to={`/?sort=${tab.value}`}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  sort === tab.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.emoji} {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 공지사항 */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-yellow-800">필독</span>
          </div>
          <Link to="/post/notice-1" className="block hover:bg-yellow-100 p-2 -m-2 rounded transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">커뮤니티 이용 규칙 안내</span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>85</span>
                <span>203</span>
              </div>
            </div>
          </Link>
        </div>

        {/* 게시글 목록 */}
        <PostList />
      </div>
    </div>
  )
}