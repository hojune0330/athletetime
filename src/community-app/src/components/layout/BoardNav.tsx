import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useBoards } from '../../features/board/hooks'

function BoardNav() {
  const { data: boards, isLoading } = useBoards()

  const orderedBoards = useMemo(
    () =>
      (boards ?? [])
        .filter((board) => board.isActive)
        .sort((a, b) => a.order - b.order),
    [boards],
  )

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center gap-2 overflow-x-auto py-2 text-sm text-ink-500 no-scrollbar"
          role="navigation"
          aria-label="게시판 바로가기"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center rounded-full px-3 py-1.5 font-medium transition ${
                isActive
                  ? 'bg-brand-500 text-white shadow-subtle'
                  : 'bg-slate-100 text-ink-500 hover:bg-slate-200'
              }`
            }
          >
            전체
          </NavLink>
          {isLoading ? (
            <div className="flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={`board-skeleton-${index}`}
                  className="inline-flex h-8 w-20 animate-pulse rounded-full bg-slate-100"
                />
              ))}
            </div>
          ) : (
            orderedBoards.map((board) => (
              <NavLink
                key={board.id}
                to={`/boards/${board.slug}`}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 font-medium transition ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-subtle'
                      : 'bg-slate-100 text-ink-500 hover:bg-slate-200'
                  }`
                }
              >
                {board.icon ? <span aria-hidden="true">{board.icon}</span> : null}
                <span>{board.name}</span>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default BoardNav
