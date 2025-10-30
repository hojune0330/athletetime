import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { usePost, useVotePost, useCreateComment, useDeletePost } from '../hooks/usePosts'
import { EyeIcon, HandThumbUpIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { getAnonymousId } from "../utils/anonymousUser"

export default function PostDetailPage() {
  const { id: postIdParam } = useParams()
  const navigate = useNavigate()
  const postId = Number(postIdParam)
  
  const [commentText, setCommentText] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // API 훅
  const { data: post, isLoading, isError } = usePost(postId)
  const votePostMutation = useVotePost()
  const createCommentMutation = useCreateComment()
  const deletePostMutation = useDeletePost()
  
  // 시간 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // 투표 핸들러
  const handleVote = async (voteType: 'up' | 'down') => {
    try {
      // Generate a unique user ID or get from session
      const anonymousId = getAnonymousId()
        (() => {
          const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          // using getAnonymousId()
          // auto-generated;
        })();
      
      await votePostMutation.mutateAsync({
        postId,
        data: {
          anonymousId,
          type: voteType === 'up' ? 'like' : 'dislike'
        }
      })
    } catch (error) {
      console.error('투표 실패:', error)
    }
  }
  
  // 댓글 작성 핸들러
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commentText.trim() || !commentAuthor.trim()) {
      alert('닉네임과 댓글 내용을 입력해주세요.')
      return
    }
    
    try {
      // Generate a unique user ID or get from session
      const anonymousId = getAnonymousId()
        (() => {
          const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          // using getAnonymousId()
          // auto-generated;
        })();
      
      await createCommentMutation.mutateAsync({
        postId,
        data: {
          content: commentText,
          author: commentAuthor,
          anonymousId
        }
      })
      
      // 성공 시 입력 필드 초기화
      setCommentText('')
      alert('댓글이 작성되었습니다!')
    } catch (error) {
      console.error('댓글 작성 실패:', error)
      alert('댓글 작성에 실패했습니다.')
    }
  }
  
  // 게시글 삭제 핸들러
  const handleDelete = async () => {
    if (!deletePassword.trim()) {
      alert('비밀번호를 입력해주세요.')
      return
    }
    
    try {
      await deletePostMutation.mutateAsync({ id: postId, password: deletePassword })
      alert('게시글이 삭제되었습니다.')
      navigate('/')
    } catch (error) {
      console.error('게시글 삭제 실패:', error)
      alert('비밀번호가 일치하지 않거나 삭제에 실패했습니다.')
    }
    setShowDeleteModal(false)
  }
  
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }
  
  // 에러 상태
  if (isError || !post) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-gray-200 mb-2">게시글을 찾을 수 없습니다</h3>
        <Link to="/" className="text-primary-400 hover:underline">목록으로 돌아가기</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 게시글 본문 */}
      <article className="card-dark">
        {/* 게시글 헤더 */}
        <div className="p-6 border-b border-dark-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                  {post.category_name}
                </span>
                {post.is_notice && (
                  <span className="text-yellow-500 text-sm">📌</span>
                )}
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                {post.title}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  <span className="text-sm font-medium text-white">{post.author}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-3.5 h-3.5" />
                    {post.views_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <HandThumbUpIcon className="w-3.5 h-3.5" />
                    {post.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                    {post.comments_count || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 게시글 내용 */}
        <div className="p-6">
          <div className="prose prose-invert max-w-none">
            {post.images && post.images[0]?.cloudinary_url && (
              <div className="my-6">
                <img 
                  src={post.images[0]?.cloudinary_url} 
                  alt={post.title}
                  className="rounded-lg w-full"
                />
              </div>
            )}
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>
        </div>

        {/* 게시글 액션 버튼 */}
        <div className="p-6 border-t border-dark-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleVote('up')}
                disabled={votePostMutation.isPending}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-dark-600 text-gray-300 hover:bg-primary-600 hover:text-white disabled:opacity-50"
              >
                <span>👍</span>
                <span>추천</span>
                <span className="font-bold">{post.likes_count}</span>
              </button>
              <button 
                onClick={() => handleVote('down')}
                disabled={votePostMutation.isPending}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-dark-600 text-gray-300 hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                <span>👎</span>
                <span>비추천</span>
              </button>
              <button className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 hover:bg-dark-500 font-medium text-sm transition-colors flex items-center gap-2">
                <span>🔗</span>
                <span>공유</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg bg-dark-600 text-red-400 hover:bg-dark-500 font-medium text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </article>
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">게시글 삭제</h3>
            <p className="text-gray-400 mb-4">게시글을 삭제하려면 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePassword('')
                }}
                className="flex-1 px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePostMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deletePostMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <section className="card-dark p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>💬</span>
          <span>댓글</span>
          <span className="text-primary-400">{post.comments_count || 0}</span>
        </h2>

        {/* 댓글 작성 */}
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <div className="mb-2">
            <input
              type="text"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder="닉네임"
              className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
              required
            />
          </div>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="w-full p-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500"
            rows={3}
            required
          />
          <div className="flex justify-end mt-2">
            <button 
              type="submit"
              disabled={createCommentMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 disabled:opacity-50"
            >
              {createCommentMutation.isPending ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </form>

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {!post.comments || post.comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>첫 번째 댓글을 작성해보세요!</p>
            </div>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="border-b border-dark-600 last:border-0 pb-4 last:pb-0">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{comment.author}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-300 mb-2 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
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