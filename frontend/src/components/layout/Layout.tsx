import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RightBanner from './RightBanner'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="flex gap-6">
          {/* 좌측 사이드바 */}
          {/* <aside className="hidden lg:block w-64 shrink-0">
            <Sidebar />
          </aside> */}
          
          {/* 메인 컨텐츠 */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
          
          {/* 우측 배너/광고 영역 */}
          {/* <aside className="hidden xl:block w-72 shrink-0">
            <RightBanner />
          </aside> */}
        </div>
      </div>
      <Footer />
    </div>
  )
}
