import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileTabBar from './MobileTabBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto w-full px-4 py-6 flex-1">
        <main>
          <Outlet />
        </main>
      </div>
      <Footer />
      {/* 모바일 하단 탭바가 푸터/콘텐츠를 가리지 않도록 본문 하단 여백을 둔다(데스크톱은 0) */}
      <div aria-hidden className="mobile-tabbar-spacer md:hidden" />
      <MobileTabBar />
    </div>
  )
}

/**
 * FullWidthLayout - 전체 너비 레이아웃
 * 프로필 카드 빌더 등 iframe을 사용하는 페이지용
 */
export function FullWidthLayout() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <div className="flex-1">
        <main>
          <Outlet />
        </main>
      </div>
      <Footer />
      <div aria-hidden className="mobile-tabbar-spacer md:hidden" />
      <MobileTabBar />
    </div>
  )
}
