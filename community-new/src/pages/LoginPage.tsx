/**
 * 로그인 페이지
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
    <div className="min-h-screen bg-dark-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-dark-700 rounded-lg p-8 shadow-xl">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">뒤로가기</span>
          </button>

          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              로그인
            </h1>
            <p className="text-gray-400">
              Every Second Counts ⏱️
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이메일
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="example@email.com"
                autoComplete="email"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 링크들 */}
          <div className="mt-6 space-y-3">
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                계정이 없으신가요?{' '}
                <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                  회원가입하기 →
                </Link>
              </p>
            </div>

            {/* 비밀번호 찾기는 나중에 구현 */}
            {/* <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-white">
                비밀번호를 잊으셨나요?
              </Link>
            </div> */}
          </div>

          {/* 게스트로 둘러보기 */}
          <div className="mt-8 pt-6 border-t border-dark-600">
            <Link
              to="/"
              className="block w-full py-3 text-center bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg transition-colors"
            >
              게스트로 둘러보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
