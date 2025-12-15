import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  
  const goToMain = () => {
    navigate('/')
  }
  
  // 외부 도구 링크 (community 외부의 HTML 페이지)
  const getToolLink = (path: string) => {
    // /community/ base path 밖의 루트 경로로 이동
    return `/${path}`
  }
  
  // 외부 링크 클릭 핸들러 (React Router 우회)
  const handleExternalLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    window.location.href = getToolLink(path)
  }
  
  const isActive = (path: string) => {
    return location.pathname === path
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        {/* 메인 헤더 */}
        <div className="header-gradient">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* 로고 영역 */}
              <div className="flex items-center gap-3">
                <Link to="/" className="flex items-center gap-2">
                  <ClockIcon className="w-7 h-7 text-white" />
                  <div>
                    <span className="text-xl font-bold text-white">애타</span>
                    <span className="text-[10px] text-primary-100 ml-1 hidden sm:inline">AthleTime</span>
                  </div>
                </Link>
              </div>

              {/* 데스크톱 네비게이션 */}
              <nav className="hidden md:flex items-center gap-2">
                <Link
                  to="/"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive('/') ? 'bg-white/20 text-white' : 'text-primary-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🎭 익명
                </Link>
                <a
                  href={getToolLink('pace-calculator.html')}
                  onClick={(e) => handleExternalLink(e, 'pace-calculator.html')}
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all text-primary-100 hover:text-white hover:bg-white/10"
                >
                  ⏱️ 페이스
                </a>
                <a
                  href={getToolLink('training-calculator.html')}
                  onClick={(e) => handleExternalLink(e, 'training-calculator.html')}
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all text-primary-100 hover:text-white hover:bg-white/10"
                >
                  🏋️ 훈련
                </a>
                <a
                  href={getToolLink('chat.html')}
                  onClick={(e) => handleExternalLink(e, 'chat.html')}
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all text-primary-100 hover:text-white hover:bg-white/10"
                >
                  💬 채팅
                </a>
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

                {/* 회원관련(로그인) */}
                {isAuthenticated ? (
                  <>
                    {/* 알림 버튼 */}
                    {/* <button className="p-2 text-primary-100 hover:text-white transition-colors relative rounded-lg hover:bg-white/10">
                      <BellIcon className="w-5 h-5" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
                    </button> */}

                    {/* 프로필 드롭다운 */}
                    {/* <div className="relative">
                      <button 
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <UserCircleIcon className="w-6 h-6" />
                        <span className="hidden md:block text-sm font-medium">{user?.nickname}</span>
                      </button>

                      {userMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 animate-fadeIn">
                          <div className="px-4 py-3 border-b border-neutral-100">
                            <p className="text-sm font-semibold text-neutral-900">{user?.nickname}</p>
                            <p className="text-xs text-neutral-500">{user?.email}</p>
                          </div>
                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            👤 프로필
                          </Link>
                          <Link
                            to="/my-posts"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            📝 내 게시글
                          </Link>
                          <button
                            onClick={() => {
                              setUserMenuOpen(false)
                              logout()
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-danger-500 hover:bg-danger-50"
                          >
                            🚪 로그아웃
                          </button>
                        </div>
                      )}
                    </div> */}
                  </>
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

          {/* 드로어 내비게이션 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <button 
                onClick={() => { goToMain(); closeMobileMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 text-primary-600 font-medium"
              >
                <i className="fas fa-home text-lg"></i>
                <span>메인 홈</span>
              </button>

              <Link 
                to="/" 
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive('/') ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span className="text-lg">🎭</span>
                <span className="font-medium">익명게시판</span>
              </Link>

              <Link 
                to="/write" 
                onClick={closeMobileMenu}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <span className="text-lg">✍️</span>
                <span className="font-medium">글쓰기</span>
              </Link>

              <div className="pt-4 border-t border-neutral-100 mt-4">
                <p className="px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">도구</p>
                
                <a 
                  href={getToolLink('pace-calculator.html')}
                  onClick={(e) => handleExternalLink(e, 'pace-calculator.html')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <span className="text-lg">⏱️</span>
                  <span className="font-medium">페이스 계산기</span>
                </a>

                <a 
                  href={getToolLink('training-calculator.html')}
                  onClick={(e) => handleExternalLink(e, 'training-calculator.html')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <span className="text-lg">🏋️</span>
                  <span className="font-medium">훈련 계산기</span>
                </a>

                <a 
                  href={getToolLink('chat.html')}
                  onClick={(e) => handleExternalLink(e, 'chat.html')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <span className="text-lg">💬</span>
                  <span className="font-medium">실시간 채팅</span>
                </a>
              </div>
            </div>
          </nav>

          {/* 드로어 푸터 - 로그인/회원가입 */}
          {/* <div className="p-4 border-t border-neutral-100 safe-bottom">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <UserCircleIcon className="w-10 h-10 text-neutral-400" />
                  <div>
                    <p className="font-semibold text-neutral-900">{user?.nickname}</p>
                    <p className="text-xs text-neutral-500">{user?.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex-1 btn-secondary text-center"
                  >
                    프로필
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu()
                      logout()
                    }}
                    className="flex-1 btn text-danger-500 bg-danger-50 hover:bg-danger-100"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex-1 btn-secondary text-center"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="flex-1 btn-primary text-center"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div> */}
        </div>
      </div>
    </>
  )
}
