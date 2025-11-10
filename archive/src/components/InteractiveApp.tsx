// 인터랙티브 메인 애플리케이션 - 애슬리트 타임 v2.0
import { useState, useEffect } from 'react'
import { LoginModal } from './LoginModal'
import { QuickShare } from './SocialShare'
import { SessionManager } from '../auth/session'
import type { UserSession } from '../auth/providers'

export const InteractiveApp = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [currentPage, setCurrentPage] = useState<'home' | 'community' | 'schedule' | 'results'>('home')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // 컴포넌트 마운트 시 세션 확인
  useEffect(() => {
    const user = SessionManager.getSession()
    setCurrentUser(user)
  }, [])

  // 로그아웃 처리
  const handleLogout = () => {
    SessionManager.clearSession()
    setCurrentUser(null)
    setCurrentPage('home')
    alert('로그아웃되었습니다!')
  }

  // 페이지 이동 처리
  const navigateTo = (page: typeof currentPage) => {
    // 로그인이 필요한 페이지 체크
    if (!currentUser && (page === 'community' || page === 'schedule' || page === 'results')) {
      setShowLoginModal(true)
      return
    }
    setCurrentPage(page)
  }

  // 현재 페이지 URL (공유용)
  const getCurrentPageUrl = () => {
    const baseUrl = 'https://athlete-time.pages.dev'
    return currentPage === 'home' ? baseUrl : `${baseUrl}/${currentPage}`
  }

  const getCurrentPageTitle = () => {
    const titles = {
      home: '애슬리트 타임 - 한국 육상인 통합 플랫폼',
      community: '커뮤니티 - 애슬리트 타임',
      schedule: '경기 일정 - 애슬리트 타임',
      results: '경기 결과 - 애슬리트 타임'
    }
    return titles[currentPage]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 로고/제목 */}
            <button 
              onClick={() => navigateTo('home')}
              className="flex items-center space-x-2"
            >
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
                  애슬리트 타임
                </span>
              </h1>
            </button>

            {/* 사용자 메뉴 */}
            <div className="flex items-center space-x-2">
              {/* 공유 버튼 */}
              <QuickShare 
                url={getCurrentPageUrl()}
                title={getCurrentPageTitle()}
                type="kakao"
                size="sm"
              />
              
              {currentUser ? (
                /* 로그인된 상태 */
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                    {currentUser.avatar && (
                      <img 
                        src={currentUser.avatar} 
                        alt="프로필" 
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700 max-w-20 truncate">
                      {currentUser.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              ) : (
                /* 로그아웃된 상태 */
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  로그인
                </button>
              )}
            </div>
          </div>

          {/* 서브타이틀 */}
          <p className="text-xs text-gray-600 mt-1 text-center">한국 육상인 통합 플랫폼</p>
        </div>
      </header>

      {/* 메인 컨텐트 */}
      <main className="max-w-md mx-auto px-4 py-6">
        {currentPage === 'home' && (
          <div className="space-y-6">
            {/* 환영 메시지 */}
            {currentUser && (
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-600">
                  안녕하세요, <span className="font-semibold text-gray-900">{currentUser.name}</span>님! 🏃‍♂️
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  오늘도 애슬리트 타임에서 소통해보세요!
                </p>
              </div>
            )}
            
            {/* 핵심 3가지 기능 */}
            {/* 1. 커뮤니티 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all active:scale-95">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-comments text-red-500 text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">커뮤니티</h2>
                  <p className="text-sm text-gray-600">익명 게시판 · 실시간 소통</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                <div className="bg-gray-50 rounded px-2 py-1 text-center">초등부</div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center">중등부</div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center">고등부</div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center">대학부</div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center">실업부</div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center">마스터즈</div>
              </div>
              <button 
                onClick={() => navigateTo('community')}
                className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors active:scale-95"
              >
                지금 바로 들어가기 →
              </button>
            </div>

            {/* 2. 경기 일정 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all active:scale-95">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-calendar-alt text-blue-500 text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">경기 일정</h2>
                  <p className="text-sm text-gray-600">실시간 시간표 · 대회 정보</p>
                </div>
              </div>
              <div className="text-sm text-gray-700 space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>• 2025 춘계 중고연맹전</span>
                  <span className="text-red-500 font-semibold">오늘 LIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>• 전국체전 예선</span>
                  <span>9/15</span>
                </div>
              </div>
              <button 
                onClick={() => navigateTo('schedule')}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors active:scale-95"
              >
                전체 일정 보기 →
              </button>
            </div>

            {/* 3. 경기 결과 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all active:scale-95">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-trophy text-green-500 text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">경기 결과</h2>
                  <p className="text-sm text-gray-600">실시간 결과 · 기록 관리</p>
                </div>
              </div>
              <div className="text-sm text-gray-700 space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>• 남고 100m 결승</span>
                  <span className="font-mono text-green-600 font-semibold">10.23</span>
                </div>
                <div className="flex justify-between">
                  <span>• 여중 1500m 결승</span>
                  <span className="font-mono text-green-600 font-semibold">4:45.12</span>
                </div>
              </div>
              <button 
                onClick={() => navigateTo('results')}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors active:scale-95"
              >
                최신 결과 확인 →
              </button>
            </div>

            {/* 상태 배너 */}
            {!currentUser && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-yellow-800">
                  <p className="font-semibold">🚀 프로덕션 배포 성공!</p>
                  <p className="text-sm mt-1">로그인하여 모든 기능을 이용해보세요!</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 space-y-2 mt-12">
              <p>🚧 개발 중인 서비스입니다</p>
              <p>2025년 상반기 정식 런칭 예정</p>
              <p className="text-red-500 font-semibold">실제 커뮤니티가 지금 활성화되고 있습니다!</p>
            </div>
          </div>
        )}

        {/* 다른 페이지들 */}
        {currentPage !== 'home' && (
          <div className="space-y-6">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <i className="fas fa-arrow-left"></i>
              <span>홈으로</span>
            </button>

            {/* 페이지별 컨텐트 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h1 className="text-2xl font-bold mb-4">
                {currentPage === 'community' && '커뮤니티'}
                {currentPage === 'schedule' && '경기 일정'}
                {currentPage === 'results' && '경기 결과'}
              </h1>
              
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-cog fa-spin text-4xl mb-4"></i>
                <p className="text-lg font-semibold">페이지 구현 중입니다</p>
                <p className="text-sm mt-2">곧 완성될 예정이에요! 🚀</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 로그인 모달 */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
};