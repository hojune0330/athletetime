/**
 * 프로필 수정 페이지
 * 
 * 기능:
 * - 이메일 (읽기 전용)
 * - 닉네임 변경 (중복 확인 필요)
 * - 비밀번호 변경
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import * as authApi from '../api/auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    password: '',
    passwordConfirm: ''
  });
  
  const [originalNickname, setOriginalNickname] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 닉네임 중복 확인 상태
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 사용자 정보 불러오기
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.user) {
          setFormData(prev => ({
            ...prev,
            email: response.user.email,
            nickname: response.user.nickname
          }));
          setOriginalNickname(response.user.nickname);
          setNicknameChecked(true);
          setNicknameAvailable(true);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [navigate]);

  // 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // 닉네임 변경 시 중복 확인 상태 초기화 (기존 닉네임이 아닌 경우만)
    if (name === 'nickname') {
      if (value === originalNickname) {
        setNicknameChecked(true);
        setNicknameAvailable(true);
      } else {
        setNicknameChecked(false);
        setNicknameAvailable(false);
      }
    }
  };

  // 닉네임 중복 확인
  const handleCheckNickname = async () => {
    // 기존 닉네임과 같으면 확인 불필요
    if (formData.nickname === originalNickname) {
      setNicknameChecked(true);
      setNicknameAvailable(true);
      return;
    }
    
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

    // 닉네임 변경 시 중복 확인
    if (formData.nickname !== originalNickname && (!nicknameChecked || !nicknameAvailable)) {
      newErrors.nickname = '닉네임 중복 확인을 해주세요';
    }

    // 비밀번호 변경 시 검증
    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = '비밀번호는 8자 이상이어야 합니다';
      } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/.test(formData.password)) {
        newErrors.password = '영문과 숫자를 포함해야 합니다';
      }

      if (!formData.passwordConfirm) {
        newErrors.passwordConfirm = '비밀번호를 다시 입력해주세요';
      } else if (formData.password !== formData.passwordConfirm) {
        newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 프로필 수정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // 변경사항이 없으면 리턴
    if (formData.nickname === originalNickname && !formData.password) {
      alert('변경된 내용이 없습니다.');
      return;
    }

    setSaving(true);

    try {
      const updateData: authApi.UpdateProfileRequest = {};
      
      if (formData.nickname !== originalNickname) {
        updateData.nickname = formData.nickname;
      }
      
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await authApi.updateProfile(updateData);
      
      if (response.success) {
        alert('프로필이 수정되었습니다!');
        // 닉네임 업데이트
        if (updateData.nickname) {
          setOriginalNickname(updateData.nickname);
        }
        // 비밀번호 필드 초기화
        setFormData(prev => ({ ...prev, password: '', passwordConfirm: '' }));
        // 페이지 새로고침하여 헤더 업데이트
        window.location.reload();
      } else {
        setErrors({ submit: response.error || '프로필 수정에 실패했습니다' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || '프로필 수정에 실패했습니다' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                <span className="text-4xl">👤</span>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                프로필 수정
              </h1>
              <p className="text-neutral-500">
                회원 정보를 수정할 수 있습니다
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
              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={formData.email}
                  className="input bg-neutral-100 text-neutral-500 cursor-not-allowed"
                  disabled
                  readOnly
                />
                <p className="mt-1 text-xs text-neutral-400">
                  이메일은 변경할 수 없습니다
                </p>
              </div>

              {/* 닉네임 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  닉네임
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    className={`input flex-1 ${errors.nickname ? 'border-danger-500' : ''} ${nicknameAvailable && formData.nickname !== originalNickname ? 'border-success-500 bg-success-50' : ''}`}
                    placeholder="2-10자"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={handleCheckNickname}
                    disabled={checkingNickname || formData.nickname === originalNickname || (nicknameChecked && nicknameAvailable)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                      nicknameAvailable && formData.nickname !== originalNickname
                        ? 'bg-success-100 text-success-600 cursor-not-allowed'
                        : formData.nickname === originalNickname
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-50'
                    }`}
                  >
                    {checkingNickname ? (
                      <div className="w-5 h-5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                    ) : nicknameAvailable && formData.nickname !== originalNickname ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      '중복확인'
                    )}
                  </button>
                </div>
                {errors.nickname && (
                  <p className="mt-1 text-sm text-danger-500">{errors.nickname}</p>
                )}
                {nicknameAvailable && formData.nickname !== originalNickname && (
                  <p className="mt-1 text-sm text-success-600 flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    사용 가능한 닉네임입니다
                  </p>
                )}
              </div>

              {/* 구분선 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">비밀번호 변경 (선택)</span>
                </div>
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input ${errors.password ? 'border-danger-500' : ''}`}
                  placeholder="8자 이상, 영문+숫자 (변경 시에만 입력)"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-danger-500">{errors.password}</p>
                )}
              </div>

              {/* 새 비밀번호 확인 */}
              {formData.password && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    name="passwordConfirm"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    className={`input ${errors.passwordConfirm ? 'border-danger-500' : ''}`}
                    placeholder="새 비밀번호 재입력"
                  />
                  {errors.passwordConfirm && (
                    <p className="mt-1 text-sm text-danger-500">{errors.passwordConfirm}</p>
                  )}
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full mt-6"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  '저장하기'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
