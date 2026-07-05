import { Link } from 'react-router-dom';

import { launchNavigationItems } from '../../config/launchSurface';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-lg font-black text-neutral-950">Athlete Time</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
              지금은 경기 결과와 계산기처럼 안정적으로 제공할 수 있는 기능부터 열어둡니다.
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-bold text-neutral-600">
            {launchNavigationItems.map((item) => (
              <Link key={item.path} to={item.path} className="hover:text-primary-600">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t border-neutral-100 pt-6 text-xs text-neutral-400">
          © 2026 Athlete Time. 공개 가능한 기능부터 순차적으로 안정화합니다.
        </p>
      </div>
    </footer>
  );
}
