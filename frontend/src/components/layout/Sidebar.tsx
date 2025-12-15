import { Link, useLocation } from 'react-router-dom'

// 외부 링크 클릭 핸들러 (React Router 우회)
const handleExternalLink = (e: React.MouseEvent, path: string) => {
  e.preventDefault()
  window.location.href = `/${path}`
}

export default function Sidebar() {
  const location = useLocation()
  
  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="space-y-4 sticky top-20">
      {/* 프로필 영역 */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              익
            </div>
            <div>
              <div className="font-semibold text-neutral-900">익명의 러너</div>
              <div className="text-sm text-neutral-500">오늘도 화이팅! 🏃‍♂️</div>
            </div>
          </div>
          <Link to="/login" className="btn-primary w-full text-center">
            로그인 / 회원가입
          </Link>
        </div>
      </div>

      {/* 주요 메뉴 */}
      <div className="card">
        <div className="card-body p-3">
          <nav className="space-y-1">
            <Link
              to="/"
              className={`sidebar-item ${isActive('/') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
            >
              <span className="text-lg">🎭</span>
              <span>익명게시판</span>
            </Link>
            <Link
              to="/events"
              className={`sidebar-item ${location.pathname.includes('/events') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
            >
              <span className="text-lg">🏆</span>
              <span>대회 게시판</span>
            </Link>
            <Link
              to="/track"
              className={`sidebar-item ${location.pathname.includes('/track') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
            >
              <span className="text-lg">🏃</span>
              <span>종목별 게시판</span>
            </Link>
            <Link
              to="/market"
              className={`sidebar-item ${isActive('/market') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
            >
              <span className="text-lg">🛒</span>
              <span>중고거래</span>
            </Link>
            
            <hr className="border-neutral-100 my-3" />
            
            <a
              href="/pace-calculator.html"
              onClick={(e) => handleExternalLink(e, 'pace-calculator.html')}
              className="sidebar-item sidebar-item-inactive"
            >
              <span className="text-lg">🧮</span>
              <span>페이스 계산기</span>
            </a>
            <a
              href="/training-calculator.html"
              onClick={(e) => handleExternalLink(e, 'training-calculator.html')}
              className="sidebar-item sidebar-item-inactive"
            >
              <span className="text-lg">📝</span>
              <span>훈련 계산기</span>
            </a>
            <a
              href="/chat.html"
              onClick={(e) => handleExternalLink(e, 'chat.html')}
              className="sidebar-item sidebar-item-inactive"
            >
              <span className="text-lg">💬</span>
              <span>실시간 채팅</span>
            </a>
          </nav>
        </div>
      </div>

      {/* 실시간 인기 키워드 */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            실시간 인기
          </h3>
          <div className="space-y-2.5">
            {[
              { rank: 1, keyword: '서울마라톤', change: 'up' },
              { rank: 2, keyword: '러닝화 추천', change: 'new' },
              { rank: 3, keyword: '100m 훈련', change: '-' },
              { rank: 4, keyword: '부상 회복', change: 'down' },
              { rank: 5, keyword: '전국체전', change: 'up' },
            ].map((item) => (
              <div key={item.rank} className="flex items-center gap-3 group cursor-pointer">
                <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  item.rank <= 3 ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {item.rank}
                </span>
                <span className="text-sm text-neutral-700 flex-1 truncate group-hover:text-primary-600 transition-colors">
                  {item.keyword}
                </span>
                {item.change === 'up' && <span className="text-danger-500 text-xs">▲</span>}
                {item.change === 'down' && <span className="text-info-500 text-xs">▼</span>}
                {item.change === 'new' && (
                  <span className="badge-new text-[10px]">NEW</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 인스타그램 연동 */}
      <div className="card bg-gradient-to-br from-primary-500 to-accent-500 border-0">
        <div className="card-body">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">📸</span>
            인스타그램
          </h3>
          <p className="text-xs text-white/80 mb-4">
            운동 기록을 인스타에 공유하세요
          </p>
          <button className="w-full px-4 py-2.5 bg-white/20 backdrop-blur text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors">
            인스타그램 연동
          </button>
        </div>
      </div>
    </div>
  )
}
