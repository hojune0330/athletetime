import { Link, useParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useRef, useState, useEffect } from 'react'
import { cn } from '../../../lib/utils'
import { useBoardNavigation } from '../hooks'

export default function BoardNav() {
  const params = useParams<{ boardSlug?: string }>()
  const { boards, activeBoard } = useBoardNavigation(params.boardSlug)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const checkScroll = () => {
      setShowLeftArrow(container.scrollLeft > 0)
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      )
    }

    checkScroll()
    container.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [boards])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = 200
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <div className="relative border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1440px]">
        <div className="relative flex items-center">
          {/* 왼쪽 화살표 */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 z-10 flex h-full items-center bg-gradient-to-r from-white via-white to-transparent px-2"
              aria-label="이전 게시판"
            >
              <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
            </button>
          )}

          {/* 게시판 목록 */}
          <div
            ref={scrollContainerRef}
            className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide sm:px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <Link
              to="/"
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                !params.boardSlug
                  ? 'bg-brand-50 text-brand-700 shadow-subtle'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>전체</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {boards.reduce((acc, board) => acc + board.postCount, 0)}
              </span>
            </Link>

            {boards.map((board) => (
              <Link
                key={board.slug}
                to={`/boards/${board.slug}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  activeBoard?.slug === board.slug
                    ? 'bg-brand-50 text-brand-700 shadow-subtle'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <span>{board.name}</span>
                {board.postCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {board.postCount}
                  </span>
                )}
                {board.isNew && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    NEW
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* 오른쪽 화살표 */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 z-10 flex h-full items-center bg-gradient-to-l from-white via-white to-transparent px-2"
              aria-label="다음 게시판"
            >
              <ChevronRightIcon className="h-5 w-5 text-slate-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}