/**
 * AdminLayout - 관리자 대시보드 레이아웃
 * 
 * 사이드바 + 메인 콘텐츠 구조
 * 모바일에서는 사이드바 접을 수 있음
 */

import { Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  ChartBarIcon,
  PhotoIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftIcon,
  ServerIcon,
  ShieldExclamationIcon,
  BookOpenIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const adminNavItems = [
  { path: '/admin', label: '대시보드', icon: ChartBarIcon, end: true },
  { path: '/admin/gallery', label: '갤러리', icon: PhotoIcon, end: false },
  { path: '/admin/card-studio', label: '카드 스튜디오', icon: PaintBrushIcon, end: false },
  { path: '/admin/content', label: '콘텐츠 관리', icon: DocumentTextIcon, end: true },
  { path: '/admin/content/magazine', label: '매거진 편집실', icon: NewspaperIcon, end: false },
  { path: '/admin/pipeline', label: '파이프라인', icon: CogIcon, end: false },
  { path: '/admin/data-requests', label: '정정·삭제 요청', icon: ShieldExclamationIcon, end: false },
  { path: '/admin/operator-guide', label: '운영 가이드', icon: BookOpenIcon, end: false },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* 관리자 상단 바 */}
      <header className="sticky top-0 z-50 bg-neutral-900 text-white shadow-lg">
        <div className="flex items-center justify-between h-14 px-4">
          {/* 왼쪽: 모바일 메뉴 + 로고 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#C3FF00] rounded-lg flex items-center justify-center text-xs font-black text-neutral-900">
                AT
              </div>
              <span className="font-bold text-lg">AthleteTime</span>
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                ADMIN
              </span>
            </Link>
          </div>

          {/* 오른쪽: 사이트 보기 + 사용자 */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>사이트로</span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
              <div className="w-6 h-6 bg-[#C3FF00] rounded-full flex items-center justify-center text-xs font-bold text-neutral-900">
                {user?.nickname?.charAt(0) || 'A'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{user?.nickname || 'Admin'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바 - 모바일 오버레이 */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 사이드바 */}
        <aside
          className={`
            fixed lg:sticky top-14 z-40 h-[calc(100vh-56px)]
            w-60 bg-white border-r border-neutral-200 
            transform transition-transform duration-200
            lg:transform-none lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              관리 메뉴
            </div>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="my-4 border-t border-neutral-100" />

            <div className="px-3 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              바로가기
            </div>
            <Link
              to="/community"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <span className="text-lg">💬</span>
              <span>커뮤니티</span>
            </Link>
            <Link
              to="/competitions"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <span className="text-lg">🏆</span>
              <span>대회 관리</span>
            </Link>
          </nav>

          {/* 시스템 상태 미니 위젯 */}
          <div className="absolute bottom-4 left-3 right-3">
            <div className="p-3 bg-neutral-50 rounded-xl text-xs">
              <div className="flex items-center gap-2 mb-2">
                <ServerIcon className="w-4 h-4 text-neutral-400" />
                <span className="font-medium text-neutral-600">시스템</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                <span className="text-neutral-500">서버 정상</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-h-[calc(100vh-56px)] p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
