// 🏃‍♂️ 애슬리트 타임 v2.0 - 완전히 새로운 디자인
// 모던 디자인, 그라데이션, 애니메이션, 다크모드, 글라스모피즘 적용

import { useState, useEffect } from 'react'
import { LoginModal } from './LoginModalV2'
import { QuickShare } from './SocialShareV2'
import { CommunityPage } from './CommunityPage'
import { MarketplacePage } from './MarketplacePage'
import { ResultsPage } from './ResultsPage'
import { SessionManager } from '../auth/session'
import type { UserSession } from '../auth/providers'

export const InteractiveAppV2 = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [currentPage, setCurrentPage] = useState<'home' | 'community' | 'marketplace' | 'results'>('home')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeHoverCard, setActiveHoverCard] = useState<string | null>(null)

  // 컴포넌트 마운트 시 세션 확인 및 다크모드 체크
  useEffect(() => {
    const user = SessionManager.getSession()
    setCurrentUser(user)
    
    // 시스템 다크모드 감지
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(prefersDark)
    
    // 로고 애니메이션
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 1000)
  }, [])

  // 다크모드 토글
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  // 로그아웃 처리 with 애니메이션
  const handleLogout = () => {
    setIsAnimating(true)
    setTimeout(() => {
      SessionManager.clearSession()
      setCurrentUser(null)
      setCurrentPage('home')
      setIsAnimating(false)
    }, 300)
  }

  // 페이지 이동 처리 with 트랜지션
  const navigateTo = (page: typeof currentPage) => {
    if (!currentUser && (page === 'community' || page === 'marketplace' || page === 'results')) {
      setShowLoginModal(true)
      return
    }
    
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsAnimating(false)
    }, 300)
  }

  // 현재 페이지 URL
  const getCurrentPageUrl = () => {
    const baseUrl = 'https://athlete-time.pages.dev'
    return currentPage === 'home' ? baseUrl : `${baseUrl}/${currentPage}`
  }

  const getCurrentPageTitle = () => {
    const titles = {
      home: '애슬리트 타임 - 한국 육상인 통합 플랫폼',
      community: '커뮤니티 - 애슬리트 타임',
      marketplace: '중고 거래 - 애슬리트 타임',
      results: '경기 결과 - 애슬리트 타임'
    }
    return titles[currentPage]
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* 애니메이션 배경 요소들 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse ${
          isDarkMode ? 'bg-purple-500' : 'bg-blue-400'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse animation-delay-2000 ${
          isDarkMode ? 'bg-blue-500' : 'bg-pink-400'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-4000 ${
          isDarkMode ? 'bg-violet-500' : 'bg-purple-400'
        }`}></div>
      </div>

      {/* 글라스모피즘 헤더 */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${
        isDarkMode 
          ? 'bg-gray-900/70 border-b border-gray-800' 
          : 'bg-white/70 border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 섹션 */}
            <button 
              onClick={() => navigateTo('home')}
              className={`group flex items-center space-x-3 ${isAnimating ? 'animate-bounce' : ''}`}
            >
              {/* 애니메이션 로고 아이콘 */}
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-blue-500 rounded-xl rotate-45 group-hover:rotate-90 transition-transform duration-300"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">AT</span>
                </div>
              </div>
              
              {/* 타이틀 */}
              <div className="hidden sm:block">
                <h1 className="text-2xl font-black">
                  <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-gradient bg-300%">
                    애슬리트 타임
                  </span>
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  한국 육상인 통합 플랫폼
                </p>
              </div>
            </button>

            {/* 네비게이션 (데스크톱) */}
            <nav className="hidden md:flex items-center space-x-1">
              {['community', 'marketplace', 'results'].map((page) => (
                <button
                  key={page}
                  onClick={() => navigateTo(page as typeof currentPage)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentPage === page
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg scale-105'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                      : isDarkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {page === 'community' && '커뮤니티'}
                  {page === 'marketplace' && '중고 거래'}
                  {page === 'results' && '경기 결과'}
                </button>
              ))}
            </nav>

            {/* 사용자 메뉴 */}
            <div className="flex items-center space-x-3">
              {/* 다크모드 토글 */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-all ${
                  isDarkMode 
                    ? 'text-yellow-400 hover:bg-gray-800' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
              </button>

              {/* 공유 버튼 */}
              <QuickShare 
                url={getCurrentPageUrl()}
                title={getCurrentPageTitle()}
                isDarkMode={isDarkMode}
              />
              
              {currentUser ? (
                /* 로그인된 상태 */
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30' 
                      : 'bg-gradient-to-r from-blue-100 to-purple-100'
                  }`}>
                    {currentUser.avatar && (
                      <img 
                        src={currentUser.avatar} 
                        alt="프로필" 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                      />
                    )}
                    <span className={`font-semibold max-w-32 truncate ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {currentUser.name}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className={`p-2 rounded-lg transition-all hover:scale-110 ${
                      isDarkMode 
                        ? 'text-red-400 hover:bg-red-900/20' 
                        : 'text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              ) : (
                /* 로그아웃된 상태 */
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="relative px-6 py-2 rounded-lg font-bold text-white overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all group-hover:scale-110"></span>
                  <span className="relative flex items-center space-x-2">
                    <i className="fas fa-user"></i>
                    <span>로그인</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐트 */}
      <main className={`transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {currentPage === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 히어로 섹션 */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-gradient bg-300%">
                  육상인들의 새로운 시작
                </span>
              </h1>
              <p className={`text-lg sm:text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                초등부부터 마스터즈까지, 모든 한국 육상인들이 함께하는 공간
              </p>
              
              {currentUser && (
                <div className={`mt-6 inline-flex items-center space-x-2 px-6 py-3 rounded-full ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30' 
                    : 'bg-gradient-to-r from-blue-100 to-purple-100'
                }`}>
                  <span className="text-2xl">👋</span>
                  <span className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    환영합니다, {currentUser.name}님!
                  </span>
                </div>
              )}
            </div>

            {/* 메인 기능 카드들 - 그리드 레이아웃 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* 커뮤니티 카드 */}
              <div
                onMouseEnter={() => setActiveHoverCard('community')}
                onMouseLeave={() => setActiveHoverCard(null)}
                onClick={() => navigateTo('community')}
                className={`relative group cursor-pointer transform transition-all duration-300 ${
                  activeHoverCard === 'community' ? 'scale-105 -translate-y-2' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                <div className={`relative p-8 rounded-3xl backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-900/80 border border-gray-700' 
                    : 'bg-white/80 border border-gray-200'
                }`}>
                  {/* 아이콘 */}
                  <div className="w-16 h-16 mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-comments text-white text-2xl"></i>
                    </div>
                  </div>
                  
                  {/* 제목 및 설명 */}
                  <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    커뮤니티
                  </h3>
                  <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    익명으로 자유롭게 소통하는 육상인들의 공간
                  </p>
                  
                  {/* 카테고리 태그들 */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['초등부', '중등부', '고등부', '대학부', '실업부', '마스터즈'].map(category => (
                      <span 
                        key={category}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isDarkMode 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  
                  {/* 실시간 활동 표시 */}
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        실시간 활동 중
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      127명
                    </span>
                  </div>
                </div>
              </div>

              {/* 중고 거래 카드 */}
              <div
                onMouseEnter={() => setActiveHoverCard('marketplace')}
                onMouseLeave={() => setActiveHoverCard(null)}
                onClick={() => navigateTo('marketplace')}
                className={`relative group cursor-pointer transform transition-all duration-300 ${
                  activeHoverCard === 'marketplace' ? 'scale-105 -translate-y-2' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                <div className={`relative p-8 rounded-3xl backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-900/80 border border-gray-700' 
                    : 'bg-white/80 border border-gray-200'
                }`}>
                  {/* 아이콘 */}
                  <div className="w-16 h-16 mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-shopping-bag text-white text-2xl"></i>
                    </div>
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    중고 거래
                  </h3>
                  <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    육상 용품 거래 마켓플레이스
                  </p>
                  
                  {/* 인기 상품 */}
                  <div className={`space-y-2 mb-4 p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800/50' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        인기 상품
                      </span>
                      <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full animate-pulse">
                        HOT
                      </span>
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      나이키 스파이크 외 127개
                    </div>
                  </div>
                  
                  {/* 카테고리 */}
                  <div className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex justify-between">
                      <span>스파이크</span>
                      <span className="text-green-500">45개</span>
                    </div>
                    <div className="flex justify-between">
                      <span>유니폼</span>
                      <span className="text-green-500">32개</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 경기 결과 카드 */}
              <div
                onMouseEnter={() => setActiveHoverCard('results')}
                onMouseLeave={() => setActiveHoverCard(null)}
                onClick={() => navigateTo('results')}
                className={`relative group cursor-pointer transform transition-all duration-300 ${
                  activeHoverCard === 'results' ? 'scale-105 -translate-y-2' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                <div className={`relative p-8 rounded-3xl backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-900/80 border border-gray-700' 
                    : 'bg-white/80 border border-gray-200'
                }`}>
                  {/* 아이콘 */}
                  <div className="w-16 h-16 mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-trophy text-white text-2xl"></i>
                    </div>
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    경기 결과
                  </h3>
                  <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    실시간 결과 업데이트와 기록 관리
                  </p>
                  
                  {/* 최신 기록들 */}
                  <div className={`space-y-3 mb-4`}>
                    <div className={`flex justify-between items-center p-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-800/50' : 'bg-green-50'
                    }`}>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        남고 100m 결승
                      </span>
                      <span className={`font-mono font-bold text-lg ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        10.23
                      </span>
                    </div>
                    <div className={`flex justify-between items-center p-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-800/50' : 'bg-green-50'
                    }`}>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        여중 1500m 결승
                      </span>
                      <span className={`font-mono font-bold text-lg ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        4:45.12
                      </span>
                    </div>
                  </div>
                  
                  {/* 신기록 배지 */}
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                      신기록
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      오늘 3개 경신
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 섹션 */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-gray-900/50 border border-gray-700' 
                : 'bg-white/50 border border-gray-200'
            }`}>
              <div className="text-center">
                <div className={`text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent`}>
                  1,234
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  활성 사용자
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent`}>
                  567
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  오늘의 게시글
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent`}>
                  89
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  진행중 경기
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent`}>
                  12
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  신기록 달성
                </div>
              </div>
            </div>

            {/* CTA 배너 */}
            {!currentUser && (
              <div className="mt-12 relative overflow-hidden rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 animate-gradient bg-300%"></div>
                <div className="relative p-8 text-center">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    지금 바로 시작하세요! 🚀
                  </h2>
                  <p className="text-white/90 mb-6">
                    한국 육상인들과 함께 소통하고, 경기 정보를 실시간으로 확인하세요
                  </p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-8 py-3 bg-white text-purple-600 font-bold rounded-full hover:scale-105 transform transition-all"
                  >
                    무료로 시작하기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 다른 페이지들 */}
        {currentPage === 'community' && (
          <CommunityPage isDarkMode={isDarkMode} onBack={() => navigateTo('home')} />
        )}
        {currentPage === 'marketplace' && (
          <MarketplacePage isDarkMode={isDarkMode} onBack={() => navigateTo('home')} />
        )}
        {currentPage === 'results' && (
          <ResultsPage isDarkMode={isDarkMode} onBack={() => navigateTo('home')} />
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-20 border-t ${
        isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white/50 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              © 2025 애슬리트 타임. All rights reserved.
            </p>
            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Made with ❤️ for Korean Athletes
            </p>
          </div>
        </div>
      </footer>

      {/* 로그인 모달 */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        isDarkMode={isDarkMode}
      />

      {/* 스타일 추가 */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        
        .bg-300\% {
          background-size: 300% 300%;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}