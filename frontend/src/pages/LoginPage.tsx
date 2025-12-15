/**
 * 로그인 페이지 (v4.1.0 - Light Mode Design System v2)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // 에러 초기화
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="card shadow-card-hover">
          <div className="card-body p-8">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => navigate(-1)}
              className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">뒤로가기</span>
            </button>

            {/* 헤더 */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-glow-primary">
                <span className="text-4xl">🏃</span>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                로그인
              </h1>
              <p className="text-neutral-500">
                Every Second Counts ⏱️
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm animate-fadeIn">
                {error}
              </div>
            )}

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="example@email.com"
                  autoComplete="email"
                />
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>로그인 중...</span>
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </form>

            {/* 링크들 */}
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <p className="text-neutral-600 text-sm">
                  계정이 없으신가요?{' '}
                  <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                    회원가입하기 →
                  </Link>
                </p>
              </div>
            </div>

            {/* 게스트로 둘러보기 */}
            <div className="mt-8 pt-6 border-t border-neutral-100">
              <Link
                to="/"
                className="btn-secondary w-full justify-center"
              >
                게스트로 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
