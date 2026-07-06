/**
 * 게시글 목록 컴포넌트 (v5.0.0 - Light Mode Design System v2)
 */

import { Link } from 'react-router-dom';
import { EyeIcon, HandThumbUpIcon, ChatBubbleLeftIcon, FireIcon } from '@heroicons/react/24/outline';
import { usePosts } from '../../hooks/usePosts';
import type { Post } from '../../types';
import QuickReaction from '../trending/QuickReaction';

// ============================================
// 유틸리티 함수
// ============================================

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

function isNewPost(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours < 24;
}

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
      to={`/community/post/${post.id}`}
      className="block hover:bg-primary-50/50 transition-all duration-200 group"
    >
      <article className="p-4 border-b border-neutral-100 group-hover:border-l-4 group-hover:border-l-primary-500 group-hover:pl-3 transition-all">
        <div className="flex gap-4">
          {/* 썸네일 */}
          {thumbnail && (
            <div className="shrink-0">
              <img 
                src={thumbnail}
                alt={post.title}
                className="w-20 h-16 object-cover rounded-lg shadow-sm"
                loading="lazy"
              />
            </div>
          )}
          
          {/* 게시글 정보 */}
          <div className="flex-1 min-w-0">
            {/* 상단: 카테고리 + 뱃지 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* 공지사항 */}
              {post.is_notice && (
                <span className="text-accent-500 text-sm">📌</span>
              )}
              
{/* 카테고리 (자유는 백엔드에서 null 반환) */}
              {post.category_name && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100"
                  style={{ color: post.category_color || '#6366f1' }}
                >
                  <span>{post.category_icon}</span>
                  <span>{post.category_name}</span>
                </span>
              )}
              
              {/* HOT 뱃지 */}
              {isHot && (
                <span className="badge-hot flex items-center gap-1">
                  <FireIcon className="w-3 h-3" />
                  HOT
                </span>
              )}
              
              {/* NEW 뱃지 */}
              {isNew && !isHot && (
                <span className="badge-new">NEW</span>
              )}
            </div>
            
            {/* 제목 */}
            <h3 className="text-base font-semibold text-neutral-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {post.title}
            </h3>
            
            {/* 하단: 메타 정보 */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-3">
                <span className="font-medium text-neutral-600">{post.author}</span>
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-3.5 h-3.5" />
                  {post.views}
                </span>
                <span className="flex items-center gap-1 text-primary-500">
                  <HandThumbUpIcon className="w-3.5 h-3.5" />
                  {post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                  {post.comments_count}
                </span>
              </div>
            </div>

            {/* 빠른 이모지 리액션 */}
            <div className="mt-2" onClick={(e) => e.preventDefault()}>
              <QuickReaction
                targetId={post.id}
                targetType="post"
                compact={true}
              />
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
    <div className="card overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 border-b border-neutral-100 last:border-b-0">
          <div className="flex gap-4">
            <div className="skeleton w-20 h-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <div className="skeleton w-16 h-5 rounded-full" />
                <div className="skeleton w-12 h-5 rounded-full" />
              </div>
              <div className="skeleton w-3/4 h-5 rounded" />
              <div className="flex justify-between">
                <div className="skeleton w-32 h-4 rounded" />
                <div className="flex gap-3">
                  <div className="skeleton w-10 h-4 rounded" />
                  <div className="skeleton w-10 h-4 rounded" />
                  <div className="skeleton w-10 h-4 rounded" />
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
  const status = (error as Error & { response?: { status?: number } }).response?.status;
  const isAuthError = status === 401 || /401/.test(error.message);

  if (isAuthError) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3 className="empty-state-title">
            로그인하면 글을 볼 수 있어요
          </h3>
          <p className="empty-state-description">
            커뮤니티 글과 댓글은 로그인한 뒤에 확인할 수 있어요.
          </p>
          <Link
            to="/login"
            className="btn-primary"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">🛠️</div>
        <h3 className="empty-state-title">
          커뮤니티를 준비 중이에요
        </h3>
        <p className="empty-state-description">
          지금은 게시글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={onRetry}
          className="btn-primary"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

// ============================================
// 빈 상태 표시
// ============================================

function EmptyState() {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <h3 className="empty-state-title">
          아직 올라온 글이 없어요
        </h3>
        <p className="empty-state-description">
          첫 글을 남겨 이야기를 시작해 보세요.
        </p>
        <Link
          to="/write"
          className="btn-primary"
        >
          글쓰기
        </Link>
      </div>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

interface PostListProps {
  category?: string;
  sort?: 'latest' | 'hot' | 'comment';
  page?: number;
  limit?: number;
}

export default function PostList({ category, sort = 'latest', page = 1, limit = 20 }: PostListProps) {
  const { data, isLoading, isError, error, refetch } = usePosts({ category, sort, page, limit });
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (isError) {
    return <ErrorDisplay error={error as Error} onRetry={() => refetch()} />;
  }
  
  const posts = data?.posts || [];
  
  if (posts.length === 0) {
    return <EmptyState />;
  }
  
  return (
    <div className="card overflow-hidden">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
