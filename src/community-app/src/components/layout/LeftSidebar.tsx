import { Link, useLocation } from 'react-router-dom'

interface MenuSection {
  title: string
  items: MenuItem[]
}

interface MenuItem {
  label: string
  href: string
  emoji?: string
  count?: number
  isNew?: boolean
}

const menuSections: MenuSection[] = [
  {
    title: '최~~~~고로 인기!',
    items: [
      { label: '전체 인기글', href: '/?sort=popular', emoji: '👍' },
      { label: '주간 베스트', href: '/?sort=week', emoji: '🌟' },
      { label: '월간 베스트', href: '/?sort=month', emoji: '🏆' },
    ]
  },
  {
    title: '운동 게시판',
    items: [
      { label: '러닝', href: '/boards/running', emoji: '🏃', count: 42 },
      { label: '마라톤', href: '/boards/marathon', emoji: '🏽', count: 28 },
      { label: '트랙&필드', href: '/boards/track', emoji: '🎯', count: 15 },
      { label: '크로스핏', href: '/boards/crossfit', emoji: '🏋️', count: 8, isNew: true },
      { label: '사이클', href: '/boards/cycle', emoji: '🚴', count: 5 },
    ]
  },
  {
    title: '커뮤니티',
    items: [
      { label: '유머', href: '/boards/humor', emoji: '😄' },
      { label: '인증&후기', href: '/boards/review', emoji: '📸' },
      { label: '팁&정보', href: '/boards/tips', emoji: '💡' },
      { label: '모임&번개', href: '/boards/meetup', emoji: '👥' },
      { label: '이벤트', href: '/boards/event', emoji: '🎆', isNew: true },
    ]
  },
]

function LeftSidebar() {
  const location = useLocation()

  return (
    <aside className="space-y-1">
      {/* 즐겨찾기 영역 */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">즐겨찾기</span>
        </div>
        <div className="space-y-1">
          <Link to="/" className="flex items-center gap-2 py-1.5 px-2 rounded text-sm hover:bg-slate-50">
            <span className="text-xs">🏠</span>
            <span className="text-slate-700">홈</span>
          </Link>
          <Link to="/?sort=latest" className="flex items-center gap-2 py-1.5 px-2 rounded text-sm hover:bg-slate-50">
            <span className="text-xs">🆕</span>
            <span className="text-slate-700">최신방문</span>
          </Link>
        </div>
      </div>

      {/* 메뉴 섹션들 */}
      {menuSections.map((section) => (
        <div key={section.title} className="bg-white rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2">
            {section.title}
          </h3>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = location.pathname + location.search === item.href
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`flex items-center justify-between py-1.5 px-2 rounded text-sm transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-medium' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.emoji && <span className="text-base">{item.emoji}</span>}
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span className="text-xs text-slate-400">{item.count}</span>
                    )}
                    {item.isNew && (
                      <span className="text-xs font-bold text-red-500">NEW</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {/* 하단 안내 */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 mt-4">
        <p className="text-xs text-yellow-800">
          <span className="font-bold">베타 테스트 중!</span><br />
          로그인 없이 자유롭게 이용하세요
        </p>
      </div>
    </aside>
  )
}

export default LeftSidebar