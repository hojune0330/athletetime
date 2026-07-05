import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import ScrollToTop from './components/ScrollToTop'
import MainPage from './pages/MainPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import PaceCalculatorPage from './pages/PaceCalculatorPage'
import TrainingCalculatorPage from './pages/TrainingCalculatorPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ProfilePage from './pages/ProfilePage'
import CompetitionsPage from './pages/CompetitionsPage'
import CompetitionFormPage from './pages/CompetitionFormPage'
import MatchResultListPage from './pages/MatchResultListPage'
import MatchResultDetailPage from './pages/MatchResultDetailPage'
import MatchResultFormPage from './pages/MatchResultFormPage'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // 라이트모드 전용 - 다크모드 클래스 제거
    document.documentElement.classList.remove('dark')
    
    // 에러 처리
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
    })
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason)
    })
  }, [])

  // React app is deployed at root path
  // Vite base is set to '/' in vite.config.ts
  const basename = '/'

  return (
    <div className="min-h-screen bg-neutral-50">
      <Router basename={basename}>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* 인증 페이지 (레이아웃 없음) */}
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* 메인 페이지 (레이아웃 없음) */}
            <Route path="/" element={<MainPage />} />

            {/* 계산기 페이지 (레이아웃 포함) */}
            <Route path="/pace-calculator" element={<Layout />}>
              <Route index element={<PaceCalculatorPage />} />
            </Route>
            <Route path="/training-calculator" element={<Layout />}>
              <Route index element={<TrainingCalculatorPage />} />
            </Route>

            <Route path="/chat" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="chat" />} />
            </Route>

            <Route path="/community" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="community" />} />
              <Route path="*" element={<ComingSoonPage feature="community" />} />
            </Route>

            <Route path="/write" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="community" />} />
            </Route>

            <Route path="/edit/:postId" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="community" />} />
            </Route>

            {/* 대회 목록 (레이아웃 포함) */}
            <Route path="/competitions" element={<Layout />}>
              <Route index element={<CompetitionsPage />} />
              <Route path="new" element={<CompetitionFormPage />} />
              <Route path=":id/edit" element={<CompetitionFormPage />} />
            </Route>

            {/* 경기 결과 (레이아웃 포함) */}
            <Route path="/matchResult/:competitionId" element={<Layout />}>
              <Route index element={<MatchResultListPage />} />
              <Route path="new" element={<MatchResultFormPage />} />
              <Route path=":resultId" element={<MatchResultDetailPage />} />
              <Route path=":resultId/edit" element={<MatchResultFormPage />} />
            </Route>

            <Route path="/marketplace" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="marketplace" />} />
              <Route path="*" element={<ComingSoonPage feature="marketplace" />} />
            </Route>

            <Route path="/records" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="recordsBasic" />} />
            </Route>

            <Route path="/profile-card" element={<Layout />}>
              <Route index element={<ComingSoonPage feature="profileCard" />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  )
}

export default App
