// 정적 서버사이드 애플리케이션 (React hooks 없이)
import { QuickShareButton } from './StaticSocialShare'

export const StaticApp = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 로고/제목 */}
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
                  애슬리트 타임
                </span>
              </h1>
            </div>

            {/* 사용자 메뉴 */}
            <div className="flex items-center space-x-2">
              {/* 공유 버튼 */}
              <QuickShareButton />
              
              {/* 로그인 버튼 */}
              <button
                data-action="showLogin"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors active:scale-95"
              >
                로그인
              </button>
            </div>
          </div>

          {/* 서브타이틀 */}
          <p className="text-xs text-gray-600 mt-1 text-center">한국 육상인 통합 플랫폼</p>
        </div>
      </header>

      {/* 메인 컨텐트 */}
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-6">
          
          {/* 핵심 3가지 기능 */}
          {/* 1. 커뮤니티 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer" data-action="community">
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
            <div className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold text-center">
              지금 바로 들어가기 →
            </div>
          </div>

          {/* 2. 경기 일정 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer" data-action="schedule">
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
            <div className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold text-center">
              전체 일정 보기 →
            </div>
          </div>

          {/* 3. 경기 결과 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer" data-action="results">
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
            <div className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold text-center">
              최신 결과 확인 →
            </div>
          </div>

          {/* 상태 배너 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-yellow-800">
              <p className="font-semibold">🚀 완전한 웹앱으로 업그레이드!</p>
              <p className="text-sm mt-1">로그인하여 모든 인터랙티브 기능을 이용해보세요!</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 space-y-2 mt-12">
            <p>🚧 개발 중인 서비스입니다</p>
            <p>2025년 상반기 정식 런칭 예정</p>
            <p className="text-red-500 font-semibold">실제 커뮤니티가 지금 활성화되고 있습니다!</p>
          </div>
        </div>
      </main>

      {/* 로그인 모달 (숨김 상태) */}
      <div id="loginModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 hidden">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">로그인</h2>
              <button data-action="closeModal" className="p-2 hover:bg-gray-100 rounded-full">
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">애슬리트 타임에서 소통해보세요!</p>
          </div>

          {/* 소셜 로그인 버튼들 */}
          <div className="p-6 space-y-3">
            <button data-provider="google" className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50">
              <i className="fab fa-google text-lg"></i>
              <span>구글로 계속하기</span>
            </button>

            <button data-provider="apple" className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium bg-black text-white hover:bg-gray-800">
              <i className="fab fa-apple text-lg"></i>
              <span>Apple로 계속하기</span>
            </button>

            <button data-provider="kakao" className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium bg-yellow-400 text-black hover:bg-yellow-500">
              <i className="fas fa-comment text-lg"></i>
              <span>카카오로 계속하기</span>
            </button>

            <button data-provider="naver" className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600">
              <i className="fas fa-n text-lg"></i>
              <span>네이버로 계속하기</span>
            </button>

            {/* 구분선 */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-sm text-gray-500">또는</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* 익명 로그인 */}
            <button data-action="anonymous" className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
              <i className="fas fa-user-secret text-lg"></i>
              <span>익명으로 둘러보기</span>
            </button>

            {/* 안내 텍스트 */}
            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              로그인 시 <span className="text-blue-500">서비스 약관</span> 및 
              <span className="text-blue-500"> 개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
};