import { NavLink, useLocation } from 'react-router-dom'
import { useBoardNavigation } from '../../features/board/hooks'

function LeftSidebar() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const boardSlug = segments[0] === 'boards' ? segments[1] : undefined
  const { boards } = useBoardNavigation(boardSlug)

  return (
    <div className="sticky top-[96px] space-y-4">
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-500">게시판</h2>
        <nav className="space-y-1" aria-label="게시판 선택">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-slate-100'
              }`
            }
            end
          >
            <span>전체 게시글</span>
          </NavLink>
          {boards.map((board) => (
            <NavLink
              key={board.id}
              to={`/boards/${board.slug}`}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{board.icon ?? '🏃'}</span>
                {board.name}
              </span>
              <span className="pill bg-white/80 text-xs text-ink-500 shadow-sm">
                +{board.todayPostCount}
              </span>
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-500">베타 이용 안내</h2>
        <ul className="space-y-2 text-xs text-ink-500">
          <li>• 모든 게시글은 비밀번호 기반으로 수정/삭제할 수 있습니다.</li>
          <li>• 신고 10회 이상 시 자동으로 블라인드 처리됩니다.</li>
          <li>• 회원 기능은 준비 중이며, 향후 계정 연동 예정입니다.</li>
        </ul>
      </section>
    </div>
  )
}

export default LeftSidebar
