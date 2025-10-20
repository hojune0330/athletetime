import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
}

function Pagination({ page, totalPages }: PaginationProps) {
  const location = useLocation()
  const search = new URLSearchParams(location.search)

  if (totalPages <= 1) return null

  const makeLink = (targetPage: number) => {
    const params = new URLSearchParams(search)
    params.set('page', String(targetPage))
    return `${location.pathname}?${params.toString()}`
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 7)

  return (
    <nav className="mt-6 flex items-center justify-center gap-2 text-sm" aria-label="게시글 페이지네이션">
      <Link
        to={makeLink(Math.max(page - 1, 1))}
        className={cn('btn-ghost px-3 py-1', page === 1 && 'pointer-events-none text-ink-300')}
        aria-disabled={page === 1}
      >
        이전
      </Link>
      {pages.map((pageNumber) => (
        <Link
          key={pageNumber}
          to={makeLink(pageNumber)}
          className={cn(
            'rounded-lg px-3 py-1 font-medium',
            pageNumber === page ? 'bg-brand-600 text-white shadow-subtle' : 'text-ink-600 hover:bg-slate-100',
          )}
          aria-current={pageNumber === page ? 'page' : undefined}
        >
          {pageNumber}
        </Link>
      ))}
      <Link
        to={makeLink(Math.min(page + 1, totalPages))}
        className={cn('btn-ghost px-3 py-1', page === totalPages && 'pointer-events-none text-ink-300')}
        aria-disabled={page === totalPages}
      >
        다음
      </Link>
    </nav>
  )
}

export default Pagination
