import { Link, NavLink, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

type NavItem = {
  label: string
  to?: string
  end?: boolean
  disabled?: boolean
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { label: '전체글', to: '/', end: true },
  { label: '공지사항', to: '/?section=notices' },
  { label: '서비스 업데이트', disabled: true },
  { label: '계정 준비중', disabled: true },
]

function Header() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const activeNavItems = useMemo(
    () =>
      NAV_ITEMS.map((item, index) => ({
        ...item,
        key: item.to ?? `nav-item-${index}-${item.label}`,
      })),
    [],
  )

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!keyword.trim()) {
      return
    }

    navigate({ pathname: '/', search: `?q=${encodeURIComponent(keyword.trim())}` })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100/60 bg-white/95 shadow-sm backdrop-blur">
      <div className="border-b border-ink-100/80 bg-ink-900/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-1.5 text-[11px] font-medium text-ink-100 sm:px-6 lg:px-8">
          <span className="uppercase tracking-wide text-brand-100">Beta 운영 중</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-ink-200">로그인 없이도 익명으로 이용 가능합니다.</span>
            <span className="text-brand-200">계정 기능은 준비 중입니다.</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-subtle">
            AthleteTime
          </span>
          <span className="text-xl font-bold tracking-tight text-ink-900">익명 게시판</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="주요 메뉴">
          {activeNavItems.map((item) =>
            item.disabled || !item.to ? (
              <span
                key={item.key}
                className="cursor-not-allowed rounded-lg px-3 py-2 text-sm font-semibold text-ink-300"
                title="준비 중"
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-brand-500 text-white shadow-subtle' : 'text-ink-500 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="ml-auto hidden min-w-[200px] items-center md:flex">
          <form
            onSubmit={handleSearch}
            className="relative w-full"
            role="search"
            aria-label="게시글 검색"
          >
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="검색어를 입력하세요"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-4 text-sm text-ink-700 shadow-inner focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Link to="/write" className="btn-primary hidden sm:inline-flex">
            <PencilSquareIcon className="mr-2 h-4 w-4" />
            글쓰기
          </Link>
          <button
            type="button"
            className="btn-ghost cursor-not-allowed text-ink-400"
            title="베타 기간 동안 회원 기능 준비 중"
            disabled
          >
            로그인 준비중
          </button>
        </div>
      </div>

      <div className="border-t border-ink-100/60 bg-ink-50/80 px-4 py-2 md:hidden">
        <form onSubmit={handleSearch} className="relative" role="search" aria-label="게시글 검색">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="검색어를 입력해주세요"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </form>
      </div>
    </header>
  )
}

export default Header
