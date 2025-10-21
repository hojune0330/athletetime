import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'

export default function PostDetailPage() {
  const { id: postId } = useParams()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  
  // 나중에 postId를 사용해서 게시글 데이터를 가져올 예정
  console.log('Post ID:', postId)

  // 샘플 댓글 데이터
  const [comments] = useState([
    {
      id: 1,
      author: '유저1',
      content: 'ㅋㅋㅋㅋㅋ 진짜 웃기네요',
      time: '2024.10.14 15:30',
      likes: 12,
      replies: [
        {
          id: 11,
          author: '유저2',
          content: '인정합니다 ㅋㅋㅋ',
          time: '2024.10.14 15:35',
          likes: 3,
        }
      ]
    },
    {
      id: 2,
      author: '유저3',
      content: '이런 게시글 더 올려주세요!',
      time: '2024.10.14 15:25',
      likes: 5,
      replies: []
    }
  ])

  return (
    <div className="space-y-4">
      {/* 게시글 본문 */}
      <article className="card-dark">
        {/* 게시글 헤더 */}
        <div className="p-6 border-b border-dark-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Link to="/board/chimchak" className="px-2 py-0.5 text-xs font-medium bg-teal-500/20 text-teal-400 rounded">
                  침착맨
                </Link>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-xs text-gray-400">2024.10.14 14:30</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                오늘 방송 레전드였음 ㅋㅋㅋㅋ
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  <span className="text-sm font-medium text-white">작성자닉네임</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>조회 1,234</span>
                  <span>추천 56</span>
                  <span>댓글 23</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 게시글 내용 */}
        <div className="p-6">
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed mb-4">
              오늘 침착맨 방송 진짜 레전드였음 ㅋㅋㅋㅋ
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              특히 그 부분에서 완전 빵터짐 ㅋㅋㅋㅋㅋㅋ
              다들 클립 만들어서 올릴 듯
            </p>
            <div className="my-6">
              <img 
                src="https://via.placeholder.com/600x400" 
                alt="게시글 이미지"
                className="rounded-lg w-full"
              />
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              이런 방송 자주 했으면 좋겠다 진짜로...
              요즘 침착맨 폼 미쳤음 ㅋㅋㅋ
            </p>
          </div>
        </div>

        {/* 게시글 액션 버튼 */}
        <div className="p-6 border-t border-dark-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLiked(!liked)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  liked 
                    ? 'bg-red-500 text-white' 
                    : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                }`}
              >
                <span>{liked ? '❤️' : '🤍'}</span>
                <span>추천</span>
                <span className="font-bold">56</span>
              </button>
              <button 
                onClick={() => setBookmarked(!bookmarked)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  bookmarked
                    ? 'bg-yellow-500 text-black'
                    : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                }`}
              >
                <span>{bookmarked ? '⭐' : '☆'}</span>
                <span>북마크</span>
              </button>
              <button className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 hover:bg-dark-500 font-medium text-sm transition-colors flex items-center gap-2">
                <span>🔗</span>
                <span>공유</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 hover:bg-dark-500 font-medium text-sm">
                수정
              </button>
              <button className="px-4 py-2 rounded-lg bg-dark-600 text-red-400 hover:bg-dark-500 font-medium text-sm">
                삭제
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* 댓글 섹션 */}
      <section className="card-dark p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>💬</span>
          <span>댓글</span>
          <span className="text-teal-400">{comments.length}</span>
        </h2>

        {/* 댓글 작성 */}
        <div className="mb-6">
          <textarea
            placeholder="댓글을 입력하세요..."
            className="w-full p-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-teal-500"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button className="px-4 py-2 rounded-lg bg-teal-500 text-white font-medium text-sm hover:bg-teal-600">
              댓글 작성
            </button>
          </div>
        </div>

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-dark-600 last:border-0 pb-4 last:pb-0">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{comment.author}</span>
                    <span className="text-xs text-gray-500">{comment.time}</span>
                  </div>
                  <p className="text-gray-300 mb-2">{comment.content}</p>
                  <div className="flex items-center gap-3">
                    <button className="text-xs text-gray-400 hover:text-teal-400 flex items-center gap-1">
                      <span>👍</span>
                      <span>{comment.likes}</span>
                    </button>
                    <button className="text-xs text-gray-400 hover:text-teal-400">
                      답글
                    </button>
                  </div>
                  
                  {/* 대댓글 */}
                  {comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3 pl-4 border-l-2 border-dark-600">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white text-sm">{reply.author}</span>
                              <span className="text-xs text-gray-500">{reply.time}</span>
                            </div>
                            <p className="text-gray-300 text-sm">{reply.content}</p>
                            <button className="text-xs text-gray-400 hover:text-teal-400 flex items-center gap-1 mt-1">
                              <span>👍</span>
                              <span>{reply.likes}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 목록으로 버튼 */}
      <div className="flex justify-center">
        <Link 
          to="/"
          className="px-6 py-2 rounded-lg bg-dark-700 text-white hover:bg-dark-600 font-medium"
        >
          목록으로
        </Link>
      </div>
    </div>
  )
}