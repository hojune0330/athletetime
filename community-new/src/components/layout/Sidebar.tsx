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
      { label: '명예의 전당', href: '/?sort=hall', emoji: '🏛️' },
    ]
  },
  {
    title: '침착맨',
    items: [
      { label: '방송일정', href: '/board/schedule', emoji: '👀' },
      { label: '침착맨', href: '/board/calm', emoji: '😊' },
      { label: '침착맨 짤', href: '/board/meme', emoji: '🎃' },
      { label: '팬아트', href: '/board/fanart', emoji: '🎨' },
      { label: '방송 해줘요', href: '/board/request', emoji: '📣' },
    ]
  },
  {
    title: '커뮤니티',
    items: [
      { label: '유머', href: '/board/humor', emoji: '😄' },
      { label: '일상', href: '/board/daily', emoji: '😎' },
      { label: '취미', href: '/board/hobby', emoji: '📖' },
      { label: '인방', href: '/board/stream', emoji: '💻' },
      { label: '호들갑', href: '/board/excited', emoji: '😱' },
    ]
  },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div className="space-y-1">
      {/* 즐겨찾기 */}
      <div className="card p-3">
        <div className="text-xs font-bold text-gray-700 mb-2">즐겨찾기</div>
        <div className="space-y-1">
          <Link to="/" className="flex items-center gap-2 py-1.5 px-2 rounded text-sm hover:bg-gray-50">
            <span>🏠</span>
            <span className="text-gray-700">홈</span>
          </Link>
          <Link to="/?sort=latest" className="flex items-center gap-2 py-1.5 px-2 rounded text-sm hover:bg-gray-50">
            <span>🆕</span>
            <span className="text-gray-700">최근방문</span>
          </Link>
        </div>
      </div>

      {/* 메뉴 섹션 */}
      {menuSections.map((section) => (
        <div key={section.title} className="card p-3">
          <h3 className="text-xs font-bold text-gray-700 mb-2">
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
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.emoji && <span>{item.emoji}</span>}
                      <span>{item.label}</span>
                    </span>
                    {item.count && (
                      <span className="text-xs text-gray-400">{item.count}</span>
                    )}
                    {item.isNew && (
                      <span className="badge-new">NEW</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {/* 베타 안내 */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3">
        <p className="text-xs text-yellow-800">
          <span className="font-bold">베타 서비스</span><br />
          일부 기능이 제한될 수 있습니다
        </p>
      </div>
    </div>
  )
}