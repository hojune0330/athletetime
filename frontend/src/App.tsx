import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import MainPage from './pages/MainPage'
import CommunityPage from './pages/CommunityPage'
// 새로 변환한 React 컴포넌트 (폴더 형태)
import PaceCalculatorPage from './pages/PaceCalculatorPage'
import TrainingCalculatorPage from './pages/TrainingCalculatorPage'
import ChatPage from './pages/ChatPage'
// 기존 페이지
import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'
import BoardPage from './pages/BoardPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
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
        <AuthProvider>
          <Routes>
            {/* 인증 페이지 (레이아웃 없음) */}
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* 메인 페이지 (레이아웃 없음) */}
            <Route path="/" element={<MainPage />} />

            {/* 계산기 페이지 (레이아웃 포함) */}
            <Route path="/pace-calculator" element={<Layout />}>
              <Route index element={<PaceCalculatorPage />} />
            </Route>
            <Route path="/training-calculator" element={<Layout />}>
              <Route index element={<TrainingCalculatorPage />} />
            </Route>

            {/* 채팅 페이지 (레이아웃 포함) */}
            <Route path="/chat" element={<Layout />}>
              <Route index element={<ChatPage />} />
            </Route>

            {/* 커뮤니티 페이지 (레이아웃 포함) */}
            <Route path="/community" element={<Layout />}>
              <Route index element={<CommunityPage />} />
              <Route path="best" element={<CommunityPage />} />
              <Route path="board/:boardId" element={<BoardPage />} />
              <Route path="post/:postId" element={<PostDetailPage />} />
            </Route>

            {/* 글쓰기 (레이아웃 포함) */}
            <Route path="/write" element={<Layout />}>
              <Route index element={<WritePage />} />
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
