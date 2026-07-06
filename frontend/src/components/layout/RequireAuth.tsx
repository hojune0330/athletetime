/**
 * RequireAuth — 전역 보호 라우트 가드 (B)
 *
 * 로그인이 필요한 라우트를 감싼다. 비로그인 사용자가 진입하면:
 *  - 현재 가려던 경로를 기억하고(A)
 *  - 페이지 이동 없이 로그인 모달을 띄운 뒤(C)
 *  - 홈으로 보내 맥락이 끊기지 않게 한다. 로그인하면 원래 경로로 복귀(A).
 *
 * 기존에 페이지마다 흩어져 있던 `if(!token) navigate('/login')` 패턴을
 * 하나로 통일한다. (ProfilePage / Marketplace / 글쓰기 / 대회·경기 작성 등)
 */

import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth() {
  const { user, loading, promptLogin } = useAuth();
  const location = useLocation();

  // 비로그인 확정 시 현재 경로를 복귀 대상으로 저장하고 모달을 띄운다.
  useEffect(() => {
    if (!loading && !user) {
      const target = location.pathname + location.search;
      promptLogin(target);
    }
    // promptLogin은 stable하지 않을 수 있으나, user/loading/경로 변화에만 반응하면 충분.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, location.pathname, location.search]);

  // 인증 상태 확인 중 — 깜빡임 방지용 로더
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">불러오는 중…</p>
        </div>
      </div>
    );
  }

  // 비로그인 → 홈으로 보내고(모달은 위에서 이미 트리거됨) 로그인 후 복귀.
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
