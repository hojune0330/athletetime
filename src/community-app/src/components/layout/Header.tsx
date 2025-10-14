import { Link, useLocation } from 'react-router-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useState } from 'react'

function Header() {
  const location = useLocation()
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-[1440px]">
        {/* 메인 헤더 */}
        <div className="flex items-center h-14 px-4">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-brand-600">애슬리트타임</span>
          </Link>

          {/* 중앙 메뉴 - 데스크톱 */}
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link 
              to="/?sort=popular" 
              className={`text-sm font-medium ${
                location.pathname === '/' && location.search.includes('popular') 
                  ? 'text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              인기글
            </Link>
            <Link 
              to="/?sort=latest" 
              className={`text-sm font-medium ${
                location.pathname === '/' && location.search.includes('latest') 
                  ? 'text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체글
            </Link>
            <div className="h-4 w-px bg-slate-300" />
            <Link to="/boards/running" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              러닝
            </Link>
            <Link to="/boards/marathon" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              마라톤
            </Link>
            <Link to="/boards/track" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              트랙
            </Link>
          </nav>

          {/* 오른쪽 메뉴 */}
          <div className="flex items-center gap-3 ml-auto">
            <Link 
              to="/write" 
              className="hidden sm:block px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
            >
              글쓰기
            </Link>
            <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
              회원가입
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
              로그인
            </button>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden ml-auto p-2"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-slate-200">
            <nav className="flex flex-col p-4 space-y-2">
              <Link to="/?sort=popular" className="py-2 text-sm font-medium text-slate-700">
                👍 인기글
              </Link>
              <Link to="/?sort=latest" className="py-2 text-sm font-medium text-slate-700">
                전체글
              </Link>
              <Link to="/boards/running" className="py-2 text-sm text-slate-600">
                러닝
              </Link>
              <Link to="/boards/marathon" className="py-2 text-sm text-slate-600">
                마라톤
              </Link>
              <Link to="/write" className="py-2 text-sm font-medium text-brand-600">
                ✍️ 글쓰기
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
