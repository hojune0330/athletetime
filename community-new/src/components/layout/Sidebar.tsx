import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation()
  
  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="space-y-4 sticky top-20">
      {/* 프로필 영역 */}
      <div className="bg-dark-700 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
            익
          </div>
          <div>
            <div className="text-sm font-medium text-white">익명의 러너</div>
            <div className="text-xs text-gray-400">오늘도 화이팅!</div>
          </div>
        </div>
        <button className="w-full btn-primary text-sm">
          로그인 / 회원가입
        </button>
      </div>

      {/* 주요 메뉴 */}
      <div className="bg-dark-700 rounded-lg p-4">
        <nav className="space-y-1">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            🎭 익명게시판
          </Link>
          <Link
            to="/events"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              location.pathname.includes('/events') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            🏆 대회 게시판
          </Link>
          <Link
            to="/track"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              location.pathname.includes('/track') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            🏃 종목별 게시판
          </Link>
          <Link
            to="/market"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/market') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            🛒 중고거래
          </Link>
          <hr className="border-dark-600 my-2" />
          <Link
            to="/training"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/training') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            📝 훈련일지
          </Link>
          <Link
            to="/calculator"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/calculator') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            🧮 페이스 계산기
          </Link>
          <Link
            to="/records"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/records') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-dark-600 hover:text-white'
            }`}
          >
            📊 내 기록
          </Link>
        </nav>
      </div>

      {/* 실시간 인기 키워드 */}
      <div className="bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">🔥 실시간 인기</h3>
        <div className="space-y-2">
          {[
            { rank: 1, keyword: '서울마라톤', change: 'up' },
            { rank: 2, keyword: '러닝화 추천', change: 'new' },
            { rank: 3, keyword: '100m 훈련', change: '-' },
            { rank: 4, keyword: '부상 회복', change: 'down' },
            { rank: 5, keyword: '전국체전', change: 'up' },
          ].map((item) => (
            <div key={item.rank} className="flex items-center gap-2 text-xs">
              <span className="text-primary-400 font-bold w-4">{item.rank}</span>
              <span className="text-gray-300 flex-1 truncate hover:text-white cursor-pointer">
                {item.keyword}
              </span>
              {item.change === 'up' && <span className="text-red-400">↑</span>}
              {item.change === 'down' && <span className="text-blue-400">↓</span>}
              {item.change === 'new' && <span className="text-yellow-400 font-bold text-[10px]">NEW</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 인스타그램 연동 */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-2">📸 인스타그램</h3>
        <p className="text-xs text-white/80 mb-3">
          운동 기록을 인스타에 공유하세요
        </p>
        <button className="w-full px-3 py-2 bg-white/20 backdrop-blur text-white text-sm rounded-lg hover:bg-white/30 transition-colors">
          인스타그램 연동
        </button>
      </div>
    </div>
  )
}