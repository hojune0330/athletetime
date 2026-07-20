/**
 * 커뮤니티 게시판 탭 (침하하 스타일 게시판 내비게이션)
 *
 * 전체글 + 카테고리별 게시판을 가로 탭으로 배치한다.
 * 백엔드 categories 테이블과 매핑되며, 카테고리 API가 비어 있어도
 * 기본 게시판 목록으로 동작한다.
 */

import { Link } from 'react-router-dom'
import { useCategories } from '../../hooks/usePosts'

export type BoardTab = {
  readonly key: string
  readonly label: string
  readonly category?: string
  readonly href?: string
}

export const DEFAULT_BOARDS: readonly BoardTab[] = [
  { key: 'all', label: '전체글' },
  { key: 'magazine', label: '매거진', href: '/community/magazine' },
  { key: 'free', label: '자유', category: '자유' },
  { key: 'training', label: '훈련', category: '훈련' },
  { key: 'competition', label: '대회', category: '대회' },
  { key: 'equipment', label: '장비', category: '장비' },
  { key: 'question', label: '질문', category: '질문' },
  { key: 'notice', label: '공지', category: '공지' },
]

type CommunityBoardTabsProps = {
  readonly activeKey: string
  readonly onSelect: (tab: BoardTab) => void
}

export function CommunityBoardTabs({ activeKey, onSelect }: CommunityBoardTabsProps) {
  const { data: categories } = useCategories()

  // 백엔드 카테고리가 있으면 기본 게시판 뒤에 미지원 카테고리를 추가
  const knownNames = new Set(DEFAULT_BOARDS.map((board) => board.category).filter(Boolean))
  const extraBoards: BoardTab[] = (categories ?? [])
    .filter((category) => !knownNames.has(category.name))
    .map((category) => ({
      key: `category-${category.id}`,
      label: category.name,
      category: category.name,
    }))

  const boards = [...DEFAULT_BOARDS, ...extraBoards]

  return (
    <nav
      aria-label="게시판"
      className="mb-4 flex gap-0 overflow-x-auto border-b border-neutral-200 scrollbar-hide"
    >
      {boards.map((board) => {
        const isActive = board.key === activeKey
        if (board.href) {
          return (
            <Link
              key={board.key}
              to={board.href}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
              }`}
            >
              {board.label}
            </Link>
          )
        }
        return (
          <button
            key={board.key}
            type="button"
            onClick={() => onSelect(board)}
            aria-current={isActive ? 'page' : undefined}
            className={`shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
              isActive
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
            }`}
          >
            {board.label}
          </button>
        )
      })}
    </nav>
  )
}
