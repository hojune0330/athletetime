/**
 * 게시글 상세 페이지 (v4.1.0 - Light Mode Design System v2)
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
    <div className="p-6 border-b border-neutral-100">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span 
          className="badge bg-neutral-100"
          style={{ color: categoryColor }}
        >
          <span>{categoryIcon}</span>
          <span className="ml-1">{categoryName}</span>
        </span>
        {isNotice && (
          <span className="badge bg-warning-100 text-warning-600">📌 공지</span>
        )}
        <span className="text-neutral-300">·</span>
        <span className="text-xs text-neutral-500">{formatDate(createdAt)}</span>
      </div>
      
      <h1 className="text-2xl font-bold text-neutral-900 mb-4">{title}</h1>
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-sm">
            {author[0]}
          </div>
          <span className="text-sm font-medium text-neutral-900">{author}</span>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            <span>{views}</span>
          </span>
          <span className="flex items-center gap-1 text-primary-600">
            <HandThumbUpIcon className="w-4 h-4" />
            <span>{likesCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-4 h-4" />
            <span>{commentsCount}</span>
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
              className="w-full rounded-xl shadow-soft"
              loading="lazy"
            />
          ))}
        </div>
      )}
      
      <div className="prose prose-neutral max-w-none">
        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
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
    <div className="p-6 border-t border-neutral-100 bg-neutral-50">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => onVote('like')}
            disabled={isVoting}
            className="btn-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200"
          >
            <HandThumbUpIcon className="w-5 h-5" />
            <span>추천</span>
            <span className="font-bold text-primary-600">{likesCount}</span>
          </button>
          
          <button 
            onClick={() => onVote('dislike')}
            disabled={isVoting}
            className="btn-secondary hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200"
          >
            <HandThumbDownIcon className="w-5 h-5" />
            <span>비추천</span>
            {dislikesCount > 0 && (
              <span className="font-bold text-danger-500">{dislikesCount}</span>
            )}
          </button>
          
          <button 
            onClick={handleShare}
            className="btn-secondary hover:bg-neutral-100"
          >
            <ShareIcon className="w-5 h-5" />
            <span className="hidden sm:inline">공유</span>
          </button>
        </div>
        
        <button 
          onClick={onDelete}
          className="btn-ghost text-danger-500 hover:bg-danger-50"
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
    <section className="card">
      <div className="card-header">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5 text-primary-500" />
          <span>댓글</span>
          <span className="text-primary-600">{commentsCount}</span>
        </h2>
      </div>
      
      <div className="card-body">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-3">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="닉네임 (선택)"
              className="input text-sm"
              disabled={isSubmitting}
            />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="textarea"
            rows={4}
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-3">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>작성 중...</span>
                </>
              ) : (
                '댓글 작성'
              )}
            </button>
          </div>
        </form>
        
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">💬</div>
              <p className="text-neutral-500">첫 번째 댓글을 작성해보세요!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b border-neutral-100 last:border-0 pb-4 last:pb-0 animate-fadeIn">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-info-500 to-primary-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                    {comment.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-neutral-900 text-sm">{comment.author}</span>
                      <span className="text-xs text-neutral-400">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-neutral-700 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">게시글 삭제</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            게시글을 삭제하려면 비밀번호를 입력하세요.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="input mb-4"
              disabled={isDeleting}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isDeleting || !password.trim()}
                className="btn-danger flex-1"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </form>
        </div>
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
      <div className="empty-state py-16">
        <div className="empty-state-icon">⚠️</div>
        <h3 className="empty-state-title">게시글을 찾을 수 없습니다</h3>
        <p className="empty-state-description">
          {error instanceof Error ? error.message : '게시글이 삭제되었거나 존재하지 않습니다.'}
        </p>
        <Link to="/" className="btn-primary">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-4 px-4 py-6 animate-fadeIn">
      {/* 뒤로가기 버튼 */}
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px]"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="font-medium">뒤로가기</span>
      </button>
      
      {/* 게시글 본문 */}
      <article className="card overflow-hidden">
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
