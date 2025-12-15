import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  
  const goToMain = () => {
    navigate('/')
  }
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // 네비게이션 메뉴 아이템 - React Router 링크로 변경
  const navItems = [
    { path: '/community', label: '🎭 익명', mobileLabel: '익명게시판', emoji: '🎭' },
    { path: '/pace-calculator', label: '⏱️ 페이스', mobileLabel: '페이스 계산기', emoji: '⏱️' },
    { path: '/training-calculator', label: '🏋️ 훈련', mobileLabel: '훈련 계산기', emoji: '🏋️' },
    { path: '/chat', label: '💬 채팅', mobileLabel: '실시간 채팅', emoji: '💬' },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        {/* 메인 헤더 */}
        <div className="header-gradient">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* 로고 영역 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={goToMain}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                  title="메인 홈페이지로"
                >
                  <span className="text-sm">🏠</span>
                  <span className="text-sm font-medium hidden sm:inline">메인</span>
                </button>
                <Link to="/" className="flex items-center gap-2">
                  <ClockIcon className="w-7 h-7 text-white" />
                  <div>
                    <span className="text-xl font-bold text-white">애타</span>
                    <span className="text-[10px] text-primary-100 ml-1 hidden sm:inline">AthleTime</span>
                  </div>
                </Link>
              </div>

              {/* 데스크톱 네비게이션 - React Router Link 사용 */}
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
                <Link
                  to="/write"
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all bg-white/10 text-white hover:bg-white/20 border border-white/20"
                >
                  ✍️ 글쓰기
                </Link>
              </nav>

              {/* 우측 메뉴 */}
              <div className="flex items-center gap-2">
                {/* 검색 버튼 */}
                <button 
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 text-primary-100 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>

                {/* 회원관련(로그인) - 추후 활성화 */}
                {isAuthenticated ? (
                  <>{/* 로그인 상태 UI */}</>
                ) : null}

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
        </div>

        {/* 검색 바 (펼침) */}
        {searchOpen && (
          <div className="bg-white border-t border-neutral-100 px-4 py-3 animate-fadeIn">
            <div className="container mx-auto">
              <div className="relative max-w-xl mx-auto">
                <input
                  type="text"
                  placeholder="게시글 검색..."
                  className="input pl-10"
                  autoFocus
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
            </div>
          </div>
        )}
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
            <div className="flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-primary-500" />
              <span className="text-lg font-bold text-neutral-900">애타</span>
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 text-neutral-500 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 드로어 내비게이션 - React Router Link 사용 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* 메인 홈 버튼 */}
              <button 
                onClick={() => { goToMain(); closeMobileMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 text-primary-600 font-medium"
              >
                <span className="text-lg">🏠</span>
                <span>메인 홈</span>
              </button>

              {/* 네비게이션 아이템들 - React Router Link */}
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

              {/* 글쓰기 */}
              <Link 
                to="/write" 
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive('/write') 
                    ? 'bg-primary-50 text-primary-600' 
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span className="text-lg">✍️</span>
                <span className="font-medium">글쓰기</span>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
