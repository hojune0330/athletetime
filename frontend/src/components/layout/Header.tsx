import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { 
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'
import * as authApi from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { OPEN_MOBILE_MENU_EVENT } from './MobileTabBar'

type ModalMode = 'login' | 'forgotPassword' | 'verifyCode' | 'resetPassword';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [recordSearchQuery, setRecordSearchQuery] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>('login')

  // AuthContext에서 로그인 상태 가져오기 (전체 앱과 동기화)
  const {
    user,
    loading: isLoadingUser,
    login: loginWithContext,
    logout: logoutWithContext,
    loginPromptOpen,
    closeLoginPrompt,
  } = useAuth()

  // URL 쿼리 파라미터 또는 sessionStorage로 로그인 모달 트리거
  useEffect(() => {
    // URL 쿼리 파라미터 확인
    if (searchParams.get('showLogin') === 'true') {
      setShowLoginModal(true)
      searchParams.delete('showLogin')
      setSearchParams(searchParams, { replace: true })
    }
    // sessionStorage 확인 (RegisterPage/LoginPage에서 뒤로가기 시)
    // 'true' → 로그인, 'forgotPassword' → 비밀번호 찾기 단계로 바로 진입
    const flag = sessionStorage.getItem('showLoginModal')
    if (flag === 'true' || flag === 'forgotPassword') {
      setShowLoginModal(true)
      if (flag === 'forgotPassword') setModalMode('forgotPassword')
      sessionStorage.removeItem('showLoginModal')
    }
  }, [searchParams, setSearchParams])

  // C: 보호 가드(RequireAuth) 등에서 promptLogin()이 호출되면 모달을 연다.
  useEffect(() => {
    if (loginPromptOpen) {
      setShowLoginModal(true)
      setModalMode('login')
    }
  }, [loginPromptOpen])

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // 비밀번호 찾기 상태
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileMenuOpen(false)
      mobileMenuButtonRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  // 모바일 하단 탭바의 '더보기'가 헤더 드로어를 열도록 커스텀 이벤트를 수신한다.
  useEffect(() => {
    const openDrawer = () => setMobileMenuOpen(true)
    window.addEventListener(OPEN_MOBILE_MENU_EVENT, openDrawer)
    return () => window.removeEventListener(OPEN_MOBILE_MENU_EVENT, openDrawer)
  }, [])

  const submitRecordSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = recordSearchQuery.trim()
    if (trimmed.length < 2) {
      return
    }
    navigate(`/records?q=${encodeURIComponent(trimmed)}`)
    setRecordSearchQuery('')
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
      await loginWithContext(loginForm.email, loginForm.password)
      setShowLoginModal(false)
      closeLoginPrompt()
      setLoginForm({ email: '', password: '' })
    } catch (error: unknown) {
      setLoginError(getErrorMessage(error, '로그인에 실패했습니다.'))
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await logoutWithContext()
  }

  const closeLoginModal = () => {
    setShowLoginModal(false)
    closeLoginPrompt()
    setModalMode('login')
    setLoginForm({ email: '', password: '' })
    setLoginError('')
    setForgotEmail('')
    setResetCode('')
    setNewPassword('')
    setNewPasswordConfirm('')
    setForgotError('')
    setForgotSuccess('')
  }

  // 비밀번호 찾기 - 인증 코드 발송
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    
    if (!forgotEmail) {
      setForgotError('이메일을 입력해주세요.')
      return
    }
    
    setIsSendingCode(true)
    
    try {
      const response = await authApi.forgotPassword(forgotEmail)
      
      if (response.success) {
        setForgotSuccess('인증 코드가 발송되었습니다. 이메일을 확인해주세요.')
        setModalMode('verifyCode')
      } else {
        setForgotError(response.error || '인증 코드 발송에 실패했습니다.')
      }
    } catch (error: unknown) {
      setForgotError(getErrorMessage(error, '인증 코드 발송에 실패했습니다.'))
    } finally {
      setIsSendingCode(false)
    }
  }

  // 비밀번호 찾기 - 인증 코드 확인
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    
    if (!resetCode) {
      setForgotError('인증 코드를 입력해주세요.')
      return
    }
    
    setIsVerifyingCode(true)
    
    try {
      const response = await authApi.verifyResetCode(forgotEmail, resetCode)
      
      if (response.success) {
        setForgotSuccess('인증이 완료되었습니다. 새 비밀번호를 설정해주세요.')
        setModalMode('resetPassword')
      } else {
        setForgotError(response.error || '인증 코드 확인에 실패했습니다.')
      }
    } catch (error: unknown) {
      setForgotError(getErrorMessage(error, '인증 코드 확인에 실패했습니다.'))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  // 비밀번호 찾기 - 새 비밀번호 설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    
    if (!newPassword || !newPasswordConfirm) {
      setForgotError('새 비밀번호를 입력해주세요.')
      return
    }
    
    if (newPassword !== newPasswordConfirm) {
      setForgotError('비밀번호가 일치하지 않습니다.')
      return
    }
    
    if (newPassword.length < 8) {
      setForgotError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/
    if (!passwordRegex.test(newPassword)) {
      setForgotError('비밀번호는 영문과 숫자를 포함해야 합니다.')
      return
    }
    
    setIsResettingPassword(true)
    
    try {
      const response = await authApi.resetPassword(forgotEmail, resetCode, newPassword)
      
      if (response.success) {
        setForgotSuccess('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.')
        // 로그인 화면으로 돌아가기
        setTimeout(() => {
          setModalMode('login')
          setLoginForm({ email: forgotEmail, password: '' })
          setForgotEmail('')
          setResetCode('')
          setNewPassword('')
          setNewPasswordConfirm('')
          setForgotError('')
          setForgotSuccess('')
        }, 2000)
      } else {
        setForgotError(response.error || '비밀번호 변경에 실패했습니다.')
      }
    } catch (error: unknown) {
      setForgotError(getErrorMessage(error, '비밀번호 변경에 실패했습니다.'))
    } finally {
      setIsResettingPassword(false)
    }
  }

  // 관리자 드롭다운 상태
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  // '더보기' 드롭다운 상태 (데스크톱)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  /**
   * 네비게이션 IA — 단계적 공개(staged launch) 원칙.
   * 1차 네비: 서비스의 핵심 루프(기록 검색 → 대회 확인 → 기록카드 공유 → 커뮤니티)만 노출.
   * '더보기': 보조 도구와 실험적 기능은 한 단계 아래로 묶어 핵심 경험을 흐리지 않게 한다.
   * 모바일 하단 탭바(홈/기록/대회/커뮤니티)와 순서·구성을 맞춰 학습 비용을 줄인다.
   * 근거: docs/athletetime-final-decision-blueprint.md · docs/athletetime-service-purpose-and-retention.md
   */
  const primaryNavItems = [
    { path: '/records', label: '기록', mobileLabel: '기록' },
    { path: '/competitions', label: '대회', mobileLabel: '대회' },
    { path: '/profile-card', label: '기록카드', mobileLabel: '기록카드' },
    { path: '/community', label: '커뮤니티', mobileLabel: '커뮤니티' },
  ]

  // 보조 도구·부가 기능 — 핵심 루프 밖 화면은 '더보기'로 묶는다.
  const moreNavItems = [
    { path: '/pacerise', label: '실업 라이브', note: 'PaceRise 연동' },
    { path: '/pace-calculator', label: '페이스 계산기', note: '훈련 보조' },
    { path: '/training-calculator', label: '훈련 계산기', note: '훈련 보조' },
    { path: '/marketplace', label: '중고 마켓', note: '사용자 거래' },
    { path: '/chat', label: '오픈 채팅', note: '익명 대화' },
  ]

  // 모바일 드로어용 전체 목록(그룹 라벨로 구분 렌더)
  const navItems = primaryNavItems

  const adminNavItems = [
    { path: '/admin', label: '대시보드', emoji: '📊' },
    { path: '/admin/gallery', label: '갤러리', emoji: '🖼️' },
    { path: '/admin/card-studio', label: '카드 스튜디오', emoji: '🎨' },
    { path: '/admin/content', label: '콘텐츠 관리', emoji: '📝' },
    { path: '/admin/pipeline', label: '파이프라인', emoji: '⚙️' },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        {/* 메인 헤더 — Scientific Minimalism: flat surface, hairline border, ink text */}
        <div>
          <div className="mx-auto max-w-frame px-4">
            <div className="flex items-center justify-between h-14">
              {/* 로고 영역 */}
              <Link to="/" className="flex items-center gap-2 group">
                <ClockIcon className="w-6 h-6 text-brand" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tracking-tight text-ink">애타</span>
                  <span className="hidden sm:inline font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">AthleteTime</span>
                </div>
              </Link>

              {/* 데스크톱 네비게이션 — 핵심 4개 + 더보기 */}
              <nav className="hidden md:flex items-center gap-0.5">
                {primaryNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-3 py-2 text-body-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'text-brand'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {item.label}
                    {isActive(item.path) && (
                      <span className="absolute inset-x-3 -bottom-px h-[2px] bg-brand" />
                    )}
                  </Link>
                ))}

                {/* 더보기 — 보조 도구·부가 기능 드롭다운 */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    aria-expanded={moreMenuOpen}
                    aria-haspopup="menu"
                    className={`relative flex items-center gap-1 px-3 py-2 text-body-sm font-medium transition-colors ${
                      moreNavItems.some((item) => isActive(item.path))
                        ? 'text-brand'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    더보기
                    <svg className={`w-3 h-3 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {moreMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                      <div role="menu" className="absolute right-0 top-full mt-1 w-56 rounded-sm border border-line bg-surface py-1 z-50 shadow-subtle animate-fadeIn">
                        <div className="px-3 py-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4 border-b border-hair">도구·부가 기능</div>
                        {moreNavItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            role="menuitem"
                            onClick={() => setMoreMenuOpen(false)}
                            className={`flex items-baseline justify-between gap-2 px-3 py-2 text-body-sm transition-colors hover:bg-surface-2 ${
                              isActive(item.path) ? 'text-brand' : 'text-ink-2 hover:text-ink'
                            }`}
                          >
                            <span>{item.label}</span>
                            <span className="text-mono-xs text-ink-4">{item.note}</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </nav>

              <form onSubmit={submitRecordSearch} className="hidden lg:block w-56">
                <label className="sr-only" htmlFor="header-record-search">기록 검색</label>
                <input
                  id="header-record-search"
                  type="search"
                  value={recordSearchQuery}
                  onChange={(event) => setRecordSearchQuery(event.target.value)}
                  placeholder="기록 검색"
                  className="h-9 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                />
              </form>

              {/* 관리자 드롭다운 (데스크톱) + 로그인/회원가입 */}
              <div className="hidden md:flex items-center gap-2">
                {/* 관리자 메뉴 */}
                {user?.isAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      className="flex items-center gap-1.5 rounded-sm px-3 py-2 font-mono text-mono-sm uppercase tracking-wider-2 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <span>관리</span>
                      <svg className={`w-3 h-3 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {adminMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setAdminMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-52 rounded-sm border border-line bg-surface py-1 z-50 shadow-subtle animate-fadeIn">
                          <div className="px-3 py-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4 border-b border-hair">Admin</div>
                          {adminNavItems.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setAdminMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-body-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                            >
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isLoadingUser ? (
                  <div className="w-4 h-4 border-2 border-line border-t-brand rounded-full animate-spin" />
                ) : user ? (
                  <>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 rounded-sm px-3 py-2 text-body-sm font-medium text-ink transition-colors hover:bg-surface-2"
                    >
                      <UserIcon className="w-4 h-4 text-ink-3" />
                      <span>{user.nickname}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="rounded-sm px-3 py-2 text-body-sm font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="rounded-sm px-3 py-2 text-body-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      로그인
                    </button>
                    <Link
                      to="/register"
                      className="rounded-sm bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-600"
                    >
                      회원가입
                    </Link>
                  </>
                )}
              </div>

              {/* 모바일 메뉴 버튼 */}
              <button
                ref={mobileMenuButtonRef}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
                className="md:hidden rounded-sm p-2 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
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

      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay active"
          onClick={closeMobileMenu}
        />
      )}

      {mobileMenuOpen && (
      <div
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        className="mobile-drawer active"
      >
        <div className="flex flex-col h-full">
          {/* 드로어 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-line">
            <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-brand" />
              <span className="text-lg font-semibold tracking-tight text-ink">애타</span>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="rounded-sm p-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 드로어 내비게이션 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-0.5">
              {/* 핵심 메뉴 — 기록 중심 루프 */}
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 border-l-2 px-4 py-3 transition-colors ${
                    isActive(item.path)
                      ? 'border-brand bg-surface-2 text-brand'
                      : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <span className="font-medium">{item.mobileLabel}</span>
                </Link>
              ))}
            </div>

            {/* 도구·부가 기능 — 핵심 루프 밖 화면 그룹 */}
            <div className="mt-6 pt-4 border-t border-hair">
              <div className="px-4 py-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
                도구·부가 기능
              </div>
              <div className="space-y-0.5">
                {moreNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`flex items-baseline justify-between gap-3 border-l-2 px-4 py-3 transition-colors ${
                      isActive(item.path)
                        ? 'border-brand bg-surface-2 text-brand'
                        : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-mono-xs text-ink-4">{item.note}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 모바일 로그인/회원가입 또는 사용자 정보 */}
            <div className="mt-6 pt-6 border-t border-line space-y-0.5">
              {/* 관리자 메뉴 (모바일) */}
              {user?.isAdmin && (
                <div className="mb-4">
                  <div className="px-4 py-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
                    Admin
                  </div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 border-l-2 px-4 py-3 transition-colors ${
                        isActive(item.path)
                          ? 'border-brand bg-surface-2 text-brand'
                          : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                  <div className="my-2 border-b border-hair" />
                </div>
              )}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex w-full items-center gap-3 border border-line px-4 py-3 text-ink-2 transition-colors hover:border-line-2 hover:bg-surface-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                      {user.nickname.charAt(0)}
                    </div>
                    <span className="font-medium">{user.nickname}</span>
                    <span className="ml-auto font-mono text-mono-xs uppercase tracking-wider-2 text-ink-4">Profile →</span>
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu()
                      handleLogout()
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
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
                    className="flex w-full items-center gap-3 border border-line px-4 py-3 text-ink-2 transition-colors hover:border-line-2 hover:bg-surface-2"
                  >
                    <UserIcon className="w-5 h-5 text-ink-3" />
                    <span className="font-medium">로그인</span>
                  </button>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-brand-600"
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
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-surface rounded-sm border border-line max-w-md w-full shadow-subtle animate-fadeInUp">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                {modalMode !== 'login' && (
                  <button
                    onClick={() => {
                      if (modalMode === 'verifyCode') {
                        setModalMode('forgotPassword')
                      } else if (modalMode === 'resetPassword') {
                        setModalMode('verifyCode')
                      } else {
                        setModalMode('login')
                      }
                      setForgotError('')
                      setForgotSuccess('')
                    }}
                    className="rounded-sm p-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-h3 font-semibold tracking-tight text-ink flex-1 text-center">
                  {modalMode === 'login' && '로그인'}
                  {modalMode === 'forgotPassword' && '비밀번호 찾기'}
                  {modalMode === 'verifyCode' && '인증 코드 확인'}
                  {modalMode === 'resetPassword' && '새 비밀번호 설정'}
                </h2>
                <button
                  onClick={closeLoginModal}
                  className="p-2 text-ink-4 hover:text-ink-2 rounded-sm hover:bg-surface-2 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* ========== 로그인 화면 ========== */}
              {modalMode === 'login' && (
                <>
                  {/* 에러 메시지 */}
                  {loginError && (
                    <div id="login-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                      {loginError}
                    </div>
                  )}

                  {/* 로그인 폼 */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="login-email" className="block text-sm font-medium text-ink-2 mb-2">
                        이메일
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                        disabled={isLoggingIn}
                        autoFocus
                        aria-invalid={Boolean(loginError)}
                        aria-describedby={loginError ? 'login-error' : undefined}
                      />
                    </div>

                    <div>
                      <label htmlFor="login-password" className="block text-sm font-medium text-ink-2 mb-2">
                        비밀번호
                      </label>
                      <input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="비밀번호를 입력하세요"
                        className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                        disabled={isLoggingIn}
                        aria-invalid={Boolean(loginError)}
                        aria-describedby={loginError ? 'login-error' : undefined}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

                  {/* 비밀번호 찾기 링크 */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setModalMode('forgotPassword')
                        setForgotError('')
                        setForgotSuccess('')
                      }}
                      className="text-sm text-ink-3 hover:text-brand transition-colors"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>

                  {/* 하단 링크 */}
                  <div className="mt-4 text-center text-sm text-ink-3">
                    계정이 없으신가요?{' '}
                    <Link
                      to="/register"
                      onClick={closeLoginModal}
                      className="text-brand hover:text-brand-600 font-medium"
                    >
                      회원가입
                    </Link>
                  </div>
                </>
              )}

              {/* ========== 비밀번호 찾기 - 이메일 입력 ========== */}
              {modalMode === 'forgotPassword' && (
                <>
                  {/* 안내 메시지 */}
                  <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <EnvelopeIcon className="w-8 h-8 text-brand" />
                    </div>
                    <p className="text-neutral-600 text-sm">
                      가입한 이메일 주소를 입력하시면<br />
                      비밀번호 재설정 인증 코드를 보내드립니다.
                    </p>
                  </div>

                  {/* 에러/성공 메시지 */}
                  {forgotError && (
                    <div id="forgot-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                      {forgotError}
                    </div>
                  )}
                  {forgotSuccess && (
                    <div role="status" className="mb-4 p-3 bg-success-50 border border-success-100 rounded-sm text-success-600 text-sm">
                      {forgotSuccess}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="forgot-email" className="block text-sm font-medium text-ink-2 mb-2">
                        이메일
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                        disabled={isSendingCode}
                        autoFocus
                        aria-invalid={Boolean(forgotError)}
                        aria-describedby={forgotError ? 'forgot-error' : undefined}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingCode}
                      className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isSendingCode ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>발송 중...</span>
                        </>
                      ) : (
                        '인증 코드 발송'
                      )}
                    </button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setModalMode('login')}
                      className="text-sm text-ink-3 hover:text-brand transition-colors"
                    >
                      로그인으로 돌아가기
                    </button>
                  </div>
                </>
              )}

              {/* ========== 비밀번호 찾기 - 인증 코드 확인 ========== */}
              {modalMode === 'verifyCode' && (
                <>
                  {/* 안내 메시지 */}
                  <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <KeyIcon className="w-8 h-8 text-brand" />
                    </div>
                    <p className="text-neutral-600 text-sm">
                      <strong>{forgotEmail}</strong>으로<br />
                      발송된 6자리 인증 코드를 입력해주세요.
                    </p>
                  </div>

                  {/* 에러/성공 메시지 */}
                  {forgotError && (
                    <div id="forgot-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                      {forgotError}
                    </div>
                  )}
                  {forgotSuccess && (
                    <div role="status" className="mb-4 p-3 bg-success-50 border border-success-100 rounded-sm text-success-600 text-sm">
                      {forgotSuccess}
                    </div>
                  )}

                  <form onSubmit={handleVerifyResetCode} className="space-y-4">
                    <div>
                      <label htmlFor="reset-code" className="block text-sm font-medium text-ink-2 mb-2">
                        인증 코드
                      </label>
                      <input
                        id="reset-code"
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6자리 숫자 입력"
                        className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors text-center text-2xl tracking-widest font-mono"
                        disabled={isVerifyingCode}
                        maxLength={6}
                        autoFocus
                        aria-invalid={Boolean(forgotError)}
                        aria-describedby={forgotError ? 'forgot-error' : undefined}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingCode || resetCode.length !== 6}
                      className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isVerifyingCode ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>확인 중...</span>
                        </>
                      ) : (
                        '인증 코드 확인'
                      )}
                    </button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => handleForgotPassword({ preventDefault: () => {} } as React.FormEvent)}
                      disabled={isSendingCode}
                      className="text-sm text-ink-3 hover:text-brand transition-colors disabled:opacity-50"
                    >
                      {isSendingCode ? '발송 중...' : '인증 코드 재발송'}
                    </button>
                  </div>
                </>
              )}

              {/* ========== 비밀번호 찾기 - 새 비밀번호 설정 ========== */}
              {modalMode === 'resetPassword' && (
                <>
                  {/* 안내 메시지 */}
                  <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <KeyIcon className="w-8 h-8 text-success-500" />
                    </div>
                    <p className="text-neutral-600 text-sm">
                      인증이 완료되었습니다.<br />
                      새로운 비밀번호를 설정해주세요.
                    </p>
                  </div>

                  {/* 에러/성공 메시지 */}
                  {forgotError && (
                    <div id="forgot-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                      {forgotError}
                    </div>
                  )}
                  {forgotSuccess && (
                    <div role="status" className="mb-4 p-3 bg-success-50 border border-success-100 rounded-sm text-success-600 text-sm">
                      {forgotSuccess}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-medium text-ink-2 mb-2">
                        새 비밀번호
                      </label>
                      <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8자 이상, 영문+숫자"
                        className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                        disabled={isResettingPassword}
                        autoFocus
                        aria-invalid={Boolean(forgotError)}
                        aria-describedby="new-password-help"
                      />
                      <p id="new-password-help" className="mt-1 text-xs text-ink-4">
                        8자 이상, 영문과 숫자 포함
                      </p>
                    </div>

                    <div>
                      <label htmlFor="new-password-confirm" className="block text-sm font-medium text-ink-2 mb-2">
                        새 비밀번호 확인
                      </label>
                      <input
                        id="new-password-confirm"
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="새 비밀번호 확인"
                        className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                        disabled={isResettingPassword}
                        aria-invalid={Boolean(newPasswordConfirm && newPassword !== newPasswordConfirm)}
                        aria-describedby={newPasswordConfirm && newPassword !== newPasswordConfirm ? 'new-password-mismatch' : undefined}
                      />
                      {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                        <p id="new-password-mismatch" className="mt-1 text-xs text-danger-600">
                          비밀번호가 일치하지 않습니다.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isResettingPassword || !newPassword || !newPasswordConfirm || newPassword !== newPasswordConfirm}
                      className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isResettingPassword ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>변경 중...</span>
                        </>
                      ) : (
                        '비밀번호 변경'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
