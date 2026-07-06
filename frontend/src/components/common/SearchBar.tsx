import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const submitSearch = (term: string) => {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      return
    }
    navigate(`/records?q=${encodeURIComponent(trimmed)}`)
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    submitSearch(searchTerm)
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className={`flex items-center transition-all duration-200 ${
        isExpanded ? 'w-64' : 'w-48'
      }`}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => setTimeout(() => setIsExpanded(false), 120)}
          placeholder="선수 이름, 소속, 종목"
          className="w-full rounded-sm border border-line bg-surface px-3 py-2 pr-9 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="absolute right-2 p-1.5 text-ink-3 hover:text-ink"
          aria-label="기록 검색"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </form>
  )
}
