/**
 * 이메일 인증 페이지
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendCode } from '../api/auth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 이메일이 없으면 회원가입 페이지로 리다이렉트
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  // 재발송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // 인증 코드 자동 제출 (6자리 입력 시)
  useEffect(() => {
    if (code.length === 6 && !loading) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyEmail(email, code);
      // verifyEmail이 성공하면 AuthContext에서 자동으로 홈으로 이동
    } catch (error: any) {
      setError(error.message);
      setCode(''); // 에러 시 코드 초기화
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setResending(true);
    setError('');

    try {
      await resendCode(email);
      setResendCooldown(60); // 60초 쿨다운
      alert('인증 코드가 재발송되었습니다');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-dark-700 rounded-lg p-8 shadow-xl">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => navigate('/register')}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">뒤로가기</span>
          </button>

          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              이메일 인증
            </h1>
            <p className="text-gray-400 text-sm">
              <span className="text-white font-medium">{email}</span>로<br />
              인증 코드를 발송했습니다
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 인증 코드 입력 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
                인증 코드 6자리
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // 숫자만
                  setCode(value);
                  setError('');
                }}
                className="w-full px-4 py-4 bg-dark-600 border border-dark-500 rounded-lg text-white text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:border-primary-500"
                placeholder="000000"
                autoFocus
                disabled={loading}
              />
              <p className="mt-2 text-xs text-center text-gray-500">
                ⏰ 인증 코드는 10분 후 만료됩니다
              </p>
            </div>

            {/* 수동 제출 버튼 */}
            <button
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? '인증 중...' : '인증 확인'}
            </button>

            {/* 재발송 버튼 */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-400">
                인증 코드를 받지 못하셨나요?
              </p>
              <button
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="text-sm text-primary-400 hover:text-primary-300 disabled:text-gray-600 disabled:cursor-not-allowed font-medium"
              >
                {resending
                  ? '발송 중...'
                  : resendCooldown > 0
                  ? `재발송 (${resendCooldown}초 후)`
                  : '인증 코드 재발송'}
              </button>
            </div>

            {/* 이메일 변경 */}
            <div className="pt-4 border-t border-dark-600 text-center">
              <button
                onClick={() => navigate('/register')}
                className="text-sm text-gray-400 hover:text-white"
              >
                이메일이 잘못되었나요? 다시 가입하기 →
              </button>
            </div>
          </div>

          {/* 도움말 */}
          <div className="mt-8 p-4 bg-dark-600 rounded-lg">
            <p className="text-xs text-gray-400 leading-relaxed">
              💡 <strong className="text-white">도움말</strong><br />
              • 스팸 메일함을 확인해주세요<br />
              • 이메일 주소가 정확한지 확인해주세요<br />
              • 재발송은 60초 후에 가능합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
