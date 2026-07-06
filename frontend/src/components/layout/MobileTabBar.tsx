import { Link, useLocation } from 'react-router-dom'
import { Home, BarChart3, CalendarDays, MessageSquare, Menu } from 'lucide-react'
import type { ComponentType } from 'react'

/**
 * 모바일 하단 탭바 — 모바일/태블릿(`md` 미만)에서만 노출되는 1차 네비게이션.
 * 데스크톱은 기존 헤더 nav를 그대로 사용한다.
 *
 * 설계 근거(docs/athletetime-mobile-tabbar-scope.md):
 * - 탭 5개는 엄지 도달성·정보구조 우선(홈/기록/대회/커뮤니티/더보기).
 * - '더보기'는 헤더의 기존 드로어를 커스텀 이벤트로 열어 나머지 메뉴를 흡수한다.
 * - z-index 40: 콘텐츠 위, CompareTray(50)·드로어(70)·모달(100) 아래.
 * - 신규 의존성 0(lucide-react는 이미 설치). 과한 모션 없음.
 */

type TabItem = {
  path: string
  label: string
  Icon: ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>
  /** 활성 판단 시 하위 경로까지 포함할지 */
  matchPrefix?: boolean
}

const TAB_ITEMS: TabItem[] = [
  { path: '/', label: '홈', Icon: Home },
  { path: '/records', label: '기록', Icon: BarChart3, matchPrefix: true },
  { path: '/competitions', label: '대회', Icon: CalendarDays, matchPrefix: true },
  { path: '/community', label: '커뮤니티', Icon: MessageSquare, matchPrefix: true },
]

/** 헤더 드로어를 여는 커스텀 이벤트 이름(Header가 listen) */
export const OPEN_MOBILE_MENU_EVENT = 'athletetime:open-mobile-menu'

function isTabActive(pathname: string, item: TabItem): boolean {
  if (item.path === '/') return pathname === '/'
  if (item.matchPrefix) {
    return pathname === item.path || pathname.startsWith(item.path + '/')
  }
  return pathname === item.path
}

export default function MobileTabBar() {
  const location = useLocation()

  const openMoreMenu = () => {
    window.dispatchEvent(new CustomEvent(OPEN_MOBILE_MENU_EVENT))
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className="mobile-tabbar md:hidden"
    >
      <ul className="flex items-stretch">
        {TAB_ITEMS.map((item) => {
          const active = isTabActive(location.pathname, item)
          const { Icon } = item
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active ? 'text-brand' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {active && (
                  <span aria-hidden className="absolute inset-x-5 top-0 h-[2px] bg-brand" />
                )}
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}

        {/* 더보기 — 헤더 드로어를 열어 나머지 메뉴/계정을 노출 */}
        <li className="flex-1">
          <button
            type="button"
            onClick={openMoreMenu}
            aria-haspopup="dialog"
            aria-controls="mobile-navigation-drawer"
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            <span>더보기</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
