/**
 * 게시글 상세 페이지 (v4.0.0)
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  HandThumbUpIcon, 
  HandThumbDownIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { usePost, useVotePost, useCreateComment, useDeletePost } from '../hooks/usePosts';
import { getAnonymousId } from '../utils/anonymousUser';
import type { Comment } from '../types';

// 날짜 포맷팅
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 알림 토스트
function showToast(message: string) {
  alert(message);
}

// 게시글 헤더
interface PostHeaderProps {
  title: string;
  author: string;
  createdAt: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  isNotice: boolean;
  views: number;
  likesCount: number;
  commentsCount: number;
}

function PostHeader({
  title,
  author,
  createdAt,
  categoryName,
  categoryIcon,
  categoryColor,
  isNotice,
  views,
  likesCount,
  commentsCount
}: PostHeaderProps) {
  return (
    <div className="p-6 border-b border-dark-600">
      <div className="flex items-center gap-2 mb-3">
        <span 
          className="px-3 py-1 text-sm font-medium bg-dark-700 rounded-full flex items-center gap-1"
          style={{ color: categoryColor }}
        >
          <span>{categoryIcon}</span>
          <span>{categoryName}</span>
        </span>
        {isNotice && (
          <span className="text-yellow-500 text-sm">📌 공지</span>
        )}
        <span className="text-gray-500 text-xs">·</span>
        <span className="text-xs text-gray-400">{formatDate(createdAt)}</span>
      </div>
      
      <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {author[0]}
          </div>
          <span className="text-sm font-medium text-white">{author}</span>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            {views}
          </span>
          <span className="flex items-center gap-1 text-primary-400">
            <HandThumbUpIcon className="w-4 h-4" />
            {likesCount}
          </span>
          <span className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-4 h-4" />
            {commentsCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// 게시글 본문
interface PostContentProps {
  content: string;
  images: Array<{ cloudinary_url: string; width: number; height: number }>;
}

function PostContent({ content, images }: PostContentProps) {
  return (
    <div className="p-6">
      {images && images.length > 0 && (
        <div className="mb-6 space-y-4">
          {images.map((img, index) => (
            <img 
              key={index}
              src={img.cloudinary_url}
              alt={`이미지 ${index + 1}`}
              className="w-full rounded-lg"
              loading="lazy"
            />
          ))}
        </div>
      )}
      
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}

// 게시글 액션
interface PostActionsProps {
  likesCount: number;
  dislikesCount: number;
  onVote: (type: 'like' | 'dislike') => void;
  onDelete: () => void;
  isVoting: boolean;
}

function PostActions({ 
  likesCount, 
  dislikesCount, 
  onVote, 
  onDelete,
  isVoting 
}: PostActionsProps) {
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // 사용자가 취소한 경우 무시
      }
    } else {
      await navigator.clipboard.writeText(url);
      showToast('링크가 복사되었습니다!');
    }
  };
  
  return (
    <div className="p-6 border-t border-dark-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onVote('like')}
            disabled={isVoting}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-dark-600 text-gray-300 hover:bg-primary-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HandThumbUpIcon className="w-5 h-5" />
            <span>추천</span>
            <span className="font-bold">{likesCount}</span>
          </button>
          
          <button 
            onClick={() => onVote('dislike')}
            disabled={isVoting}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-dark-600 text-gray-300 hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HandThumbDownIcon className="w-5 h-5" />
            <span>비추천</span>
            {dislikesCount > 0 && (
              <span className="font-bold">{dislikesCount}</span>
            )}
          </button>
          
          <button 
            onClick={handleShare}
            className="px-4 py-2.5 rounded-lg bg-dark-600 text-gray-300 hover:bg-dark-500 font-medium text-sm transition-colors flex items-center gap-2"
          >
            <ShareIcon className="w-5 h-5" />
            <span>공유</span>
          </button>
        </div>
        
        <button 
          onClick={onDelete}
          className="px-4 py-2.5 rounded-lg bg-dark-600 text-red-400 hover:bg-dark-500 font-medium text-sm flex items-center gap-2"
        >
          <TrashIcon className="w-5 h-5" />
          <span>삭제</span>
        </button>
      </div>
    </div>
  );
}

// 댓글 섹션
interface CommentSectionProps {
  comments: Comment[];
  commentsCount: number;
  onSubmit: (author: string, content: string) => void;
  isSubmitting: boolean;
}

function CommentSection({ comments, commentsCount, onSubmit, isSubmitting }: CommentSectionProps) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      showToast('댓글 내용을 입력해주세요.');
      return;
    }
    
    onSubmit(author.trim() || '익명', content);
    setContent('');
  };
  
  return (
    <section className="bg-dark-700 rounded-lg p-6">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <ChatBubbleLeftIcon className="w-5 h-5" />
        <span>댓글</span>
        <span className="text-primary-400">{commentsCount}</span>
      </h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="닉네임 (선택)"
            className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
            disabled={isSubmitting}
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="w-full p-4 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500"
          rows={4}
          disabled={isSubmitting}
        />
        <div className="flex justify-end mt-2">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '작성 중...' : '댓글 작성'}
          </button>
        </div>
      </form>
      
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>첫 번째 댓글을 작성해보세요!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-dark-600 last:border-0 pb-4 last:pb-0">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                  {comment.author[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white text-sm">{comment.author}</span>
                    <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// 삭제 확인 모달
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  const [password, setPassword] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onConfirm(password);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-700 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">게시글 삭제</h3>
        <p className="text-gray-400 mb-4">
          게시글을 삭제하려면 비밀번호를 입력하세요.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white mb-4 focus:outline-none focus:border-primary-500"
            disabled={isDeleting}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500"
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isDeleting || !password.trim()}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 메인 컴포넌트
export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const id = postId || '';
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // API 훅
  const { data: post, isLoading, isError, error } = usePost(id);
  const votePostMutation = useVotePost();
  const createCommentMutation = useCreateComment();
  const deletePostMutation = useDeletePost();
  
  // 투표 핸들러
  const handleVote = async (type: 'like' | 'dislike') => {
    try {
      const anonymousId = getAnonymousId();
      await votePostMutation.mutateAsync({
        postId: id,
        data: { type, anonymousId }
      });
      showToast(type === 'like' ? '👍 추천했습니다!' : '👎 비추천했습니다!');
    } catch {
      showToast('투표에 실패했습니다.');
    }
  };
  
  // 댓글 작성 핸들러
  const handleCommentSubmit = async (author: string, content: string) => {
    try {
      const anonymousId = getAnonymousId();
      await createCommentMutation.mutateAsync({
        postId: id,
        data: { author, content, anonymousId }
      });
      showToast('💬 댓글이 작성되었습니다!');
    } catch {
      showToast('댓글 작성에 실패했습니다.');
    }
  };
  
  // 삭제 핸들러
  const handleDelete = async (password: string) => {
    try {
      await deletePostMutation.mutateAsync({ id, password });
      showToast('🗑️ 게시글이 삭제되었습니다.');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '삭제에 실패했습니다.';
      showToast(errorMsg);
    }
    setShowDeleteModal(false);
  };
  
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  // 에러 상태
  if (isError || !post) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-gray-200 mb-2">
          게시글을 찾을 수 없습니다
        </h3>
        <p className="text-gray-400 mb-4">
          {error instanceof Error ? error.message : '게시글이 삭제되었거나 존재하지 않습니다.'}
        </p>
        <Link to="/" className="text-primary-400 hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-4 px-4">
      {/* 뒤로가기 버튼 */}
      <Link 
        to="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span>목록으로</span>
      </Link>
      
      {/* 게시글 본문 */}
      <article className="bg-dark-700 rounded-lg overflow-hidden">
        <PostHeader
          title={post.title}
          author={post.author}
          createdAt={post.created_at}
          categoryName={post.category_name}
          categoryIcon={post.category_icon}
          categoryColor={post.category_color}
          isNotice={post.is_notice}
          views={post.views}
          likesCount={post.likes_count}
          commentsCount={post.comments_count}
        />
        
        <PostContent
          content={post.content}
          images={post.images || []}
        />
        
        <PostActions
          likesCount={post.likes_count}
          dislikesCount={post.dislikes_count}
          onVote={handleVote}
          onDelete={() => setShowDeleteModal(true)}
          isVoting={votePostMutation.isPending}
        />
      </article>
      
      {/* 댓글 섹션 */}
      <CommentSection
        comments={post.comments || []}
        commentsCount={post.comments_count}
        onSubmit={handleCommentSubmit}
        isSubmitting={createCommentMutation.isPending}
      />
      
      {/* 삭제 확인 모달 */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deletePostMutation.isPending}
      />
    </div>
  );
}
