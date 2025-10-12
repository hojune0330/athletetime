import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import LeftSidebar from '../components/layout/LeftSidebar'
import RightSidebar from '../components/layout/RightSidebar'
import BetaNotice from '../components/layout/BetaNotice'

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <BetaNotice />
      <main className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <LeftSidebar />
        </aside>
        <section className="min-w-0 flex-1">
          <Outlet />
        </section>
        <aside className="hidden w-80 shrink-0 xl:block">
          <RightSidebar />
        </aside>
      </main>
    </div>
  )
}

export default AppLayout
