/**
 * AdminRoute - 관리자 전용 라우트 가드
 * 
 * is_admin=true인 사용자만 접근 가능
 * 비로그인/일반 사용자는 홈으로 리다이렉트
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminRoute() {
  const { user, loading } = useAuth();

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 비로그인
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 관리자 아님
  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
