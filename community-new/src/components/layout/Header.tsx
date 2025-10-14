import { Link, useLocation } from 'react-router-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">침하하</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') && location.search.includes('popular')
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              인기글
            </Link>
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') && !location.search.includes('popular')
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              전체글
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <Link
              to="/board/free"
              className={`text-sm font-medium transition-colors ${
                isActive('/board/free')
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              자유
            </Link>
            <Link
              to="/board/humor"
              className={`text-sm font-medium transition-colors ${
                isActive('/board/humor')
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              유머
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <Link
              to="/write"
              className="hidden sm:block px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
            >
              글쓰기
            </Link>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              회원가입
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              로그인
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-200 p-4 space-y-2">
            <Link to="/?sort=popular" className="block py-2 text-sm font-medium text-gray-700">
              👍 인기글
            </Link>
            <Link to="/" className="block py-2 text-sm font-medium text-gray-700">
              전체글
            </Link>
            <Link to="/board/free" className="block py-2 text-sm text-gray-600">
              자유
            </Link>
            <Link to="/board/humor" className="block py-2 text-sm text-gray-600">
              유머
            </Link>
            <Link to="/write" className="block py-2 text-sm font-medium text-primary-600">
              ✏️ 글쓰기
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}