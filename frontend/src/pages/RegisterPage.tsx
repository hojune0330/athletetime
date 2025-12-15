/**
 * 회원가입 페이지 (v4.1.0 - Light Mode Design System v2)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    specialty: '',
    region: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // 유효성 검증
  const validate = () => {
    const newErrors: Record<string, string> = {};

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
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

    // 닉네임 검증
    if (!formData.nickname) {
      newErrors.nickname = '닉네임을 입력해주세요';
    } else if (formData.nickname.length < 2 || formData.nickname.length > 10) {
      newErrors.nickname = '닉네임은 2-10자여야 합니다';
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
      const response = await register({
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname,
        specialty: formData.specialty || undefined,
        region: formData.region || undefined
      });

      if (response.requiresVerification) {
        setShowVerification(true);
      }
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 이메일 인증 화면
  if (showVerification) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full animate-fadeIn">
          <div className="card shadow-card-hover">
            <div className="card-body p-8">
              {/* 뒤로가기 버튼 */}
              <button
                onClick={() => setShowVerification(false)}
                className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">뒤로가기</span>
              </button>

              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-info-500 to-info-600 rounded-2xl flex items-center justify-center shadow-md">
                  <span className="text-4xl">📧</span>
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                  이메일 인증
                </h1>
                <p className="text-neutral-500">
                  {formData.email}로<br />
                  인증 코드를 발송했습니다
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                window.location.href = `/verify-email?email=${encodeURIComponent(formData.email)}`;
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      인증 코드 6자리
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="input text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verificationCode.length !== 6}
                    className="btn-primary w-full"
                  >
                    인증 확인
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/verify-email?email=${encodeURIComponent(formData.email)}`;
                    }}
                    className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    인증 코드를 받지 못하셨나요? →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 회원가입 폼
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
                애슬리트 타임 회원가입
              </h1>
              <p className="text-neutral-500">
                Every Second Counts ⏱️
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
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="example@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-500">{errors.email}</p>
                )}
              </div>

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
                  className={`input ${errors.password ? 'input-error' : ''}`}
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
                  className={`input ${errors.passwordConfirm ? 'input-error' : ''}`}
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
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className={`input ${errors.nickname ? 'input-error' : ''}`}
                  placeholder="육상러너123"
                  maxLength={10}
                />
                {errors.nickname && (
                  <p className="mt-1 text-sm text-danger-500">{errors.nickname}</p>
                )}
              </div>

              {/* 주종목 (선택) */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  주종목 <span className="text-neutral-400">(선택)</span>
                </label>
                <select
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="">선택하지 않음</option>
                  <option value="단거리">단거리 (100m, 200m, 400m)</option>
                  <option value="중거리">중거리 (800m, 1500m)</option>
                  <option value="장거리">장거리 (5000m, 10000m, 마라톤)</option>
                  <option value="허들">허들</option>
                  <option value="계주">계주</option>
                  <option value="도약">도약 (높이뛰기, 멀리뛰기 등)</option>
                  <option value="투척">투척 (포환, 원반, 창 등)</option>
                  <option value="혼성">혼성 (10종, 7종)</option>
                </select>
              </div>

              {/* 지역 (선택) */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  지역 <span className="text-neutral-400">(선택)</span>
                </label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="">선택하지 않음</option>
                  <option value="서울">서울</option>
                  <option value="경기">경기</option>
                  <option value="인천">인천</option>
                  <option value="부산">부산</option>
                  <option value="대구">대구</option>
                  <option value="광주">광주</option>
                  <option value="대전">대전</option>
                  <option value="울산">울산</option>
                  <option value="세종">세종</option>
                  <option value="강원">강원</option>
                  <option value="충북">충북</option>
                  <option value="충남">충남</option>
                  <option value="전북">전북</option>
                  <option value="전남">전남</option>
                  <option value="경북">경북</option>
                  <option value="경남">경남</option>
                  <option value="제주">제주</option>
                </select>
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
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
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  로그인하기 →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
