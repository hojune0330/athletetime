// 🌟 정적 서버사이드 애플리케이션 v2.0 - 멋진 디자인 (React hooks 없이)
import { QuickShareButton } from './SocialShareV2'

export const StaticAppV2 = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* 애니메이션 배경 요소들 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse bg-blue-400"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse animation-delay-2000 bg-pink-400"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-4000 bg-purple-400"></div>
      </div>

      {/* 글라스모피즘 헤더 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 섹션 */}
            <div className="group flex items-center space-x-3">
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
                <p className="text-xs text-gray-600">
                  한국 육상인 통합 플랫폼
                </p>
              </div>
            </div>

            {/* 사용자 메뉴 */}
            <div className="flex items-center space-x-3">
              {/* 공유 버튼 */}
              <QuickShareButton />
              
              {/* 로그인 버튼 */}
              <button
                data-action="showLogin"
                className="relative px-6 py-2 rounded-lg font-bold text-white overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all group-hover:scale-110"></span>
                <span className="relative flex items-center space-x-2">
                  <i className="fas fa-user"></i>
                  <span>로그인</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐트 */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 히어로 섹션 */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 text-gray-900">
              <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-gradient bg-300%">
                육상인들의 새로운 시작
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600">
              초등부부터 마스터즈까지, 모든 한국 육상인들이 함께하는 공간
            </p>
          </div>

          {/* 메인 기능 카드들 - 그리드 레이아웃 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* 커뮤니티 카드 */}
            <div className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2" data-action="community">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative p-8 rounded-3xl backdrop-blur-sm bg-white/80 border border-gray-200">
                {/* 아이콘 */}
                <div className="w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-comments text-white text-2xl"></i>
                  </div>
                </div>
                
                {/* 제목 및 설명 */}
                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                  커뮤니티
                </h3>
                <p className="mb-4 text-gray-600">
                  익명으로 자유롭게 소통하는 육상인들의 공간
                </p>
                
                {/* 카테고리 태그들 */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">초등부</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">중등부</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">고등부</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">대학부</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">실업부</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">마스터즈</span>
                </div>
                
                {/* 실시간 활동 표시 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">실시간 활동 중</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">127명</span>
                </div>
              </div>
            </div>

            {/* 경기 일정 카드 */}
            <div className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2" data-action="schedule">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative p-8 rounded-3xl backdrop-blur-sm bg-white/80 border border-gray-200">
                {/* 아이콘 */}
                <div className="w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-calendar-alt text-white text-2xl"></i>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                  경기 일정
                </h3>
                <p className="mb-4 text-gray-600">
                  실시간 경기 시간표와 대회 정보
                </p>
                
                {/* 오늘의 경기 */}
                <div className="space-y-2 mb-4 p-3 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-600">오늘의 경기</span>
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">LIVE</span>
                  </div>
                  <div className="text-sm text-gray-700">2025 춘계 중고연맹전</div>
                </div>
                
                {/* 예정된 대회 */}
                <div className="text-sm space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>전국체전 예선</span>
                    <span>9/15</span>
                  </div>
                  <div className="flex justify-between">
                    <span>추계 대학대회</span>
                    <span>9/22</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 경기 결과 카드 */}
            <div className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2" data-action="results">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative p-8 rounded-3xl backdrop-blur-sm bg-white/80 border border-gray-200">
                {/* 아이콘 */}
                <div className="w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-trophy text-white text-2xl"></i>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                  경기 결과
                </h3>
                <p className="mb-4 text-gray-600">
                  실시간 결과 업데이트와 기록 관리
                </p>
                
                {/* 최신 기록들 */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-green-50">
                    <span className="text-sm text-gray-700">남고 100m 결승</span>
                    <span className="font-mono font-bold text-lg text-green-600">10.23</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-green-50">
                    <span className="text-sm text-gray-700">여중 1500m 결승</span>
                    <span className="font-mono font-bold text-lg text-green-600">4:45.12</span>
                  </div>
                </div>
                
                {/* 신기록 배지 */}
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                    신기록
                  </span>
                  <span className="text-xs text-gray-600">오늘 3개 경신</span>
                </div>
              </div>
            </div>
          </div>

          {/* 통계 섹션 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl backdrop-blur-sm bg-white/50 border border-gray-200">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                1,234
              </div>
              <div className="text-sm text-gray-600">활성 사용자</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                567
              </div>
              <div className="text-sm text-gray-600">오늘의 게시글</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                89
              </div>
              <div className="text-sm text-gray-600">진행중 경기</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent">
                12
              </div>
              <div className="text-sm text-gray-600">신기록 달성</div>
            </div>
          </div>

          {/* CTA 배너 */}
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
                data-action="showLogin"
                className="px-8 py-3 bg-white text-purple-600 font-bold rounded-full hover:scale-105 transform transition-all"
              >
                무료로 시작하기
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t bg-white/50 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 애슬리트 타임. All rights reserved.
            </p>
            <p className="text-xs mt-2 text-gray-500">
              Made with ❤️ for Korean Athletes
            </p>
          </div>
        </div>
      </footer>

      {/* 스타일 추가 */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-in-out;
        }
        
        .bg-300\\% {
          background-size: 300% 300%;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}