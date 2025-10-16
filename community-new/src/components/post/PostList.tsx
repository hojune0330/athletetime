import { Link } from 'react-router-dom'
import { 
  EyeIcon, 
  HandThumbUpIcon,
  FireIcon
} from '@heroicons/react/24/outline'

interface Post {
  id: string
  title: string
  category: string
  categoryColor: string
  categoryIcon?: string
  author: string
  authorLevel?: string // 선수 레벨 (아마추어, 엘리트 등)
  time: string
  views: number
  likes: number
  comments: number
  thumbnail?: string
  isHot?: boolean
  isNew?: boolean
  isPinned?: boolean
  eventType?: string // 종목 (100m, 마라톤 등)
  record?: string // 기록
}

export default function PostList() {
  // 육상 관련 샘플 데이터
  const posts: Post[] = [
    {
      id: '1',
      title: '드디어 100m 10초대 진입! 10.98초 인증',
      category: '단거리',
      categoryColor: 'text-event-sprint',
      categoryIcon: '💨',
      eventType: '100m',
      record: '10.98',
      author: '스프린터김',
      authorLevel: '엘리트',
      time: '10분 전',
      views: 234,
      likes: 45,
      comments: 12,
      thumbnail: 'https://via.placeholder.com/120x80/1e40af/60a5fa?text=100m',
      isHot: true,
    },
    {
      id: '2',
      title: '서울마라톤 서브3 달성 후기 (2:58:34)',
      category: '마라톤',
      categoryColor: 'text-event-distance',
      categoryIcon: '🏃',
      eventType: '풀코스',
      record: '2:58:34',
      author: '러너하트',
      authorLevel: '아마추어',
      time: '1시간 전',
      views: 567,
      likes: 89,
      comments: 34,
      thumbnail: 'https://via.placeholder.com/120x80/3b82f6/93c5fd?text=Marathon',
      isHot: true,
    },
    {
      id: '3',
      title: '높이뛰기 2m 20cm 도전기 - 기술 분석 포함',
      category: '도약',
      categoryColor: 'text-event-field',
      categoryIcon: '🦘',
      eventType: '높이뛰기',
      record: '2.20m',
      author: '점퍼리',
      time: '2시간 전',
      views: 156,
      likes: 23,
      comments: 8,
      thumbnail: 'https://via.placeholder.com/120x80/10b981/6ee7b7?text=High+Jump',
      isNew: true,
    },
    {
      id: '4',
      title: '전국체전 D-30, 400m 훈련 일지 공유',
      category: '중거리',
      categoryColor: 'text-event-middle',
      categoryIcon: '🏃‍♂️',
      eventType: '400m',
      author: '중거리왕',
      authorLevel: '대학선수',
      time: '3시간 전',
      views: 234,
      likes: 34,
      comments: 15,
      isPinned: true,
    },
    {
      id: '5',
      title: '110m 허들 13초대 돌파 훈련법',
      category: '허들',
      categoryColor: 'text-event-hurdles',
      categoryIcon: '🚧',
      eventType: '110mH',
      record: '13.89',
      author: '허들마스터',
      time: '5시간 전',
      views: 189,
      likes: 28,
      comments: 9,
    },
    {
      id: '6',
      title: '창던지기 70m 목표! 현재 65m 기록',
      category: '투척',
      categoryColor: 'text-event-throws',
      categoryIcon: '🏹',
      eventType: '창던지기',
      record: '65.32m',
      author: '투척인',
      authorLevel: '실업팀',
      time: '6시간 전',
      views: 145,
      likes: 19,
      comments: 7,
      thumbnail: 'https://via.placeholder.com/120x80/6366f1/a5b4fc?text=Javelin',
    },
    {
      id: '7',
      title: '오늘 5000m 14분 30초 신기록! 페이스 분석',
      category: '장거리',
      categoryColor: 'text-event-distance',
      categoryIcon: '⏱️',
      eventType: '5000m',
      record: '14:30.21',
      author: '장거리러너',
      time: '8시간 전',
      views: 312,
      likes: 56,
      comments: 23,
      isHot: true,
    },
    {
      id: '8',
      title: '멀리뛰기 8m 도전 - 도약 각도 개선 중',
      category: '도약',
      categoryColor: 'text-event-field',
      categoryIcon: '🦘',
      eventType: '멀리뛰기',
      record: '7.65m',
      author: '롱점퍼',
      time: '10시간 전',
      views: 198,
      likes: 31,
      comments: 11,
    }
  ]

  return (
    <div className="space-y-0.5">
      {posts.map((post) => (
        <Link
          key={post.id}
          to={`/post/${post.id}`}
          className="block"
        >
          <article className="card-dark hover:bg-dark-500 transition-all duration-200 p-4 border-l-4 hover:border-l-primary-400 border-l-transparent">
            <div className="flex gap-4">
              {/* 썸네일 */}
              {post.thumbnail && (
                <div className="shrink-0">
                  <img 
                    src={post.thumbnail} 
                    alt={post.title}
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {/* 게시글 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {/* 고정 게시글 */}
                      {post.isPinned && (
                        <span className="text-track-yellow text-sm">📌</span>
                      )}
                      
                      {/* 카테고리 */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-dark-700 ${post.categoryColor}`}>
                        <span>{post.categoryIcon}</span>
                        <span>{post.category}</span>
                      </span>
                      
                      {/* 종목 & 기록 */}
                      {post.eventType && (
                        <span className="text-xs text-gray-500">
                          {post.eventType}
                        </span>
                      )}
                      {post.record && (
                        <span className="time-display text-sm">
                          {post.record}
                        </span>
                      )}
                      
                      {/* 뱃지 */}
                      {post.isHot && (
                        <span className="badge-hot">
                          <FireIcon className="w-3 h-3 mr-1" />
                          HOT
                        </span>
                      )}
                      {post.isNew && (
                        <span className="badge-new">NEW</span>
                      )}
                    </div>
                    
                    {/* 제목 */}
                    <h3 className="text-base font-medium text-gray-100 hover:text-primary-400 transition-colors line-clamp-1">
                      {post.title}
                    </h3>
                  </div>
                </div>
                
                {/* 메타 정보 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      {post.authorLevel && (
                        <span className="px-1.5 py-0.5 rounded bg-primary-900/30 text-primary-400 text-xs">
                          {post.authorLevel}
                        </span>
                      )}
                      <span className="text-gray-400">{post.author}</span>
                    </span>
                    <span>{post.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {post.views}
                    </span>
                    <span className="flex items-center gap-1 text-primary-400">
                      <HandThumbUpIcon className="w-3.5 h-3.5" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>💬</span>
                      {post.comments}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}