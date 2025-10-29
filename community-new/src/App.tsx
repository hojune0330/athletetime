import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'
import BoardPage from './pages/BoardPage'
import NotFoundPage from './pages/NotFoundPage'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // 다크모드를 기본으로 설정
    document.documentElement.classList.add('dark')
  }, [])

  // Netlify deploys community/ folder as root, so always use '/' as basename
  const basename = '/'

  return (
    <div className="min-h-screen bg-dark-800">
      <Router basename={basename}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="best" element={<HomePage />} />
            <Route path="board/:boardId" element={<BoardPage />} />
            <Route path="post/:postId" element={<PostDetailPage />} />
            <Route path="write" element={<WritePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </div>
  )
}

export default App