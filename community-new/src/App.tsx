import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'
import BoardPage from './pages/BoardPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="board/:boardId" element={<BoardPage />} />
          <Route path="post/:postId" element={<PostDetailPage />} />
          <Route path="write" element={<WritePage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App