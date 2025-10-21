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
    const currentHost = window.location.hostname
    if (currentHost.includes('e2b.dev')) {
      // sandbox 환경에서는 포트 8080으로
      const parts = currentHost.split('-')
      const sandboxId = parts[1] + '-' + parts[2]
      window.location.href = `https://8080-${sandboxId}.e2b.dev`
    } else {
      // 로컬 환경
      window.location.href = 'http://localhost:8080'
    }
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
              <Link
                to="/events"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  location.pathname.includes('/events') ? 'bg-white/20 text-white' : 'text-primary-100 hover:text-white hover:bg-white/10'
                }`}
              >
                🏆 대회
              </Link>
              <Link
                to="/track"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  location.pathname.includes('/track') ? 'bg-white/20 text-white' : 'text-primary-100 hover:text-white hover:bg-white/10'
                }`}
              >
                🏃 종목별
              </Link>
              <Link
                to="/market"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive('/market') ? 'bg-white/20 text-white' : 'text-primary-100 hover:text-white hover:bg-white/10'
                }`}
              >
                🛒 중고거래
              </Link>
              <Link
                to="/community"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive('/community') ? 'bg-white/20 text-white' : 'text-primary-100 hover:text-white hover:bg-white/10'
                }`}
              >
                💬 커뮤니티
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-600 z-50">
          <nav className="grid grid-cols-6 gap-1 p-2">
            <button onClick={goToMain} className="flex flex-col items-center p-2 text-xs">
              <i className="fas fa-home text-lg mb-1 text-blue-400"></i>
              <span className="text-blue-400">메인</span>
            </button>
            <Link to="/" className="flex flex-col items-center p-2 text-xs">
              <span className="text-lg mb-1">🎭</span>
              <span className={isActive('/') ? 'text-primary-400' : 'text-gray-400'}>익명</span>
            </Link>
            <Link to="/events" className="flex flex-col items-center p-2 text-xs">
              <span className="text-lg mb-1">🏆</span>
              <span className={location.pathname.includes('/events') ? 'text-primary-400' : 'text-gray-400'}>대회</span>
            </Link>
            <Link to="/track" className="flex flex-col items-center p-2 text-xs">
              <span className="text-lg mb-1">🏃</span>
              <span className={location.pathname.includes('/track') ? 'text-primary-400' : 'text-gray-400'}>종목</span>
            </Link>
            <Link to="/market" className="flex flex-col items-center p-2 text-xs">
              <span className="text-lg mb-1">🛒</span>
              <span className={isActive('/market') ? 'text-primary-400' : 'text-gray-400'}>중고</span>
            </Link>
            <Link to="/community" className="flex flex-col items-center p-2 text-xs">
              <span className="text-lg mb-1">💬</span>
              <span className={isActive('/community') ? 'text-primary-400' : 'text-gray-400'}>더보기</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}