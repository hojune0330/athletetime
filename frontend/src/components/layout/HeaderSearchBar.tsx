import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

/**
 * 헤더 기록 검색바 — 2C-4 분할.
 *
 * Header.tsx에서 옮겨온 것:
 *   - recordSearchQuery / recordSearchInputRef 상태
 *   - submitRecordSearch(trim 검사 → /records?q= 이동)
 *   - handleRecordSearchKeyDown(한글 조합 방지 + form.requestSubmit)
 *
 * 자기완결 컴포넌트: 내부 state만으로 동작하며 Header와 무관하다.
 * (데스크톱 lg 너비에서만 노출되는 폼 — CSS는 사용처에서 클래스로 제어)
 */
export default function HeaderSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = query.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }

    navigate(`/records?q=${encodeURIComponent(trimmed)}`)
    setQuery('')
  }

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    if (event.nativeEvent.isComposing) return
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form role="search" onSubmit={submitSearch} className="hidden lg:flex w-56 items-center gap-1">
      <label className="sr-only" htmlFor="header-record-search">기록 검색</label>
      <input
        id="header-record-search"
        ref={inputRef}
        name="record-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="기록 검색"
        className="h-9 min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        aria-label="기록 검색"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
      </button>
    </form>
  )
}
