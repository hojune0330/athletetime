import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
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

  // React app is deployed at root path (/)
  // Netlify handles /community redirect via netlify.toml
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

            {/* 메인 페이지 (레이아웃 포함) */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="best" element={<HomePage />} />
              <Route path="board/:boardId" element={<BoardPage />} />
              <Route path="post/:postId" element={<PostDetailPage />} />
              <Route path="write" element={<WritePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  )
}

export default App
