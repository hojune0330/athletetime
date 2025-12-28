/**
 * 로그인 모달 컴포넌트
 */

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
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
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', password: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">로그인</h2>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">
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
        </div>
      </div>
    </div>
  );
}
