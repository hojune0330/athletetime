/**
 * 중고거래 목록 페이지
 * /marketplace
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/common/PageHeader';
import { useMarketplaceItems } from '../hooks/useMarketplace';
import { useAuth } from '../context/AuthContext';
import type { MarketplaceItem } from '../api/marketplace';

// 가격 포맷팅
function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

// 날짜 포맷팅
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// 상품 카드 컴포넌트
interface ProductCardProps {
  item: MarketplaceItem;
}

function ProductCard({ item }: ProductCardProps) {
  const thumbnailUrl = item.images && item.images.length > 0
    ? item.images[item.thumbnail_index] || item.images[0]
    : '/placeholder-image.png';

  const statusColor = {
    '판매중': 'bg-success-500',
    '예약중': 'bg-warning-500',
    '판매완료': 'bg-neutral-400'
  }[item.status];

  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/marketplace/${item.id}`)}
      className="card overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
    >
      {/* 썸네일 */}
      <div className="relative aspect-square bg-neutral-100">
        <img
          src={thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-image.png';
          }}
        />
        {/* 상태 배지 */}
        <div className={`absolute top-2 left-2 ${statusColor} text-white text-xs font-medium px-2 py-1 rounded`}>
          {item.status}
        </div>
      </div>

      {/* 상품 정보 */}
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 mb-2 line-clamp-2 text-sm">
          {item.title}
        </h3>
        <p className="text-lg font-bold text-primary-600 mb-3">
          {formatPrice(item.price)}
        </p>

        {/* 메타 정보 */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <EyeIcon className="w-4 h-4" />
              {item.view_count}
            </span>
            <span className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              {item.comment_count}
            </span>
          </div>
          <span>{formatDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// 메인 컴포넌트
export default function MarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 상태
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | '판매중' | '예약중' | '판매완료'>('');
  const [sort, setSort] = useState<'latest' | 'price_low' | 'price_high' | 'views'>('latest');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');

  // API 호출
  const { data, isLoading, isError } = useMarketplaceItems({
    search,
    status,
    sort,
    page,
    limit: 20
  });

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // 상태 필터 변경
  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus);
    setPage(1);
  };

  // 정렬 변경
  const handleSortChange = (newSort: typeof sort) => {
    setSort(newSort);
    setPage(1);
  };

  return (
    <div>
      {/* 헤더 */}
      <PageHeader
        title="중고거래"
        icon="🛒"
        description="육상 용품을 사고팔아보세요"
        actions={
          user ? (
            <Link to="/marketplace/new" className="btn-primary">
              <PlusIcon className="w-5 h-5" />
              상품 등록
            </Link>
          ) : undefined
        }
      />

      {/* 검색 및 필터 */}
      <div className="mb-6 space-y-4">
        {/* 검색 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="상품명 검색..."
              className="input pl-10 w-full"
            />
          </div>
          <button type="submit" className="btn-primary">
            검색
          </button>
        </form>

        {/* 필터 & 정렬 */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* 상태 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleStatusChange('판매중')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === '판매중'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              판매중만
            </button>
          </div>

          {/* 정렬 */}
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as typeof sort)}
            className="input w-40"
          >
            <option value="latest">최신순</option>
            <option value="price_low">가격 낮은순</option>
            <option value="price_high">가격 높은순</option>
            <option value="views">조회수 높은순</option>
          </select>
        </div>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      )}

      {/* 에러 */}
      {isError && (
        <div className="empty-state py-16">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">데이터를 불러올 수 없습니다</h3>
          <p className="empty-state-description">잠시 후 다시 시도해주세요.</p>
        </div>
      )}

      {/* 상품 목록 */}
      {!isLoading && !isError && (
        <>
          {data?.items.length === 0 ? (
            <div className="empty-state py-16">
              <div className="empty-state-icon">🛒</div>
              <h3 className="empty-state-title">등록된 상품이 없습니다</h3>
              <p className="empty-state-description">
                첫 번째 상품을 등록해보세요!
              </p>
              {user && (
                <Link to="/marketplace/new" className="btn-primary mt-4">
                  <PlusIcon className="w-5 h-5" />
                  상품 등록하기
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* 상품 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {data?.items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>

              {/* 페이지네이션 */}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-sm text-neutral-600">
                    {page} / {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.pagination.totalPages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
