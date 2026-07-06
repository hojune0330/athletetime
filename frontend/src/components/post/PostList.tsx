/**
 * 게시글 목록 컴포넌트 (v6.0.0 - 침하하 스타일 밀도 높은 리스트)
 *
 * 한 줄 밀도 높은 행: 카테고리 라벨 · 제목 · 댓글 수 · 썸네일 ·
 * 좋아요/작성자/조회수/시간 메타 행. 시선 이동을 최소화한다.
 */

import { Link } from 'react-router-dom';
import { EyeIcon, HandThumbUpIcon, ChatBubbleLeftIcon, FireIcon } from '@heroicons/react/24/outline';
import { usePosts } from '../../hooks/usePosts';
import type { Post } from '../../types';

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

  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
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
// 게시글 아이템 컴포넌트 (침하하식 밀도 행)
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
      className="block cursor-pointer transition-colors duration-150 hover:bg-neutral-50"
    >
      <article className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        {/* 본문 영역 */}
        <div className="min-w-0 flex-1">
          {/* 제목 행: 카테고리 라벨 + 제목 + 댓글 수 */}
          <div className="flex items-baseline gap-2">
            {post.is_notice ? (
              <span className="shrink-0 rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold text-accent-600">
                공지
              </span>
            ) : post.category_name ? (
              <span
                className="shrink-0 text-xs font-semibold"
                style={{ color: post.category_color || '#6366f1' }}
              >
                {post.category_name}
              </span>
            ) : null}

            <h3 className="min-w-0 truncate text-[15px] font-medium text-neutral-900">
              {post.title}
            </h3>

            {post.comments_count > 0 && (
              <span className="shrink-0 text-xs font-bold text-primary-600">
                [{post.comments_count}]
              </span>
            )}

            {isHot && (
              <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-accent-600">
                <FireIcon className="h-3 w-3" />
                HOT
              </span>
            )}
            {isNew && !isHot && (
              <span className="shrink-0 text-[10px] font-bold text-success-600">N</span>
            )}
          </div>

          {/* 메타 행: 좋아요 · 작성자 · 조회수 · 시간 */}
          <div className="mt-1 flex items-center gap-2.5 text-xs text-neutral-500">
            <span className="flex items-center gap-0.5 text-primary-600">
              <HandThumbUpIcon className="h-3.5 w-3.5" />
              {post.likes_count}
            </span>
            <span className="font-medium text-neutral-600">{post.author}</span>
            <span className="flex items-center gap-0.5">
              <EyeIcon className="h-3.5 w-3.5" />
              {post.views}
            </span>
            <span className="flex items-center gap-0.5">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
              {post.comments_count}
            </span>
            <span>{formatRelativeTime(post.created_at)}</span>
          </div>
        </div>

        {/* 썸네일 (우측 정렬, 침하하식) */}
        {thumbnail && (
          <img
            src={thumbnail}
            alt={post.title}
            className="h-14 w-[72px] shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        )}
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
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="skeleton h-4 w-10 rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
          <div className="skeleton h-14 w-[72px] shrink-0 rounded-lg" />
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
