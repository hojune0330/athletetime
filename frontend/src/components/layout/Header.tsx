import { Link, useLocation } from 'react-router-dom'
import { 
  Bars3Icon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // 네비게이션 메뉴 아이템 (메인페이지와 동일)
  const navItems = [
    { path: '/community', label: '💬 익명 커뮤니티', mobileLabel: '익명 커뮤니티', emoji: '💬' },
    { path: '/pace-calculator', label: '⏱️ 페이스 계산기', mobileLabel: '페이스 계산기', emoji: '⏱️' },
    { path: '/training-calculator', label: '💪 훈련 계산기', mobileLabel: '훈련 계산기', emoji: '💪' },
    { path: '/chat', label: '💭 실시간 채팅', mobileLabel: '실시간 채팅', emoji: '💭' },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        {/* 메인 헤더 */}
        <div className="header-gradient">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* 로고 영역 */}
              <Link to="/" className="flex items-center gap-2">
                <ClockIcon className="w-7 h-7 text-white" />
                <div>
                  <span className="text-xl font-bold text-white">애타</span>
                  <span className="text-[10px] text-primary-100 ml-1 hidden sm:inline">AthleTime</span>
                </div>
              </Link>

              {/* 데스크톱 네비게이션 */}
              <nav className="hidden md:flex items-center gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive(item.path) 
                        ? 'bg-white/20 text-white' 
                        : 'text-primary-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* 모바일 메뉴 버튼 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* 모바일 드로어 메뉴 */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="flex flex-col h-full">
          {/* 드로어 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100">
            <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-primary-500" />
              <span className="text-lg font-bold text-neutral-900">애타</span>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="p-2 text-neutral-500 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 드로어 내비게이션 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* 네비게이션 아이템들 */}
              {navItems.map((item) => (
                <Link 
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path) 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="font-medium">{item.mobileLabel}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
