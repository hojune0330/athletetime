import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import AnnouncementBar from '../components/layout/AnnouncementBar'
import BoardNav from '../components/layout/BoardNav'
import LeftSidebar from '../components/layout/LeftSidebar'

function AppLayout() {
  return (
    <div className="min-h-screen bg-ink-50/60">
      <Header />
      <BoardNav />
      <AnnouncementBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="hidden lg:block">
            <LeftSidebar />
          </aside>
          <section className="min-w-0 space-y-6">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  )
}

export default AppLayout
