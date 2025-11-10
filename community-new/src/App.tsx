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
    // 다크모드를 기본으로 설정
    document.documentElement.classList.add('dark')
  }, [])

  // React app is deployed at root path (/)
  // Netlify handles /community redirect via netlify.toml
  const basename = '/'

  return (
    <div className="min-h-screen bg-dark-800">
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