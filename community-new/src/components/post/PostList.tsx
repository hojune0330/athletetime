/**
 * 게시글 목록 컴포넌트 (v4.0.0 - Clean Architecture)
 * 
 * 핵심 개선:
 * - 깔끔한 코드 구조
 * - 최적화된 렌더링
 * - 일관된 디자인
 * - 타입 안전성
 */

import { Link } from 'react-router-dom';
import { EyeIcon, HandThumbUpIcon, ChatBubbleLeftIcon, FireIcon } from '@heroicons/react/24/outline';
import { usePosts } from '../../hooks/usePosts';
import type { Post } from '../../types';

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 시간을 상대적 표현으로 변환
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 게시글이 새 글인지 확인 (24시간 이내)
 */
function isNewPost(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  
  return hours < 24;
}

/**
 * 게시글이 인기글인지 확인 (좋아요 20개 이상)
 */
function isHotPost(likesCount: number): boolean {
  return likesCount >= 20;
}

// ============================================
// 게시글 아이템 컴포넌트
// ============================================

interface PostItemProps {
  post: Post;
}

function PostItem({ post }: PostItemProps) {
  const isNew = isNewPost(post.created_at);
  const isHot = isHotPost(post.likes_count);
  const hasImage = post.images && post.images.length > 0;
  const thumbnail = hasImage ? post.images[0].thumbnail_url : null;
  
  return (
    <Link
      to={`/post/${post.id}`}
      className="block hover:bg-dark-500/50 transition-colors duration-200"
    >
      <article className="p-4 border-b border-dark-600 hover:border-primary-500/30">
        <div className="flex gap-4">
          {/* 썸네일 */}
          {thumbnail && (
            <div className="shrink-0">
              <img 
                src={thumbnail}
                alt={post.title}
                className="w-24 h-20 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}
          
          {/* 게시글 정보 */}
          <div className="flex-1 min-w-0">
            {/* 상단: 카테고리 + 뱃지 */}
            <div className="flex items-center gap-2 mb-2">
              {/* 공지사항 */}
              {post.is_notice && (
                <span className="text-yellow-500 text-sm">📌</span>
              )}
              
              {/* 카테고리 */}
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-dark-700"
                style={{ color: post.category_color }}
              >
                <span>{post.category_icon}</span>
                <span>{post.category_name}</span>
              </span>
              
              {/* HOT 뱃지 */}
              {isHot && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400">
                  <FireIcon className="w-3 h-3" />
                  HOT
                </span>
              )}
              
              {/* NEW 뱃지 */}
              {isNew && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400">
                  NEW
                </span>
              )}
            </div>
            
            {/* 제목 */}
            <h3 className="text-base font-semibold text-gray-100 mb-2 line-clamp-2 hover:text-primary-400 transition-colors">
              {post.title}
            </h3>
            
            {/* 하단: 메타 정보 */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-medium">{post.author}</span>
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-3.5 h-3.5" />
                  {post.views}
                </span>
                <span className="flex items-center gap-1 text-primary-400">
                  <HandThumbUpIcon className="w-3.5 h-3.5" />
                  {post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                  {post.comments_count}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ============================================
// 로딩 스켈레톤
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex gap-4">
            <div className="w-24 h-20 bg-dark-600 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="w-16 h-5 bg-dark-600 rounded-full" />
                <div className="w-12 h-5 bg-dark-600 rounded-full" />
              </div>
              <div className="w-3/4 h-6 bg-dark-600 rounded" />
              <div className="flex justify-between">
                <div className="w-32 h-4 bg-dark-600 rounded" />
                <div className="flex gap-2">
                  <div className="w-12 h-4 bg-dark-600 rounded" />
                  <div className="w-12 h-4 bg-dark-600 rounded" />
                  <div className="w-12 h-4 bg-dark-600 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// 에러 표시
// ============================================

function ErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h3 className="text-xl font-bold text-gray-200 mb-2">
        게시글을 불러올 수 없습니다
      </h3>
      <p className="text-gray-400 mb-4">
        {error.message || '알 수 없는 오류가 발생했습니다.'}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
      >
        다시 시도
      </button>
    </div>
  );
}

// ============================================
// 빈 상태 표시
// ============================================

function EmptyState() {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-gray-500 text-6xl mb-4">📝</div>
      <h3 className="text-xl font-bold text-gray-200 mb-2">
        게시글이 없습니다
      </h3>
      <p className="text-gray-400 mb-6">
        첫 번째 게시글을 작성해보세요!
      </p>
      <Link
        to="/write"
        className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
      >
        글쓰기
      </Link>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

interface PostListProps {
  category?: string;
}

export default function PostList({ category }: PostListProps) {
  const { data, isLoading, isError, error, refetch } = usePosts({ category });
  
  // 로딩 상태
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  // 에러 상태
  if (isError) {
    return <ErrorDisplay error={error as Error} onRetry={() => refetch()} />;
  }
  
  // 데이터 확인
  const posts = data?.posts || [];
  
  // 빈 상태
  if (posts.length === 0) {
    return <EmptyState />;
  }
  
  // 게시글 목록 렌더링
  return (
    <div className="bg-dark-700 rounded-lg overflow-hidden">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
