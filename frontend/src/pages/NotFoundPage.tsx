/**
 * NotFoundPage — 길을 잃은 사용자를 핵심 루프(기록 검색)로 되돌리는 화면.
 *
 * 오픈 첫 주 UX 신뢰 관점:
 * - 죽은 끝(dead-end) 대신 서비스의 존재 이유(내 기록 찾기)로 바로 이어지는 검색창을 둔다.
 * - 공유 링크가 데이터 정리로 바뀌었을 가능성을 사람 언어로 설명한다(미래약속·과장 없음).
 * - 디자인 토큰(ink/surface/line/brand)을 다른 화면과 통일해 "깨진 느낌"을 없앤다.
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

const recoveryLinks = [
  { to: '/records', label: '기록 검색', description: '이름·소속·종목으로 공개 기록 찾기' },
  { to: '/competitions', label: '대회 일정', description: '다가오는 대회와 공개된 결과' },
  { to: '/community', label: '커뮤니티', description: '기록과 훈련 이야기' },
]

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length >= 2) {
      navigate(`/records?q=${encodeURIComponent(trimmed)}`)
      return
    }
    navigate('/records')
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <p className="font-mono text-mono-sm uppercase tracking-widest-2 text-ink-4">404 · Page not found</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          이 주소의 화면을 찾지 못했어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          주소가 바뀌었거나, 공유받은 링크가 데이터 정리 과정에서 달라졌을 수 있어요.
          찾던 것이 선수 기록이라면 이름으로 다시 검색하는 게 가장 빨라요.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">기록 검색</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="선수 이름, 소속, 종목"
              className="h-11 w-full rounded-sm border border-line bg-surface pl-10 pr-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-sm bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-600"
          >
            기록 검색
          </button>
        </form>

        <div className="mt-8 divide-y divide-hair border-y border-hair">
          {recoveryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center justify-between gap-3 px-1 py-3.5 transition-colors hover:text-brand"
            >
              <span>
                <span className="text-sm font-medium text-ink-2 group-hover:text-brand">{link.label}</span>
                <span className="mt-0.5 block text-sm text-ink-4">{link.description}</span>
              </span>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-4" />
            </Link>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="rounded-sm border border-line px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            홈으로
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-sm px-4 py-2 text-sm font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            이전 화면으로
          </button>
        </div>
      </div>
    </div>
  )
}
