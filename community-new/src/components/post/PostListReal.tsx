/**
 * 실제 API 연동된 게시글 목록 컴포넌트
 */

import { Link } from 'react-router-dom';
import { 
  EyeIcon, 
  HandThumbUpIcon,
  FireIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { usePosts } from '../../hooks/usePosts';
import type { Post } from '../../types';

// 시간 포맷팅 유틸리티
function formatDate(dateString: string): string {
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
 * 게시글 아이템 컴포넌트
 */
function PostItem({ post }: { post: Post }) {
  // 백엔드에서 제공하는 카테고리 색상/아이콘 사용
  const categoryColor = post.categoryColor || '#9CA3AF'; // 기본값: gray-400
  const categoryIcon = post.categoryIcon || '📝';
  const viewsCount = post.views;
  const likesCount = post.likesCount;
  const commentsCount = post.commentsCount;
  const isHot = likesCount >= 20; // 좋아요 20개 이상
  const isNew = new Date(post.date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  
  return (
    <Link
      to={`/post/${post.id}`}
      className="block"
    >
      <article className="card-dark hover:bg-dark-500 transition-all duration-200 p-4 border-l-4 hover:border-l-primary-400 border-l-transparent">
        <div className="flex gap-4">
          {/* 썸네일 (이미지가 있는 경우) */}
          {post.images && Array.isArray(post.images) && post.images.length > 0 && post.images[0]?.cloudinaryUrl && (
            <div className="shrink-0">
              <img 
                src={post.images[0].cloudinaryUrl} 
                alt={post.title}
                className="w-24 h-16 object-cover rounded-lg"
              />
            </div>
          )}
          
          {/* 게시글 내용 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {/* 고정 게시글 */}
                  {post.isNotice && (
                    <span className="text-track-yellow text-sm">📌</span>
                  )}
                  
                  {/* 카테고리 */}
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-dark-700"
                    style={{ color: categoryColor }}
                  >
                    <span>{categoryIcon}</span>
                    <span>{post.category}</span>
                  </span>
                  
                  {/* 뱃지 */}
                  {isHot && (
                    <span className="badge-hot">
                      <FireIcon className="w-3 h-3 mr-1" />
                      HOT
                    </span>
                  )}
                  {isNew && (
                    <span className="badge-new">NEW</span>
                  )}
                </div>
                
                {/* 제목 */}
                <h3 className="text-base font-medium text-gray-100 hover:text-primary-400 transition-colors line-clamp-1">
                  {post.title}
                </h3>
              </div>
            </div>
            
            {/* 메타 정보 */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{post.author}</span>
                <span>{formatDate(post.date)}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-3.5 h-3.5" />
                  {viewsCount}
                </span>
                <span className="flex items-center gap-1 text-primary-400">
                  <HandThumbUpIcon className="w-3.5 h-3.5" />
                  {likesCount}
                </span>
                <span className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                  {commentsCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

/**
 * 게시글 목록 컴포넌트
 */
export default function PostListReal() {
  const { data: postsData, isLoading, isError, error } = usePosts();
  const posts = postsData?.posts || [];
  
  // 디버깅 로그
  console.log('[PostListReal] 상태:', { 
    isLoading, 
    isError, 
    postsCount: posts?.length,
    error: error?.message 
  });
  
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-4 p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        <p className="text-gray-400">게시글을 불러오는 중...</p>
      </div>
    );
  }
  
  // 에러 상태
  if (isError) {
    return (
      <div className="space-y-4 p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-gray-200 mb-2">
          게시글을 불러올 수 없습니다
        </h3>
        <p className="text-gray-400 mb-4">
          {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }
  
  // 데이터 없음
  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-4 p-8 text-center">
        <div className="text-gray-500 text-6xl mb-4">📝</div>
        <h3 className="text-xl font-bold text-gray-200 mb-2">
          게시글이 없습니다
        </h3>
        <p className="text-gray-400 mb-4">
          첫 번째 게시글을 작성해보세요!
        </p>
        <Link
          to="/write"
          className="inline-block px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          글쓰기
        </Link>
      </div>
    );
  }
  
  // 게시글 목록 렌더링
  return (
    <div className="space-y-0.5">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
