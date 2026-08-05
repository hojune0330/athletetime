import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { BusySpinner } from '@/components/ui/loading-state'
import HeaderLoginModal, { type LoginModalMode } from './HeaderLoginModal'
import HeaderMobileDrawer from './HeaderMobileDrawer'
import HeaderSearchBar from './HeaderSearchBar'
import { OPEN_MOBILE_MENU_EVENT } from './MobileTabBar'

export default function Header() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginInitialMode, setLoginInitialMode] = useState<LoginModalMode>('login')

  // AuthContext에서 로그인 상태 가져오기 (전체 앱과 동기화)
  // login/closeLoginPrompt는 HeaderLoginModal 내부에서 직접 사용한다.
  const {
    user,
    loading: isLoadingUser,
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
      if (flag === 'forgotPassword') setLoginInitialMode('forgotPassword')
      sessionStorage.removeItem('showLoginModal')
    }
  }, [searchParams, setSearchParams])

  // C: 보호 가드(RequireAuth) 등에서 promptLogin()이 호출되면 모달을 연다.
  useEffect(() => {
    if (loginPromptOpen) {
      setShowLoginModal(true)
      setLoginInitialMode('login')
    }
  }, [loginPromptOpen])

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // 모바일 하단 탭바의 '더보기'가 헤더 드로어를 열도록 커스텀 이벤트를 수신한다.
  useEffect(() => {
    const openDrawer = () => setMobileMenuOpen(true)
    window.addEventListener(OPEN_MOBILE_MENU_EVENT, openDrawer)
    return () => window.removeEventListener(OPEN_MOBILE_MENU_EVENT, openDrawer)
  }, [])

  const handleLogout = async () => {
    await logoutWithContext()
  }

  const handleCloseLoginModal = () => {
    setShowLoginModal(false)
    setLoginInitialMode('login')
    closeLoginPrompt()
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
  ]

  // 보조 도구·부가 기능 — 핵심 루프 밖 화면은 '더보기'로 묶는다.
  const moreNavItems = [
    { path: '/pacerise', label: '실업 대회 결과', note: 'PaceRise 연동' },
    { path: '/pace-calculator', label: '페이스 계산기', note: '훈련 보조' },
    { path: '/training-calculator', label: '훈련 계산기', note: '훈련 보조' },
    { path: '/marketplace', label: '중고 마켓', note: '준비 중' },
    { path: '/community', label: '커뮤니티', note: '준비 중' },
    { path: '/chat', label: '오픈 채팅', note: '준비 중' },
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

              {/* 기록 검색 — HeaderSearchBar로 분리 (2C-4) */}
              <HeaderSearchBar />

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
                  <BusySpinner tone="brand" size="sm" />
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

      {/* 모바일 드로어 — HeaderMobileDrawer로 분리 (2C-3) */}
      <HeaderMobileDrawer
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        onOpenLogin={() => setShowLoginModal(true)}
        triggerRef={mobileMenuButtonRef}
        items={navItems}
        moreItems={moreNavItems}
        adminItems={adminNavItems}
      />

      {/* 로그인/비밀번호 찾기 모달 — HeaderLoginModal로 분리 (2C-2B) */}
      <HeaderLoginModal
        open={showLoginModal}
        initialMode={loginInitialMode}
        onClose={handleCloseLoginModal}
      />
    </>
  )
}
