import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RightBanner from './RightBanner'
import Footer from './Footer'

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
    </div>
  )
}
