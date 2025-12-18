import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import * as authApi from '../../api/auth'

interface User {
  id: number;
  email: string;
  nickname: string;
  username: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // 로그인 상태 관리
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  
  // 토큰에서 사용자 정보 불러오기
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setIsLoadingUser(false)
        return
      }
      
      try {
        const response = await authApi.getMe()
        if (response.success && response.user) {
          setUser(response.user)
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      } finally {
        setIsLoadingUser(false)
      }
    }
    
    loadUser()
  }, [])
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    
    if (!loginForm.email || !loginForm.password) {
      setLoginError('이메일과 비밀번호를 입력해주세요.')
      return
    }
    
    setIsLoggingIn(true)
    
    try {
      const response = await authApi.login({
        email: loginForm.email,
        password: loginForm.password
      })
      
      if (response.success && response.accessToken && response.refreshToken && response.user) {
        localStorage.setItem('accessToken', response.accessToken)
        localStorage.setItem('refreshToken', response.refreshToken)
        setUser(response.user)
        setShowLoginModal(false)
        setLoginForm({ email: '', password: '' })
      } else {
        setLoginError(response.error || '로그인에 실패했습니다.')
      }
    } catch (error: any) {
      setLoginError(error.message || '로그인에 실패했습니다.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await authApi.logout(refreshToken || undefined)
    } catch (error) {
      console.error('로그아웃 오류:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      navigate('/')
    }
  }

  const closeLoginModal = () => {
    setShowLoginModal(false)
    setLoginForm({ email: '', password: '' })
    setLoginError('')
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

              {/* 로그인/회원가입 또는 사용자 정보 (데스크톱) */}
              <div className="hidden md:flex items-center gap-2">
                {isLoadingUser ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : user ? (
                  <>
                    <Link
                      to="/profile"
                      className="px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>{user.nickname}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 text-sm font-medium text-primary-100 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="px-3 py-2 text-sm font-medium text-primary-100 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      로그인
                    </button>
                    <Link
                      to="/register"
                      className="px-3 py-2 text-sm font-medium bg-white text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      회원가입
                    </Link>
                  </>
                )}
              </div>

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

            {/* 모바일 로그인/회원가입 또는 사용자 정보 */}
            <div className="mt-6 pt-6 border-t border-neutral-100 space-y-2">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-primary-50 text-primary-600 transition-colors"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="font-medium">{user.nickname}</span>
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu()
                      handleLogout()
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <span className="font-medium">로그아웃</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      closeMobileMenu()
                      setShowLoginModal(true)
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="font-medium">로그인</span>
                  </button>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="font-medium">회원가입</span>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl animate-fadeInUp">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">로그인</h2>
                <button
                  onClick={closeLoginModal}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* 에러 메시지 */}
              {loginError && (
                <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
                  {loginError}
                </div>
              )}

              {/* 로그인 폼 */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoggingIn}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoggingIn}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>로그인 중...</span>
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>
              </form>

              {/* 하단 링크 */}
              <div className="mt-6 text-center text-sm text-neutral-500">
                계정이 없으신가요?{' '}
                <Link
                  to="/register"
                  onClick={closeLoginModal}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  회원가입
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
