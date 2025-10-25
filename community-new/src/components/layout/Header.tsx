import { Link, useLocation } from 'react-router-dom'
import { 
  BellIcon,
  Bars3Icon,
  ClockIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const goToMain = () => {
    // 메인 홈페이지로 이동
    window.location.href = '/'
  }
  
  // 외부 도구 링크 생성 (프로덕션에서는 루트 기준)
  const getToolLink = (path: string) => {
    const isProd = import.meta.env.PROD
    return isProd ? `/${path}` : `/${path}`
  }
  
  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="sticky top-0 z-50">
      {/* 메인 헤더 - 심플하게 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* 로고 */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToMain}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                title="메인 홈페이지로"
              >
                <i className="fas fa-home text-sm"></i>
                <span className="text-sm font-medium">메인</span>
              </button>
              <Link to="/" className="flex items-center gap-2">
                <ClockIcon className="w-7 h-7 text-white" />
                <div>
                  <span className="text-xl font-bold text-white">애타</span>
                  <span className="text-[10px] text-primary-200 ml-1">AthleTime</span>
                </div>
              </Link>
            </div>

            {/* 심플한 메인 네비게이션 - 모바일 친화적 */}
            <nav className="hidden md:flex items-center gap-3">
              <Link
                to="/"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive('/') ? 'bg-white/20 text-white' : 'text-primary-100 hover:text-white hover:bg-white/10'
                }`}
              >
                🎭 익명
              </Link>
              <a
                href={getToolLink('pace-calculator.html')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all text-primary-100 hover:text-white hover:bg-white/10"
              >
                ⏱️ 페이스
              </a>
              <a
                href={getToolLink('training-calculator.html')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all text-primary-100 hover:text-white hover:bg-white/10"
              >
                🏋️ 훈련
              </a>
              <a
                href={getToolLink('competitions-calendar.html')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all text-primary-100 hover:text-white hover:bg-white/10"
              >
                📅 대회
              </a>
              <Link
                to="/write"
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all bg-white/10 text-white hover:bg-white/20 border border-white/20"
              >
                ✍️ 글쓰기
              </Link>
            </nav>

            {/* 우측 메뉴 - 심플하게 */}
            <div className="flex items-center gap-2">
              {/* 알림 버튼 */}
              <button className="p-2 text-primary-100 hover:text-white transition-colors relative">
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>

              {/* 프로필 버튼 */}
              <button className="p-2 text-primary-100 hover:text-white transition-colors">
                <UserCircleIcon className="w-6 h-6" />
              </button>

              {/* 모바일 메뉴 버튼 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-primary-100 hover:text-white"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 - 하단 고정 네비게이션 */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-600 z-50 shadow-xl">
          <nav className="grid grid-cols-3 gap-2 p-3">
            {/* 상단 행 */}
            <button 
              onClick={goToMain} 
              className="flex flex-col items-center p-3 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <i className="fas fa-home text-xl mb-1 text-blue-400"></i>
              <span className="text-xs text-blue-400 font-medium">메인</span>
            </button>
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-xl mb-1">🎭</span>
              <span className={`text-xs font-medium ${isActive('/') ? 'text-primary-400' : 'text-gray-400'}`}>익명게시판</span>
            </Link>
            <Link 
              to="/write" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-xl mb-1">✍️</span>
              <span className="text-xs font-medium text-gray-400">글쓰기</span>
            </Link>
            
            {/* 하단 행 - 도구 링크 */}
            <a 
              href={getToolLink('pace-calculator.html')}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-xl mb-1">⏱️</span>
              <span className="text-xs font-medium text-gray-400">페이스</span>
            </a>
            <a 
              href={getToolLink('training-calculator.html')}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-xl mb-1">🏋️</span>
              <span className="text-xs font-medium text-gray-400">훈련</span>
            </a>
            <a 
              href={getToolLink('competitions-calendar.html')}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-xl mb-1">📅</span>
              <span className="text-xs font-medium text-gray-400">대회</span>
            </a>
          </nav>
          
          {/* 닫기 버튼 */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors border-t border-dark-700"
          >
            닫기
          </button>
        </div>
      )}
    </header>
  )
}