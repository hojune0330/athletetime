
import { useState } from 'react'
import { 
  HandThumbUpIcon,
  HandThumbDownIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  PhotoIcon,

  EyeIcon
} from '@heroicons/react/24/outline'
import { HandThumbUpIcon as HandThumbUpSolid } from '@heroicons/react/24/solid'

interface AnonymousPost {
  id: string
  title?: string
  content: string
  author: string // 익명 닉네임
  time: string
  views: number
  likes: number
  dislikes: number
  comments: number
  hasImage?: boolean
  hasPoll?: boolean
  pollData?: {
    question: string
    options: { text: string; votes: number }[]
    totalVotes: number
  }
  images?: string[]
  isHot?: boolean
  category?: string
}

interface AnonymousPostListProps {
  sortBy: 'latest' | 'hot' | 'comment'
}

export default function AnonymousPostList({ sortBy: _sortBy }: AnonymousPostListProps) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set())

  // 익명 게시글 샘플 데이터
  const posts: AnonymousPost[] = [
    {
      id: '1',
      title: '서울마라톤 완주했는데 이게 맞나요?',
      content: '3시간 58분에 완주했는데 서브4 실패... 30km부터 페이스 완전 망가짐 ㅠㅠ 다음엔 꼭 서브4 달성하고 싶은데 훈련 팁 있으신 분?',
      author: '익명의 러너',
      time: '방금 전',
      views: 45,
      likes: 12,
      dislikes: 0,
      comments: 8,
      isHot: true,
      category: '마라톤'
    },
    {
      id: '2',
      content: '투표) 러닝화 뭐가 더 좋음?',
      author: '익명의 선수',
      time: '5분 전',
      views: 234,
      likes: 23,
      dislikes: 2,
      comments: 15,
      hasPoll: true,
      pollData: {
        question: '러닝화 뭐가 더 좋음?',
        options: [
          { text: '나이키 베이퍼플라이3', votes: 156 },
          { text: '아디다스 아디오스프로3', votes: 98 },
          { text: '아식스 메타스피드', votes: 67 },
          { text: '기타', votes: 23 }
        ],
        totalVotes: 344
      }
    },
    {
      id: '3',
      title: '오늘 트랙 훈련 인증',
      content: '400m 8세트 완료! 평균 68초로 마무리. 마지막 세트는 진짜 죽는줄...',
      author: '익명의 스프린터',
      time: '10분 전',
      views: 156,
      likes: 45,
      dislikes: 1,
      comments: 12,
      hasImage: true,
      images: ['track1.jpg', 'track2.jpg'],
      category: '훈련일지'
    },
    {
      id: '4',
      content: '아니 국가대표 선발전 기준이 이게 맞나? 작년보다 기록 너무 높아진거 아님? 일반인은 꿈도 못꾸겠네',
      author: '익명의 도약선수',
      time: '30분 전',
      views: 567,
      likes: 89,
      dislikes: 12,
      comments: 43,
      isHot: true,
      category: '대회'
    },
    {
      id: '5',
      title: '중고) 스파이크 팝니다',
      content: '나이키 줌 슈퍼플라이 엘리트2 270mm 3회 착용 15만원에 판매합니다. 쪽지 주세요',
      author: '익명의 판매자',
      time: '1시간 전',
      views: 234,
      likes: 8,
      dislikes: 0,
      comments: 3,
      hasImage: true,
      category: '중고거래'
    },
    {
      id: '6',
      content: '햄스트링 부상 회복 중인데 이거 정상인가요? 2주째 아직도 당기는 느낌이...',
      author: '익명의 부상자',
      time: '2시간 전',
      views: 189,
      likes: 5,
      dislikes: 0,
      comments: 28,
      category: '부상/재활'
    },
    {
      id: '7',
      title: '대학 육상부 들어가고 싶은데',
      content: '고3인데 100m 11초 5 정도 나옵니다. 대학 육상부 들어갈 수 있을까요? 특기자 전형 준비중인데 불안하네요',
      author: '익명의 고3',
      time: '3시간 전',
      views: 456,
      likes: 34,
      dislikes: 1,
      comments: 52,
      category: '질문'
    }
  ]

  const handleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const handleVote = (postId: string, _optionIndex: number) => {
    setVotedPolls(prev => new Set(prev).add(postId))
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article key={post.id} className="bg-dark-700 rounded-lg overflow-hidden hover:bg-dark-600 transition-colors">
          <div className="p-4">
            {/* 카테고리 & 핫 배지 */}
            <div className="flex items-center gap-2 mb-2">
              {post.category && (
                <span className="text-xs px-2 py-0.5 bg-dark-600 text-gray-400 rounded">
                  {post.category}
                </span>
              )}
              {post.isHot && (
                <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded flex items-center gap-1">
                  🔥 HOT
                </span>
              )}
              {post.hasPoll && (
                <span className="text-xs px-2 py-0.5 bg-primary-600 text-white rounded">
                  📊 투표
                </span>
              )}
              {post.hasImage && (
                <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded">
                  🖼️ 사진
                </span>
              )}
            </div>

            {/* 제목 (있는 경우) */}
            {post.title && (
              <h3 className="font-medium text-white mb-2 text-base hover:text-primary-400 cursor-pointer">
                {post.title}
              </h3>
            )}

            {/* 본문 */}
            <p className="text-gray-300 text-sm mb-3 line-clamp-3">
              {post.content}
            </p>

            {/* 투표 (있는 경우) */}
            {post.hasPoll && post.pollData && (
              <div className="bg-dark-600 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-white mb-2">📊 {post.pollData.question}</p>
                <div className="space-y-2">
                  {post.pollData.options.map((option, index) => {
                    const percentage = Math.round((option.votes / post.pollData!.totalVotes) * 100)
                    const hasVoted = votedPolls.has(post.id)
                    
                    return (
                      <button
                        key={index}
                        onClick={() => !hasVoted && handleVote(post.id, index)}
                        className={`w-full text-left relative overflow-hidden rounded ${
                          hasVoted ? 'cursor-default' : 'hover:bg-dark-500'
                        }`}
                        disabled={hasVoted}
                      >
                        <div className="relative z-10 flex justify-between items-center px-3 py-2">
                          <span className="text-xs text-gray-300">{option.text}</span>
                          {hasVoted && (
                            <span className="text-xs text-gray-400">{percentage}%</span>
                          )}
                        </div>
                        {hasVoted && (
                          <div 
                            className="absolute top-0 left-0 h-full bg-primary-600/20"
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                {votedPolls.has(post.id) && (
                  <p className="text-xs text-gray-500 mt-2">총 {post.pollData.totalVotes}명 참여</p>
                )}
              </div>
            )}

            {/* 이미지 미리보기 (있는 경우) */}
            {post.hasImage && post.images && (
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {post.images.slice(0, 3).map((_img, index) => (
                  <div key={index} className="w-20 h-20 bg-dark-600 rounded-lg flex items-center justify-center shrink-0">
                    <PhotoIcon className="w-8 h-8 text-gray-500" />
                  </div>
                ))}
                {post.images.length > 3 && (
                  <div className="w-20 h-20 bg-dark-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-gray-400 text-sm">+{post.images.length - 3}</span>
                  </div>
                )}
              </div>
            )}

            {/* 메타 정보 & 액션 버튼 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-gray-500">
                <span>{post.author}</span>
                <span>·</span>
                <span>{post.time}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-3.5 h-3.5" />
                  {post.views}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    likedPosts.has(post.id) 
                      ? 'text-primary-400 bg-primary-600/20' 
                      : 'text-gray-400 hover:bg-dark-500'
                  }`}
                >
                  {likedPosts.has(post.id) ? (
                    <HandThumbUpSolid className="w-4 h-4" />
                  ) : (
                    <HandThumbUpIcon className="w-4 h-4" />
                  )}
                  <span>{likedPosts.has(post.id) ? post.likes + 1 : post.likes}</span>
                </button>
                
                <button className="flex items-center gap-1 px-2 py-1 rounded text-gray-400 hover:bg-dark-500 transition-colors">
                  <HandThumbDownIcon className="w-4 h-4" />
                  <span>{post.dislikes}</span>
                </button>
                
                <button className="flex items-center gap-1 px-2 py-1 rounded text-gray-400 hover:bg-dark-500 transition-colors">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  <span>{post.comments}</span>
                </button>
                
                <button className="p-1 rounded text-gray-400 hover:bg-dark-500 transition-colors">
                  <ShareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}