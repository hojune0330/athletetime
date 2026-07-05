import { Link } from 'react-router-dom';

const quickLinks = [
  { path: '/competitions', label: '경기 결과', emoji: '🏆' },
  { path: '/pace-calculator', label: '페이스 계산기', emoji: '⏱' },
  { path: '/training-calculator', label: '훈련 계산기', emoji: '📊' },
] as const;

export default function RightBanner() {
  return (
    <aside className="space-y-4 sticky top-20">
      <div className="card">
        <div className="card-body">
          <p className="mb-3 text-sm font-bold text-neutral-400">QUICK</p>
          <div className="grid gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="rounded-2xl border border-neutral-200 px-4 py-3 font-bold text-neutral-900 transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <span className="mr-2">{link.emoji}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-neutral-950 text-white">
        <div className="card-body">
          <p className="text-sm font-bold text-white/55">오픈 전 점검</p>
          <p className="mt-2 text-sm leading-6 text-white/75">
            커뮤니티와 채팅은 사용자 보호 기준을 갖춘 뒤 열겠습니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
