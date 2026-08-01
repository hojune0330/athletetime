import { Suspense, lazy, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import { FullWidthLayout } from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import AdminRoute from './components/layout/AdminRoute'
import RequireAuth from './components/layout/RequireAuth'
import ScrollToTop from './components/ScrollToTop'
import FeaturePreparingPage from './components/common/FeaturePreparingPage'

const MainPage = lazy(() => import('./pages/MainPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const PaceCalculatorPage = lazy(() => import('./pages/PaceCalculatorPage'))
const TrainingCalculatorPage = lazy(() => import('./pages/TrainingCalculatorPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const CompetitionsPage = lazy(() => import('./pages/CompetitionsPage'))
const MatchResultListPage = lazy(() => import('./pages/MatchResultListPage'))
const MatchResultDetailPage = lazy(() => import('./pages/MatchResultDetailPage'))
const ProfileCardPage = lazy(() => import('./pages/ProfileCardStudio'))
const AthleteDetailPage = lazy(() => import('./pages/AthleteDetailPage'))
const RecordsPage = lazy(() => import('./pages/RecordsPage'))
const RecordAthletePage = lazy(() => import('./features/record-workspace/pages/RecordAthletePage'))
const RecordWorkspaceManagerPage = lazy(() => import('./features/record-workspace/pages/RecordWorkspaceManagerPage'))
const RecordWorkspacePage = lazy(() => import('./features/record-workspace/pages/RecordWorkspacePage'))
const RecordWorkspaceReviewPage = lazy(() => import('./features/record-workspace/pages/RecordWorkspaceReviewPage'))
const TeamPerformancePage = lazy(() => import('./features/team-performance/TeamPerformancePage'))
const AboutDataPage = lazy(() => import('./pages/AboutDataPage'))
const ScheduleCardPage = lazy(() => import('./pages/ScheduleCardPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminGalleryPage = lazy(() => import('./pages/admin/AdminGalleryPage'))
const AdminCardStudioPage = lazy(() => import('./pages/admin/AdminCardStudioPage'))
const AdminContentPage = lazy(() => import('./pages/admin/AdminContentPage'))
const AdminPipelinePage = lazy(() => import('./pages/admin/AdminPipelinePage'))
const AdminDataRequestsPage = lazy(() => import('./pages/admin/AdminDataRequestsPage'))
const AdminOperatorGuidePage = lazy(() => import('./pages/admin/AdminOperatorGuidePage'))
const PaceRisePage = lazy(() => import('./pages/PaceRisePage'))
const DataRequestPage = lazy(() => import('./pages/DataRequestPage'))

function lazyPage(node: ReactNode) {
  return <Suspense fallback={<div className="px-4 py-10 text-sm text-neutral-500">화면을 불러오는 중...</div>}>{node}</Suspense>
}

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

  const basename = '/'

  return (
    <div className="min-h-screen bg-neutral-50">
      <Router basename={basename}>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* 인증 페이지 (레이아웃 없음) */}
            <Route path="/register" element={lazyPage(<RegisterPage />)} />
            <Route path="/login" element={lazyPage(<LoginPage />)} />
            <Route path="/verify-email" element={lazyPage(<VerifyEmailPage />)} />

            {/* 메인 페이지 (레이아웃 포함) */}
            <Route path="/" element={<Layout />}>
              <Route index element={lazyPage(<MainPage />)} />
            </Route>

            {/* 로그인 필요 — 프로필 (레이아웃 + 가드로 헤더 유지) */}
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<Layout />}>
                <Route index element={lazyPage(<ProfilePage />)} />
              </Route>
            </Route>

            {/* ═══════ 관리자 전용 라우트 ═══════ */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={lazyPage(<AdminDashboardPage />)} />
                <Route path="gallery" element={lazyPage(<AdminGalleryPage />)} />
                <Route path="card-studio" element={lazyPage(<AdminCardStudioPage />)} />
                <Route path="content" element={lazyPage(<AdminContentPage />)} />
                <Route path="pipeline" element={lazyPage(<AdminPipelinePage />)} />
                <Route path="data-requests" element={lazyPage(<AdminDataRequestsPage />)} />
                <Route path="operator-guide" element={lazyPage(<AdminOperatorGuidePage />)} />
              </Route>
            </Route>

            {/* ═══════ 공개 라우트 (레이아웃 포함) ═══════ */}

            {/* 프로필 카드 빌더 (공개 - 전체 너비) */}
            <Route path="/profile-card" element={<FullWidthLayout />}>
              <Route index element={lazyPage(<ProfileCardPage />)} />
            </Route>

            <Route path="/athlete/:id" element={<Layout />}>
              <Route index element={lazyPage(<AthleteDetailPage />)} />
            </Route>

            <Route path="/records" element={<Layout />}>
              <Route index element={lazyPage(<RecordsPage />)} />
              <Route path="athletes/:athleteKey" element={lazyPage(<RecordAthletePage />)} />
              <Route path="teams/:teamKey" element={lazyPage(<TeamPerformancePage />)} />
              <Route path="workspaces" element={lazyPage(<RecordWorkspaceManagerPage />)} />
              <Route path="workspaces/new" element={lazyPage(<RecordWorkspaceReviewPage />)} />
              <Route path="workspaces/:workspaceId" element={lazyPage(<RecordWorkspacePage />)} />
            </Route>

            {/* 데이터 출처·원칙 안내 (#9) */}
            <Route path="/about-data" element={<Layout />}>
              <Route index element={lazyPage(<AboutDataPage />)} />
            </Route>

            {/* 계산기 페이지 */}
            <Route path="/pace-calculator" element={<Layout />}>
              <Route index element={lazyPage(<PaceCalculatorPage />)} />
            </Route>
            <Route path="/training-calculator" element={<Layout />}>
              <Route index element={lazyPage(<TrainingCalculatorPage />)} />
            </Route>
            <Route path="/calculators" element={<Layout />}>
              <Route index element={lazyPage(<TrainingCalculatorPage />)} />
            </Route>

            {/* 채팅 페이지 */}
            <Route path="/chat" element={<Layout />}>
              <Route index element={lazyPage(<ChatPage />)} />
            </Route>

            {/* 커뮤니티 페이지 */}
            <Route path="/community" element={<Layout />}>
              <Route index element={lazyPage(<CommunityPage />)} />
              <Route path="best" element={lazyPage(<CommunityPage />)} />
              <Route path="board/:boardId" element={lazyPage(<CommunityPage />)} />
              <Route path="post/:postId" element={lazyPage(<CommunityPage />)} />
            </Route>

            <Route path="/write" element={<Layout />}>
              <Route index element={lazyPage(<CommunityPage />)} />
            </Route>
            <Route path="/edit/:postId" element={<Layout />}>
              <Route index element={lazyPage(<CommunityPage />)} />
            </Route>

            {/* 대회 목록 (목록·조회는 공개, 작성·수정만 로그인 필요) */}
            <Route path="/competitions" element={<Layout />}>
              <Route index element={lazyPage(<CompetitionsPage />)} />
              <Route path="new" element={<FeaturePreparingPage title="대회 제보는 준비 중이에요" description="공개 결과를 정확하게 확인하는 흐름부터 운영하고 있어요." />} />
              <Route path=":id/edit" element={<FeaturePreparingPage title="대회 수정은 준비 중이에요" description="공개 결과를 정확하게 확인하는 흐름부터 운영하고 있어요." />} />
            </Route>

            {/* 경기 결과 (목록·조회는 공개, 작성·수정만 로그인 필요) */}
            <Route path="/matchResult/:competitionId" element={<Layout />}>
              <Route index element={lazyPage(<MatchResultListPage />)} />
              <Route path=":resultId" element={lazyPage(<MatchResultDetailPage />)} />
              <Route path="new" element={<FeaturePreparingPage title="결과 제보는 준비 중이에요" description="공개 결과를 정확하게 확인하는 흐름부터 운영하고 있어요." />} />
              <Route path=":resultId/edit" element={<FeaturePreparingPage title="결과 수정은 준비 중이에요" description="공개 결과를 정확하게 확인하는 흐름부터 운영하고 있어요." />} />
            </Route>

            {/* 실업 LIVE (PaceRise) */}
            <Route path="/pacerise" element={<FullWidthLayout />}>
              <Route index element={lazyPage(<PaceRisePage />)} />
            </Route>

            {/* 대회 일정 카드뉴스 */}
            <Route path="/schedule-card" element={<Layout />}>
              <Route index element={lazyPage(<ScheduleCardPage />)} />
            </Route>

            {/* 중고거래 (목록·상세는 공개, 작성·수정만 로그인 필요) */}
            <Route path="/marketplace" element={<Layout />}>
              <Route index element={<FeaturePreparingPage title="중고 마켓은 준비 중이에요" description="개인 간 거래를 안전하게 운영할 기준을 먼저 갖추고 있어요." />} />
              <Route path="*" element={<FeaturePreparingPage title="중고 마켓은 준비 중이에요" description="개인 간 거래를 안전하게 운영할 기준을 먼저 갖추고 있어요." />} />
            </Route>

            {/* 데이터 정정/삭제/이의제기 요청 */}
            <Route path="/data-request" element={<Layout />}>
              <Route index element={lazyPage(<DataRequestPage />)} />
            </Route>

            {/* 404 - Layout 포함하여 Header/Footer 표시 */}
            <Route path="*" element={<Layout />}>
              <Route path="*" element={lazyPage(<NotFoundPage />)} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  )
}

export default App
