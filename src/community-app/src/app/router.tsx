import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import AppLayout from './AppLayout'
import HomePage from '../pages/HomePage'
import PostDetailPage from '../pages/PostDetailPage'
import WritePage from '../pages/WritePage'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<AppLayout />}>
      <Route index element={<HomePage />} />
      <Route path="boards/:boardSlug" element={<HomePage />} />
      <Route path="post/:postId" element={<PostDetailPage />} />
      <Route path="write" element={<WritePage />} />
      <Route path="boards/:boardSlug/write" element={<WritePage />} />
    </Route>,
  ),
)

export default router
