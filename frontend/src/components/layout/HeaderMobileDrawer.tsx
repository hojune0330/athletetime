import { Link, useLocation } from 'react-router-dom'
import { useRef } from 'react'
import { ClockIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useMobileDrawerFocus } from './useMobileDrawerFocus'

export interface HeaderNavItem {
  path: string
  label: string
  mobileLabel: string
}

export interface HeaderMoreNavItem {
  path: string
  label: string
  note: string
}

export interface HeaderAdminNavItem {
  path: string
  label: string
}

/**
 * 모바일 드로어(햄버거 메뉴) — 2C-3 분할.
 *
 * Header.tsx에서 옮겨온 상태:
 *   - open/onClose: 드로어 가시성은 Header가 소유 (controlled)
 *   - Escape 키 닫기 + 토글 버튼 focus 복원: 내부 useEffect
 *   - isActive 판정: useLocation 내부화
 *   - user/logoutWithContext: useAuth 직접 호출
 *
 * 호출 관계:
 *   - '로그인' 클릭: onClose() → onOpenLogin() (로그인 모달 open 요청)
 *   - '로그아웃' 클릭: onClose() → logoutWithContext()
 *   - 내비게이션 클릭: onClose() (라우팅은 <Link>가 담당)
 */
export interface HeaderMobileDrawerProps {
  /** 드로어 가시성 (Header의 mobileMenuOpen) */
  readonly open: boolean
  /** 닫기 요청 → Header가 state를 false로 */
  readonly onClose: () => void
  /** 드로어 내 '로그인' 버튼 → 로그인 모달 open 요청 */
  readonly onOpenLogin: () => void
  /** Escape 시 focus를 돌려줄 메뉴 토글 버튼 ref */
  readonly triggerRef?: React.RefObject<HTMLButtonElement | null>
  readonly items: readonly HeaderNavItem[]
  readonly moreItems: readonly HeaderMoreNavItem[]
  readonly adminItems: readonly HeaderAdminNavItem[]
}

export default function HeaderMobileDrawer({
  open,
  onClose,
  onOpenLogin,
  triggerRef,
  items,
  moreItems,
  adminItems,
}: HeaderMobileDrawerProps) {
  const location = useLocation()
  const { user, logout: logoutWithContext } = useAuth()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const closeAndRestoreFocus = useMobileDrawerFocus({
    open,
    onClose,
    triggerRef,
    drawerRef,
    closeButtonRef,
  })

  const handleLogout = async () => {
    onClose()
    await logoutWithContext()
  }

  const handleOpenLogin = () => {
    onClose()
    onOpenLogin()
  }

  if (!open) return null

  return (
    <>
      <div className="mobile-menu-overlay active" onClick={onClose} />

      <div
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="모바일 메뉴"
        ref={drawerRef}
        className="mobile-drawer active"
      >
        <div className="flex flex-col h-full">
          {/* 드로어 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-line">
            <Link to="/" onClick={onClose} className="flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-brand" />
              <span className="text-lg font-semibold tracking-tight text-ink">애타</span>
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeAndRestoreFocus}
              aria-label="메뉴 닫기"
              className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 드로어 내비게이션 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-0.5">
              {/* 핵심 메뉴 — 기록 중심 루프 */}
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex min-h-11 items-center gap-3 border-l-2 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
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
                {moreItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex min-h-11 items-baseline justify-between gap-3 border-l-2 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
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
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex min-h-11 items-center gap-3 border-l-2 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
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
                    onClick={onClose}
                    className="flex min-h-11 w-full items-center gap-3 border border-line px-4 py-3 text-ink-2 transition-colors hover:border-line-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                      {user.nickname.charAt(0)}
                    </div>
                    <span className="font-medium">{user.nickname}</span>
                    <span className="ml-auto font-mono text-mono-xs uppercase tracking-wider-2 text-ink-4">Profile →</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span className="font-medium">로그아웃</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleOpenLogin}
                    className="flex min-h-11 w-full items-center gap-3 border border-line px-4 py-3 text-ink-2 transition-colors hover:border-line-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <UserIcon className="w-5 h-5 text-ink-3" />
                    <span className="font-medium">로그인</span>
                  </button>
                  <Link
                    to="/register"
                    onClick={onClose}
                    className="flex min-h-11 items-center gap-3 bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
    </>
  )
}
