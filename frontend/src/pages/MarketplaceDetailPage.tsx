/**
 * 중고거래 상세 페이지
 * /marketplace/:id
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  useMarketplaceItem,
  useMarketplaceComments,
  useCreateMarketplaceComment,
  useDeleteMarketplaceComment,
  useDeleteMarketplaceItem,
  useUpdateMarketplaceItemStatus,
} from '../hooks/useMarketplace';
import { useAuth } from '../context/AuthContext';

// 가격 포맷팅
function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

// 날짜 포맷팅
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MarketplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, promptLogin } = useAuth();
  const itemId = parseInt(id || '0');

  // 상태
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [commentContent, setCommentContent] = useState('');

  // API 호출
  const { data: itemData, isLoading: isLoadingItem } = useMarketplaceItem(itemId);
  const { data: commentsData, isLoading: isLoadingComments } = useMarketplaceComments(itemId);
  const createCommentMutation = useCreateMarketplaceComment();
  const deleteCommentMutation = useDeleteMarketplaceComment();
  const deleteItemMutation = useDeleteMarketplaceItem();
  const updateStatusMutation = useUpdateMarketplaceItemStatus();

  const item = itemData?.item;
  const comments = commentsData?.comments || [];

  // 상태 변경 핸들러
  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return;

    try {
      await updateStatusMutation.mutateAsync({ id: itemId, status: newStatus });
      alert('상태가 변경되었습니다.');
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      // C+A: 페이지 이동 없이 로그인 모달을 띄우고, 로그인 후 이 상품으로 복귀.
      promptLogin(window.location.pathname + window.location.search);
      return;
    }

    if (!commentContent.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        itemId,
        content: commentContent,
      });
      setCommentContent('');
    } catch {
      alert('댓글 작성에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await deleteCommentMutation.mutateAsync({ itemId, commentId });
    } catch {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 상품 삭제
  const handleDeleteItem = async () => {
    if (!confirm('상품을 삭제하시겠습니까?')) return;

    try {
      await deleteItemMutation.mutateAsync(itemId);
      alert('상품이 삭제되었습니다.');
      navigate('/marketplace');
    } catch {
      alert('상품 삭제에 실패했습니다.');
    }
  };

  // 구매하기
  const handlePurchase = () => {
    if (!user) {
      // C+A: 페이지 이동 없이 로그인 모달을 띄우고, 로그인 후 이 상품으로 복귀.
      promptLogin(window.location.pathname + window.location.search);
      return;
    }

    if (item?.status !== '판매중') {
      alert('판매중인 상품만 구매할 수 있습니다.');
      return;
    }

    // TODO: 결제 페이지로 이동
    alert('결제 기능은 준비 중입니다.');
  };

  if (isLoadingItem) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="empty-state py-16">
        <div className="empty-state-icon">🛒</div>
        <h3 className="empty-state-title">상품을 찾을 수 없습니다</h3>
        <Link to="/marketplace" className="btn-primary mt-4">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === item.seller_id;
  
  // 이미지 배열 정렬: 대표 이미지를 맨 앞으로
  const images = (() => {
    if (!item.images || item.images.length === 0) {
      return [];
    }
    
    const thumbnailIndex = item.thumbnail_index || 0;
    const sortedImages = [...item.images];
    
    // 대표 이미지를 맨 앞으로 이동
    if (thumbnailIndex > 0 && thumbnailIndex < sortedImages.length) {
      const thumbnailImage = sortedImages[thumbnailIndex];
      sortedImages.splice(thumbnailIndex, 1);
      sortedImages.unshift(thumbnailImage);
    }
    
    return sortedImages;
  })();

  const statusColor = {
    '판매중': 'bg-success-500',
    '예약중': 'bg-warning-500',
    '판매완료': 'bg-neutral-400',
  }[item.status];

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">목록으로</span>
        </Link>
      </div>

      <div className="card">
        <div className="card-body p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 왼쪽: 이미지 */}
            <div>
              {/* 메인 이미지 */}
              <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden mb-4">
                {images[selectedImageIndex] ? (
                  <img
                    src={images[selectedImageIndex]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                    AthleteTime
                    <br />
                    Gear
                  </div>
                )}
              </div>

              {/* 썸네일 목록 */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIndex === index
                          ? 'border-primary-500'
                          : 'border-transparent hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${item.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.opacity = '0';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 오른쪽: 상품 정보 */}
            <div>
              {/* 상태 배지 / 드롭다운 */}
              <div className="mb-4">
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700">상태:</span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`${statusColor} text-white text-sm font-medium px-3 py-1 rounded cursor-pointer border-0 focus:ring-2 focus:ring-primary-500`}
                    >
                      <option value="판매중">판매중</option>
                      <option value="예약중">예약중</option>
                      <option value="판매완료">판매완료</option>
                    </select>
                  </div>
                ) : (
                  <span className={`${statusColor} text-white text-sm font-medium px-3 py-1 rounded`}>
                    {item.status}
                  </span>
                )}
              </div>

              {/* 제목 */}
              <h1 className="text-2xl font-bold text-neutral-900 mb-4">{item.title}</h1>

              {/* 가격 */}
              <p className="text-3xl font-bold text-primary-600 mb-6">
                {formatPrice(item.price)}
              </p>

              {/* 판매자 정보 */}
              <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg mb-6">
                {item.seller_profile_image ? (
                  <img
                    src={item.seller_profile_image}
                    alt={item.seller_nickname}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-12 h-12 text-neutral-400" />
                )}
                <div>
                  <p className="font-medium text-neutral-900">{item.seller_nickname}</p>
                  <p className="text-sm text-neutral-500">판매자</p>
                </div>
              </div>

              {/* 상품 설명 */}
              {item.description && (
                <div className="mb-6">
                  <h2 className="font-semibold text-neutral-900 mb-2">상품 설명</h2>
                  <p className="text-neutral-700 whitespace-pre-wrap">{item.description}</p>
                </div>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-4 text-sm text-neutral-500 mb-6">
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  조회 {item.view_count}
                </span>
                <span>등록일 {formatDate(item.created_at)}</span>
              </div>

              {/* 액션 버튼 */}
              <div className="space-y-3">
                {isOwner ? (
                  <>
                    <Link
                      to={`/marketplace/${item.id}/edit`}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                      수정하기
                    </Link>
                    <button
                      onClick={handleDeleteItem}
                      disabled={deleteItemMutation.isPending}
                      className="btn-danger w-full flex items-center justify-center gap-2"
                    >
                      <TrashIcon className="w-5 h-5" />
                      {deleteItemMutation.isPending ? '삭제 중...' : '삭제하기'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={item.status !== '판매중'}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {item.status === '판매중' ? '구매하기' : '판매 완료된 상품'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">
              댓글 {comments.length}개
            </h2>

            {/* 댓글 작성 */}
            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="댓글을 작성해주세요..."
                  className="input w-full min-h-[100px] resize-none"
                  disabled={createCommentMutation.isPending}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={createCommentMutation.isPending || !commentContent.trim()}
                    className="btn-primary disabled:opacity-50"
                  >
                    {createCommentMutation.isPending ? '작성 중...' : '댓글 작성'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 text-center mb-6">
                <p className="text-neutral-600 mb-3">댓글을 작성하려면 로그인이 필요합니다.</p>
                <button
                  type="button"
                  onClick={() => promptLogin(window.location.pathname + window.location.search)}
                  className="btn-primary inline-block"
                >
                  로그인
                </button>
              </div>
            )}

            {/* 댓글 목록 */}
            {isLoadingComments ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                첫 댓글을 작성해보세요!
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-neutral-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {comment.user_profile_image ? (
                          <img
                            src={comment.user_profile_image}
                            alt={comment.user_nickname}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="w-8 h-8 text-neutral-400" />
                        )}
                        <span className="font-medium text-neutral-900">
                          {comment.user_nickname}
                        </span>
                        <span className="text-sm text-neutral-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                          className="text-sm text-danger-600 hover:text-danger-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-neutral-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
