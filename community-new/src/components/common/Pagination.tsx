import { Link, useLocation } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const location = useLocation()
  const baseUrl = location.pathname

  // 표시할 페이지 번호 계산
  const getPageNumbers = () => {
    const delta = 2 // 현재 페이지 전후로 보여줄 페이지 수
    const range: number[] = []
    const rangeWithDots: (number | string)[] = []
    let l: number | undefined

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i)
      }
    }

    range.forEach((i) => {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      l = i
    })

    return rangeWithDots
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex justify-center items-center gap-1 py-4">
      {/* 이전 페이지 */}
      <Link
        to={`${baseUrl}?page=${Math.max(1, currentPage - 1)}`}
        className={`p-2 rounded transition-colors ${
          currentPage === 1
            ? 'text-gray-600 cursor-not-allowed pointer-events-none'
            : 'text-gray-400 hover:bg-dark-600 hover:text-white'
        }`}
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </Link>

      {/* 페이지 번호 */}
      {pageNumbers.map((page, index) => (
        <div key={index}>
          {page === '...' ? (
            <span className="px-3 py-1 text-gray-600">...</span>
          ) : (
            <Link
              to={`${baseUrl}?page=${page}`}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:bg-dark-600 hover:text-primary-400'
              }`}
            >
              {page}
            </Link>
          )}
        </div>
      ))}

      {/* 다음 페이지 */}
      <Link
        to={`${baseUrl}?page=${Math.min(totalPages, currentPage + 1)}`}
        className={`p-2 rounded transition-colors ${
          currentPage === totalPages
            ? 'text-gray-600 cursor-not-allowed pointer-events-none'
            : 'text-gray-400 hover:bg-dark-600 hover:text-white'
        }`}
      >
        <ChevronRightIcon className="w-4 h-4" />
      </Link>
    </div>
  )
}