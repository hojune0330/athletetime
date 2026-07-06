/**
 * Footer 컴포넌트 (TRAINORACLE — Scientific Minimalism)
 * v6.0.0 - 공개 기록 출처 + 정정/비노출 요청 경로 노출, 디자인 토큰 통일
 */

import { Link } from 'react-router-dom';
import { DataNoticeBlock } from '../common/DataNotice';

const NAV_LINKS = [
  { to: '/competitions', label: '대회·기록' },
  { to: '/profile-card', label: '프로필 카드' },
  { to: '/community', label: '커뮤니티' },
  { to: '/pace-calculator', label: '페이스 계산기' },
  { to: '/about-data', label: '자료 수집 방식' },
  { to: '/data-request', label: '정정·삭제 요청' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-hair bg-surface">
      <div className="mx-auto max-w-frame px-4 py-10">
        {/* 상단: 브랜드 + 내비 */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-article space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center bg-brand-500 text-surface">
                <span className="font-mono text-mono-xs font-semibold tracking-widest-2">AT</span>
              </span>
              <h3 className="text-h3 font-medium tracking-tighter-2 text-ink">Athlete Time</h3>
              <span className="border border-hair px-1.5 py-0.5 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
                애타
              </span>
            </div>
            <p className="text-body-sm text-ink-3">
              흩어진 공개 육상 기록을 이름으로 찾는 곳 · Every Second Counts
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-body-sm text-ink-3 transition-colors hover:text-brand-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 면책 + 정정/삭제 요청 안내 */}
        <div className="mt-8 border-t border-hair pt-6">
          <DataNoticeBlock className="max-w-frame" />
        </div>

        {/* 저작권 */}
        <div className="mt-6 border-t border-hair pt-4">
          <p className="font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
            © 2025–{year} Athlete Time (애타) · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
