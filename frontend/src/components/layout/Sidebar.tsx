import { Link, useLocation } from 'react-router-dom';

import { launchNavigationItems } from '../../config/launchSurface';

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="space-y-4 sticky top-20">
      <div className="card">
        <div className="card-body">
          <p className="mb-2 text-sm font-bold text-neutral-400">Athlete Time</p>
          <h2 className="text-lg font-black text-neutral-950">지금 열려 있는 기능</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            오픈 준비가 끝난 기능만 바로 연결합니다.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-3">
          <nav className="space-y-1">
            <Link
              to="/"
              className={`sidebar-item ${
                location.pathname === '/' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <span className="text-lg">⌂</span>
              <span>홈</span>
            </Link>
            {launchNavigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${
                  location.pathname.startsWith(item.path)
                    ? 'sidebar-item-active'
                    : 'sidebar-item-inactive'
                }`}
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="card border-dashed border-neutral-200">
        <div className="card-body">
          <p className="text-sm font-bold text-neutral-900">곧 열릴 기능</p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            커뮤니티, 채팅, 중고거래는 운영 기준을 점검한 뒤 공개합니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
