/**
 * 회원가입 페이지 (v4.2.0 - Light Mode Design System v2)
 * 
 * 기능:
 * - 이메일 인증
 * - 닉네임 중복 확인
 * - 비밀번호 유효성 검사
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import * as authApi from '../api/auth';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    verificationCode: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // 이메일 인증 상태
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  
  // 닉네임 중복 확인 상태
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // 닉네임 변경 시 중복 확인 상태 초기화
    if (name === 'nickname') {
      setNicknameChecked(false);
      setNicknameAvailable(false);
    }
    
    // 이메일 변경 시 인증 상태 초기화
    if (name === 'email') {
      setEmailSent(false);
      setEmailVerified(false);
    }
  };

  // 이메일 인증 코드 발송
  const handleSendVerification = async () => {
    // 이메일 유효성 검사
    if (!formData.email) {
      setErrors(prev => ({ ...prev, email: '이메일을 입력해주세요' }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: '올바른 이메일 형식이 아닙니다' }));
      return;
    }

    setSendingEmail(true);
    setErrors(prev => ({ ...prev, email: '' }));

    try {
      const response = await authApi.sendVerificationCode(formData.email);
      
      if (response.success) {
        setEmailSent(true);
        alert(`${formData.email}로 인증 코드를 발송했습니다.`);
      } else {
        setErrors(prev => ({ ...prev, email: response.error || '인증 코드 발송에 실패했습니다' }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, email: error.message || '인증 코드 발송에 실패했습니다' }));
    } finally {
      setSendingEmail(false);
    }
  };

  // 이메일 인증 코드 확인
  const handleVerifyEmail = async () => {
    if (!formData.verificationCode || formData.verificationCode.length !== 6) {
      setErrors(prev => ({ ...prev, verificationCode: '6자리 인증 코드를 입력해주세요' }));
      return;
    }

    setVerifyingEmail(true);
    setErrors(prev => ({ ...prev, verificationCode: '' }));

    try {
      const response = await authApi.verifyEmail(formData.email, formData.verificationCode);
      
      if (response.success) {
        setEmailVerified(true);
        alert('이메일 인증이 완료되었습니다.');
      } else {
        setErrors(prev => ({ ...prev, verificationCode: response.error || '인증 코드가 일치하지 않습니다' }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, verificationCode: error.message || '인증 코드가 일치하지 않습니다' }));
    } finally {
      setVerifyingEmail(false);
    }
  };

  // 닉네임 중복 확인
  const handleCheckNickname = async () => {
    // 닉네임 유효성 검사
    if (!formData.nickname) {
      setErrors(prev => ({ ...prev, nickname: '닉네임을 입력해주세요' }));
      return;
    }
    if (formData.nickname.length < 2 || formData.nickname.length > 10) {
      setErrors(prev => ({ ...prev, nickname: '닉네임은 2-10자여야 합니다' }));
      return;
    }

    setCheckingNickname(true);
    setErrors(prev => ({ ...prev, nickname: '' }));

    try {
      const response = await authApi.checkNickname(formData.nickname);
      
      setNicknameChecked(true);
      
      if (response.success && response.available) {
        setNicknameAvailable(true);
      } else {
        setNicknameAvailable(false);
        setErrors(prev => ({ ...prev, nickname: response.error || '이미 사용 중인 닉네임입니다' }));
      }
    } catch (error: any) {
      setNicknameChecked(true);
      setNicknameAvailable(false);
      setErrors(prev => ({ ...prev, nickname: error.message || '닉네임 확인에 실패했습니다' }));
    } finally {
      setCheckingNickname(false);
    }
  };

  // 유효성 검증
  const validate = () => {
    const newErrors: Record<string, string> = {};

    // 이메일 인증 확인
    if (!emailVerified) {
      newErrors.email = '이메일 인증을 완료해주세요';
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/.test(formData.password)) {
      newErrors.password = '영문과 숫자를 포함해야 합니다';
    }

    // 비밀번호 확인
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호를 다시 입력해주세요';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    // 닉네임 중복 확인
    if (!nicknameChecked || !nicknameAvailable) {
      newErrors.nickname = '닉네임 중복 확인을 해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 회원가입 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname
      });
      
      if (response.success) {
        alert('회원가입이 완료되었습니다!');
        // 페이지 새로고침으로 헤더 업데이트
        window.location.href = '/';
      } else {
        setErrors({ submit: response.error || '회원가입에 실패했습니다' });
      }
    } catch (error: unknown) {
      setErrors({ submit: getErrorMessage(error, '회원가입에 실패했습니다') });
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
                회원가입
              </h1>
              <p className="text-neutral-500">
                애슬리트 타임에 오신 것을 환영합니다
              </p>
            </div>

            {/* 에러 메시지 */}
            {errors.submit && (
              <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm animate-fadeIn">
                {errors.submit}
              </div>
            )}

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  이메일 <span className="text-danger-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input flex-1 ${errors.email ? 'border-danger-500' : ''} ${emailVerified ? 'border-success-500 bg-success-50' : ''}`}
                    placeholder="example@email.com"
                    disabled={emailVerified}
                  />
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={sendingEmail || emailVerified}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                      emailVerified 
                        ? 'bg-success-100 text-success-600 cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50'
                    }`}
                  >
                    {sendingEmail ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : emailVerified ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : emailSent ? (
                      '재발송'
                    ) : (
                      '인증'
                    )}
                  </button>
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-500">{errors.email}</p>
                )}
                {emailVerified && (
                  <p className="mt-1 text-sm text-success-600 flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    이메일 인증 완료
                  </p>
                )}
              </div>

              {/* 인증 코드 입력 (이메일 발송 후 표시) */}
              {emailSent && !emailVerified && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    인증 코드 <span className="text-danger-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="verificationCode"
                      value={formData.verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setFormData(prev => ({ ...prev, verificationCode: value }));
                        if (errors.verificationCode) {
                          setErrors(prev => ({ ...prev, verificationCode: '' }));
                        }
                      }}
                      className={`input flex-1 text-center text-lg tracking-widest font-mono ${errors.verificationCode ? 'border-danger-500' : ''}`}
                      placeholder="000000"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmail}
                      disabled={verifyingEmail || formData.verificationCode.length !== 6}
                      className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-all whitespace-nowrap"
                    >
                      {verifyingEmail ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        '확인'
                      )}
                    </button>
                  </div>
                  {errors.verificationCode && (
                    <p className="mt-1 text-sm text-danger-500">{errors.verificationCode}</p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    이메일로 발송된 6자리 인증 코드를 입력해주세요
                  </p>
                </div>
              )}

              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  비밀번호 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={`input ${errors.password ? 'border-danger-500' : ''}`}
                  placeholder="8자 이상, 영문+숫자"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-danger-500">{errors.password}</p>
                )}
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  비밀번호 확인 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={`input ${errors.passwordConfirm ? 'border-danger-500' : ''}`}
                  placeholder="비밀번호 재입력"
                />
                {errors.passwordConfirm && (
                  <p className="mt-1 text-sm text-danger-500">{errors.passwordConfirm}</p>
                )}
              </div>

              {/* 닉네임 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  닉네임 <span className="text-danger-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    className={`input flex-1 ${errors.nickname ? 'border-danger-500' : ''} ${nicknameAvailable ? 'border-success-500 bg-success-50' : ''}`}
                    placeholder="2-10자"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={handleCheckNickname}
                    disabled={checkingNickname || (nicknameChecked && nicknameAvailable)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                      nicknameAvailable 
                        ? 'bg-success-100 text-success-600 cursor-not-allowed'
                        : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-50'
                    }`}
                  >
                    {checkingNickname ? (
                      <div className="w-5 h-5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                    ) : nicknameAvailable ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      '중복확인'
                    )}
                  </button>
                </div>
                {errors.nickname && (
                  <p className="mt-1 text-sm text-danger-500">{errors.nickname}</p>
                )}
                {nicknameAvailable && (
                  <p className="mt-1 text-sm text-success-600 flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    사용 가능한 닉네임입니다
                  </p>
                )}
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={loading || !emailVerified || !nicknameAvailable}
                className="btn-primary w-full mt-6"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>처리 중...</span>
                  </>
                ) : (
                  '회원가입'
                )}
              </button>
            </form>

            {/* 로그인 링크 */}
            <div className="mt-6 text-center">
              <p className="text-neutral-600 text-sm">
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => {
                    // sessionStorage에 로그인 모달 트리거 플래그 설정
                    sessionStorage.setItem('showLoginModal', 'true');
                    // 히스토리 백
                    navigate(-1);
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  로그인하기 →
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
