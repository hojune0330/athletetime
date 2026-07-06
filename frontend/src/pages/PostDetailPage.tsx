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
  PencilSquareIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { usePost, useVotePost, useCreateComment, useDeletePost, useVerifyPostPassword, usePollVote } from '../hooks/usePosts';
import { getAnonymousId } from '../utils/anonymousUser';
import { useAuth } from '../context/AuthContext';
import type { Comment, Poll } from '../types';

// 삭제 사유 옵션
const DELETE_REASONS = [
  { value: 'spam', label: '스팸/광고' },
  { value: 'abuse', label: '욕설/비방' },
  { value: 'illegal', label: '불법 콘텐츠' },
  { value: 'duplicate', label: '중복 게시글' },
  { value: 'inappropriate', label: '부적절한 내용' },
  { value: 'other', label: '기타' },
];

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

// 투표 컴포넌트
interface PollSectionProps {
  poll: Poll;
  postId: string;
  onVote: (optionId: number) => void;
  isVoting: boolean;
  hasVoted: boolean;
}

function PollSection({ poll, onVote, isVoting, hasVoted }: PollSectionProps) {
  const visitorId = getAnonymousId();
  const userHasVoted = hasVoted || (poll.voters && poll.voters.includes(visitorId));
  
  return (
    <div className="p-6 border-t border-neutral-100">
      <div className="bg-neutral-50 rounded-xl p-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          📊 {poll.question}
        </h3>
        
        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0 
              ? Math.round((option.votes / poll.total_votes) * 100) 
              : 0;
            
            return (
              <div key={option.id} className="relative">
                {userHasVoted ? (
                  // 투표 후: 결과 표시
                  <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div 
                      className="absolute inset-y-0 left-0 bg-primary-100 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between p-3">
                      <span className="text-sm font-medium text-neutral-700">{option.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">{option.votes}표</span>
                        <span className="text-sm font-bold text-primary-600">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 투표 전: 선택 버튼
                  <button
                    onClick={() => onVote(option.id)}
                    disabled={isVoting}
                    className="w-full p-3 text-left rounded-lg border border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm font-medium text-neutral-700">{option.text}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>총 {poll.total_votes}명 참여</span>
          {userHasVoted && (
            <span className="text-primary-600 font-medium">✓ 투표 완료</span>
          )}
        </div>
      </div>
    </div>
  );
}

// 게시글 액션
interface PostActionsProps {
  likesCount: number;
  dislikesCount: number;
  myVote?: 'like' | 'dislike' | null;
  onVote: (type: 'like' | 'dislike') => void;
  onEdit: () => void;
  onDelete: () => void;
  isVoting: boolean;
}

function PostActions({ 
  likesCount, 
  dislikesCount,
  myVote,
  onVote, 
  onEdit,
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
  
  const isLiked = myVote === 'like';
  const isDisliked = myVote === 'dislike';
  
  return (
    <div className="p-6 border-t border-neutral-100 bg-neutral-50">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => onVote('like')}
            disabled={isVoting}
            className={`btn-secondary transition-all ${
              isLiked 
                ? 'bg-primary-100 text-primary-600 border-primary-300' 
                : 'hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
            }`}
          >
            <HandThumbUpIcon className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{isLiked ? '추천 취소' : '추천'}</span>
            <span className="font-bold text-primary-600">{likesCount}</span>
          </button>
          
          <button 
            onClick={() => onVote('dislike')}
            disabled={isVoting}
            className={`btn-secondary transition-all ${
              isDisliked 
                ? 'bg-danger-100 text-danger-600 border-danger-300' 
                : 'hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200'
            }`}
          >
            <HandThumbDownIcon className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
            <span>{isDisliked ? '비추천 취소' : '비추천'}</span>
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
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onEdit}
            className="btn-ghost text-primary-500 hover:bg-primary-50"
          >
            <PencilSquareIcon className="w-5 h-5" />
            <span>수정</span>
          </button>
          
          <button 
            onClick={onDelete}
            className="btn-ghost text-danger-500 hover:bg-danger-50"
          >
            <TrashIcon className="w-5 h-5" />
            <span>삭제</span>
          </button>
        </div>
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

// 비밀번호 확인 모달 (수정용)
interface EditPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isVerifying: boolean;
  error?: string | null;
}

function EditPasswordModal({ isOpen, onClose, onConfirm, isVerifying, error }: EditPasswordModalProps) {
  const [password, setPassword] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onConfirm(password);
    }
  };
  
  const handleClose = () => {
    setPassword('');
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">게시글 수정</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            게시글을 수정하려면 비밀번호를 입력하세요.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="input mb-4"
              disabled={isVerifying}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1"
                disabled={isVerifying}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isVerifying || !password.trim()}
                className="btn-primary flex-1"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>확인 중...</span>
                  </>
                ) : (
                  '확인'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 삭제 확인 모달 (일반 사용자용 - 비밀번호 입력)
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

// 관리자용 삭제 모달 (삭제 사유 선택)
interface AdminDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteReason: string) => void;
  isDeleting: boolean;
}

function AdminDeleteModal({ isOpen, onClose, onConfirm, isDeleting }: AdminDeleteModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = selectedReason === 'other' ? customReason.trim() : selectedReason;
    if (reason) {
      onConfirm(reason);
    }
  };
  
  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };
  
  const isValid = selectedReason && (selectedReason !== 'other' || customReason.trim());
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-xl font-bold text-neutral-900">관리자 삭제</h3>
          </div>
          <p className="text-neutral-500 mb-4 text-sm">
            삭제 사유를 선택해주세요. 삭제 기록이 저장됩니다.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="space-y-2 mb-4">
              {DELETE_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason.value
                      ? 'border-danger-300 bg-danger-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-danger-600"
                    disabled={isDeleting}
                  />
                  <span className="text-sm text-neutral-700">{reason.label}</span>
                </label>
              ))}
            </div>
            
            {selectedReason === 'other' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="삭제 사유를 입력하세요"
                className="input mb-4"
                disabled={isDeleting}
                autoFocus
              />
            )}
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1"
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isDeleting || !isValid}
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
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  
  // API 훅
  const { data: post, isLoading, isError, error } = usePost(id);
  const votePostMutation = useVotePost();
  const createCommentMutation = useCreateComment();
  const deletePostMutation = useDeletePost();
  const verifyPasswordMutation = useVerifyPostPassword();
  const pollVoteMutation = usePollVote();
  
  // 설문 투표 상태
  const [hasVotedPoll, setHasVotedPoll] = useState(false);
  
  // 투표 핸들러
  const handleVote = async (type: 'like' | 'dislike') => {
    try {
      const anonymousId = getAnonymousId();
      const currentVote = post?.myVote;
      const result = await votePostMutation.mutateAsync({
        postId: id,
        data: { type, anonymousId }
      });
      
      // 투표 상태에 따른 메시지
      if (currentVote === type) {
        // 같은 타입 클릭 → 취소
        showToast(type === 'like' ? '👍 추천을 취소했습니다.' : '👎 비추천을 취소했습니다.');
      } else if (result.myVote) {
        // 새 투표 또는 변경
        showToast(type === 'like' ? '👍 추천했습니다!' : '👎 비추천했습니다!');
      }
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
  
  // 수정 비밀번호 확인 핸들러
  const handleEditPasswordVerify = async (password: string) => {
    try {
      setEditPasswordError(null);
      await verifyPasswordMutation.mutateAsync({ id, password });
      setShowEditPasswordModal(false);
      // 비밀번호 확인 성공 시 수정 페이지로 이동 (비밀번호를 state로 전달)
      navigate(`/edit/${id}`, { state: { password } });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '비밀번호가 일치하지 않습니다.';
      setEditPasswordError(errorMsg);
    }
  };
  
  // 삭제 핸들러 (일반 사용자)
  const handleDelete = async (password: string) => {
    try {
      await deletePostMutation.mutateAsync({ id, password });
      showToast('🗑️ 게시글이 삭제되었습니다.');
      setTimeout(() => navigate('/community'), 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '삭제에 실패했습니다.';
      showToast(errorMsg);
    }
    setShowDeleteModal(false);
  };
  
  // 관리자 삭제 핸들러
  const handleAdminDelete = async (deleteReason: string) => {
    try {
      await deletePostMutation.mutateAsync({ id, password: '', deleteReason });
      showToast('🛡️ 관리자 권한으로 게시글이 삭제되었습니다.');
      setTimeout(() => navigate('/community'), 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '삭제에 실패했습니다.';
      showToast(errorMsg);
    }
    setShowAdminDeleteModal(false);
  };
  
  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = () => {
    if (isAdmin) {
      setShowAdminDeleteModal(true);
    } else {
      setShowDeleteModal(true);
    }
  };
  
  // 설문 투표 핸들러
  const handlePollVote = async (optionId: number) => {
    try {
      const visitorId = getAnonymousId();
      await pollVoteMutation.mutateAsync({
        postId: id,
        data: { optionId, visitorId }
      });
      setHasVotedPoll(true);
      showToast('📊 투표가 완료되었습니다!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '투표에 실패했습니다.';
      showToast(errorMsg);
    }
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
    <div className="space-y-4">
      {/* 목록으로 버튼 */}
      <button 
        onClick={() => navigate('/community')}
        className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px]"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="font-medium">목록으로</span>
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
        
        {/* 투표 섹션 */}
        {post.poll && (
          <PollSection
            poll={post.poll}
            postId={id}
            onVote={handlePollVote}
            isVoting={pollVoteMutation.isPending}
            hasVoted={hasVotedPoll}
          />
        )}
        
        <PostActions
          likesCount={post.likes_count}
          dislikesCount={post.dislikes_count}
          myVote={post.myVote}
          onVote={handleVote}
          onEdit={() => setShowEditPasswordModal(true)}
          onDelete={handleDeleteClick}
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
      
      {/* 수정 비밀번호 확인 모달 */}
      <EditPasswordModal
        isOpen={showEditPasswordModal}
        onClose={() => {
          setShowEditPasswordModal(false);
          setEditPasswordError(null);
        }}
        onConfirm={handleEditPasswordVerify}
        isVerifying={verifyPasswordMutation.isPending}
        error={editPasswordError}
      />
      
      {/* 삭제 확인 모달 (일반 사용자) */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deletePostMutation.isPending}
      />
      
      {/* 관리자 삭제 모달 */}
      <AdminDeleteModal
        isOpen={showAdminDeleteModal}
        onClose={() => setShowAdminDeleteModal(false)}
        onConfirm={handleAdminDelete}
        isDeleting={deletePostMutation.isPending}
      />
    </div>
  );
}
