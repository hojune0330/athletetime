/**
 * 게시판 페이지 (v5.0.0 - 침하하 스타일 라이트 테마)
 *
 * 카테고리별 게시글 목록을 표시하는 페이지
 */

import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import PostList from '../components/post/PostList';
import Pagination from '../components/common/Pagination';
import { usePosts } from '../hooks/usePosts';

// 백엔드 API 카테고리 매핑
const boardToCategoryMap: Record<string, string> = {
  notice: '공지',
  free: '자유',
  training: '훈련',
  competition: '대회',
  equipment: '장비',
  question: '질문',
};

const boardInfo: Record<string, { name: string; description: string }> = {
  notice: { name: '공지사항', description: '중요한 공지와 안내' },
  free: { name: '자유게시판', description: '자유롭게 이야기를 나누는 공간' },
  training: { name: '훈련게시판', description: '훈련 방법과 팁 공유' },
  competition: { name: '대회게시판', description: '대회 정보와 후기' },
  equipment: { name: '장비게시판', description: '장비 리뷰와 추천' },
  question: { name: '질문게시판', description: '궁금한 점을 물어보세요' },
};

export default function BoardPage() {
  const { boardId } = useParams();
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const limit = 20;

  const board = boardInfo[boardId || ''] || { name: '게시판', description: '' };
  const category = boardToCategoryMap[boardId || ''] || undefined;

  // 카테고리별 게시글 조회
  const { data: postsData } = usePosts({ category, page, limit });

  return (
    <div>
      {/* Board Header */}
      <div className="mb-4">
        <Link
          to="/community"
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-sm text-neutral-500 transition-colors duration-200 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          커뮤니티
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900">{board.name}</h1>
        {board.description && (
          <p className="mt-1 text-sm text-neutral-500">{board.description}</p>
        )}
      </div>

      {/* Post List */}
      <PostList category={category} page={page} limit={limit} />

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          currentPage={page}
          totalPages={postsData ? Math.ceil(postsData.count / limit) : 1}
        />
      </div>

      <div className="h-20 md:hidden" />
    </div>
  );
}
