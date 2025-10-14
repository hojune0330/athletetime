import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useBoardNavigation } from '../../features/board/hooks'
import { formatDate } from '../../lib/utils'

const SERVICE_NOTICES = [
  {
    id: 'beta-policy',
    title: '베타 운영 정책 안내',
    description:
      '익명 게시판은 2025년 10월 13일 기준으로 베타 서비스 중입니다. 게시글과 댓글은 서버에 영구 저장되며, 비밀번호 분실 시 수정/삭제가 불가능합니다.',
    publishedAt: '2025-10-13T00:00:00+09:00',
  },
  {
    id: 'report-guide',
    title: '신고 처리 및 블라인드 기준',
    description:
      '커뮤니티 수칙 위반 게시글은 신고 10회 누적 시 자동으로 블라인드 처리되며, 운영팀 검토 후 추가 조치가 진행됩니다.',
    publishedAt: '2025-10-07T00:00:00+09:00',
  },
] as const

function LeftSidebar() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const boardSlug = segments[0] === 'boards' ? segments[1] : undefined
  const { boards } = useBoardNavigation(boardSlug)

  const highlightedBoards = useMemo(
    () =>
      boards
        .filter((board) => board.isActive)
        .sort((a, b) => a.order - b.order)
        .slice(0, 12),
    [boards],
  )

  return (
    <div className="sticky top-[140px] space-y-5">
      <section className="card overflow-hidden">
        <header className="border-b border-slate-100 bg-ink-50/80 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-700">주요 게시판</h2>
        </header>
        <nav className="max-h-[420px] space-y-1 overflow-y-auto px-4 py-3" aria-label="주요 게시판">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-500/90 text-white shadow-subtle' : 'text-ink-600 hover:bg-slate-100'
              }`
            }
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">🏠</span>
              전체 게시글
            </span>
          </NavLink>
          {highlightedBoards.map((board) => (
            <NavLink
              key={board.id}
              to={`/boards/${board.slug}`}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-brand-500/90 text-white shadow-subtle' : 'text-ink-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{board.icon ?? '🏃'}</span>
                <span className="truncate">{board.name}</span>
              </span>
              <span className="text-xs text-ink-400">{board.todayPostCount ?? 0}건</span>
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="card overflow-hidden">
        <header className="border-b border-slate-100 bg-white px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-700">서비스 공지</h2>
        </header>
        <ul className="space-y-3 px-5 py-4 text-sm text-ink-600">
          {SERVICE_NOTICES.map((notice) => (
            <li key={notice.id} className="space-y-1">
              <p className="font-semibold text-ink-700">{notice.title}</p>
              <p className="text-xs leading-relaxed text-ink-500">{notice.description}</p>
              <span className="text-[11px] text-ink-400">{formatDate(notice.publishedAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card px-5 py-4">
        <h2 className="text-sm font-semibold text-ink-700">운영팀 연락처</h2>
        <p className="mt-2 text-xs text-ink-500">
          서비스 개선 요청이나 긴급 신고는{' '}
          <a href="mailto:community@athletetime.kr" className="font-medium text-brand-600 hover:underline">
            community@athletetime.kr
          </a>
          로 보내주세요. 베타 전용 슬랙 채널은 2025년 11월 오픈 예정입니다.
        </p>
      </section>
    </div>
  )
}

export default LeftSidebar
