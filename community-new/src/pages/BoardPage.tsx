import { useParams } from 'react-router-dom'
import PostList from '../components/post/PostList'

const boardInfo: Record<string, { name: string; description: string }> = {
  free: { name: '자유게시판', description: '자유롭게 이야기를 나누는 공간' },
  humor: { name: '유머게시판', description: '재미있는 이야기와 웃음을 나누는 곳' },
  daily: { name: '일상', description: '일상의 소소한 이야기들' },
  hobby: { name: '취미', description: '다양한 취미 생활 공유' },
  stream: { name: '인방', description: '인터넷 방송 관련 이야기' },
  excited: { name: '호들갑', description: '신나는 이야기들' },
  calm: { name: '침착맨', description: '침착맨 관련 게시판' },
  meme: { name: '침착맨 짤', description: '침착맨 짤과 밈' },
  fanart: { name: '팬아트', description: '침착맨 팬아트 게시판' },
  request: { name: '방송 해줘요', description: '방송 요청 게시판' },
  schedule: { name: '방송일정', description: '방송 일정 및 공지' },
}

export default function BoardPage() {
  const { boardId } = useParams()
  const board = boardInfo[boardId || ''] || { name: '게시판', description: '' }

  return (
    <div className="space-y-4">
      {/* Board Header */}
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{board.name}</h1>
        {board.description && (
          <p className="text-gray-600">{board.description}</p>
        )}
      </div>

      {/* Post List */}
      <div className="card">
        <PostList />
      </div>
    </div>
  )
}