import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import type { FormEvent } from 'react'

function Header() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!keyword.trim()) {
      return
    }

    navigate({ pathname: '/', search: `?q=${encodeURIComponent(keyword.trim())}` })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600 shadow-subtle">
              ATHLETETIME
            </span>
            <span className="text-lg font-bold tracking-tight text-ink-900 sm:text-xl">커뮤니티</span>
          </div>
        </Link>

        <form
          onSubmit={handleSearch}
          className="relative hidden flex-1 items-center md:flex"
          role="search"
          aria-label="게시글 검색"
        >
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="검색어를 입력해주세요 (베타)"
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-ink-800 shadow-inner focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 text-xs sm:text-sm">
          <Link to="/write" className="btn-primary hidden sm:inline-flex">
            <PencilSquareIcon className="mr-2 h-4 w-4" />
            새 글쓰기
          </Link>
          <button
            type="button"
            className="btn-ghost cursor-not-allowed text-ink-400"
            title="베타 기간 동안 회원 기능 준비중"
            disabled
          >
            로그인 준비중
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 md:hidden">
        <form onSubmit={handleSearch} className="relative" role="search">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="검색어를 입력해주세요 (베타)"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </form>
      </div>
    </header>
  )
}

export default Header
