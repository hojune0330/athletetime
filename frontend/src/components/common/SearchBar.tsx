import { useState } from 'react'

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      console.log('Searching for:', searchTerm)
      // 검색 로직 구현
    }
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
          onBlur={() => setIsExpanded(false)}
          placeholder="선수, 기록, 대회 검색..."
          className="w-full px-4 py-2 pr-10 rounded-full bg-primary-800/30 border border-primary-400/30 text-white placeholder-white/60 text-sm focus:outline-none focus:bg-primary-800/40 focus:border-primary-400"
        />
        <button
          type="submit"
          className="absolute right-2 p-1.5 text-white/80 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
      
      {/* 최근 검색어 드롭다운 */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-50">
          <div className="p-3">
            <div className="text-xs text-gray-400 mb-2">최근 검색어</div>
            <div className="space-y-1">
              {['100m 기록', '마라톤 훈련', '서울마라톤', '육상 대회'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchTerm(term)}
                  className="block w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-dark-600 rounded"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}