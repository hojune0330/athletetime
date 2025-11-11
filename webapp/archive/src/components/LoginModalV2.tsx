// 🔐 로그인 모달 v2.0 - 모던 디자인 with 글라스모피즘
import { useState } from 'react'
import { SessionManager } from '../auth/session'
import type { UserSession } from '../auth/providers'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
}

export const LoginModal = ({ isOpen, onClose, isDarkMode = false }: LoginModalProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  if (!isOpen) return null

  const handleLogin = async (provider: string) => {
    setIsLoading(true)
    setSelectedProvider(provider)
    
    // 애니메이션 효과를 위한 지연
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 모의 사용자 데이터 생성
    const mockUsers: Record<string, UserSession> = {
      kakao: {
        provider: 'kakao',
        id: 'kakao_123456',
        name: '김육상',
        email: 'kim@kakao.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kakao123'
      },
      google: {
        provider: 'google',
        id: 'google_789012',
        name: '이달리기',
        email: 'lee@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=google789'
      },
      naver: {
        provider: 'naver',
        id: 'naver_345678',
        name: '박스프린터',
        email: 'park@naver.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=naver345'
      }
    }
    
    const user = mockUsers[provider]
    if (user) {
      SessionManager.setSession(user)
      setIsLoading(false)
      setSelectedProvider(null)
      onClose()
      window.location.reload()
    }
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className={`relative w-full max-w-md transform transition-all animate-slide-up ${
            isDarkMode 
              ? 'bg-gray-900/95' 
              : 'bg-white/95'
          } backdrop-blur-xl rounded-3xl shadow-2xl border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* 그라데이션 보더 */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-3xl opacity-20 animate-gradient bg-300%"></div>
          
          <div className="relative p-8">
            {/* 헤더 */}
            <div className="text-center mb-8">
              {/* 로고 */}
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl rotate-45 animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">AT</span>
                </div>
              </div>
              
              <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                환영합니다! 🏃‍♂️
              </h2>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                소셜 계정으로 간편하게 로그인하세요
              </p>
            </div>

            {/* 로그인 버튼들 */}
            <div className="space-y-3">
              {/* 카카오 로그인 */}
              <button
                onClick={() => handleLogin('kakao')}
                disabled={isLoading}
                className={`relative w-full p-4 rounded-2xl font-medium transition-all group overflow-hidden ${
                  isLoading && selectedProvider === 'kakao'
                    ? 'scale-95'
                    : 'hover:scale-105 hover:shadow-lg'
                } ${
                  isDarkMode
                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800 hover:bg-yellow-100'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  {isLoading && selectedProvider === 'kakao' ? (
                    <div className="w-6 h-6 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 3C6.477 3 2 6.477 2 11c0 2.89 1.922 5.43 4.809 6.878l-.895 3.261c-.08.292.063.604.332.726.268.122.588.063.795-.145l3.676-3.676c.413.04.834.06 1.283.06 5.523 0 10-3.477 10-8 0-4.523-4.477-8-10-8z"/>
                      </svg>
                      <span>카카오로 시작하기</span>
                    </>
                  )}
                </div>
                {/* 호버 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/20 group-hover:to-orange-400/20 transition-all duration-300"></div>
              </button>

              {/* 구글 로그인 */}
              <button
                onClick={() => handleLogin('google')}
                disabled={isLoading}
                className={`relative w-full p-4 rounded-2xl font-medium transition-all group overflow-hidden ${
                  isLoading && selectedProvider === 'google'
                    ? 'scale-95'
                    : 'hover:scale-105 hover:shadow-lg'
                } ${
                  isDarkMode
                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  {isLoading && selectedProvider === 'google' ? (
                    <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Google로 시작하기</span>
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:to-cyan-400/20 transition-all duration-300"></div>
              </button>

              {/* 네이버 로그인 */}
              <button
                onClick={() => handleLogin('naver')}
                disabled={isLoading}
                className={`relative w-full p-4 rounded-2xl font-medium transition-all group overflow-hidden ${
                  isLoading && selectedProvider === 'naver'
                    ? 'scale-95'
                    : 'hover:scale-105 hover:shadow-lg'
                } ${
                  isDarkMode
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                    : 'bg-green-50 border border-green-200 text-green-800 hover:bg-green-100'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  {isLoading && selectedProvider === 'naver' ? (
                    <div className="w-6 h-6 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
                      </svg>
                      <span>네이버로 시작하기</span>
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 to-green-400/0 group-hover:from-green-400/20 group-hover:to-emerald-400/20 transition-all duration-300"></div>
              </button>
            </div>

            {/* 구분선 */}
            <div className="relative my-8">
              <div className={`absolute inset-0 flex items-center ${isDarkMode ? 'opacity-20' : 'opacity-30'}`}>
                <div className={`w-full border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-4 ${isDarkMode ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-500'}`}>
                  또는
                </span>
              </div>
            </div>

            {/* 익명 로그인 */}
            <button
              onClick={() => handleLogin('anonymous')}
              disabled={isLoading}
              className={`relative w-full p-4 rounded-2xl font-medium transition-all group ${
                isLoading && selectedProvider === 'anonymous'
                  ? 'scale-95'
                  : 'hover:scale-105'
              } ${
                isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                {isLoading && selectedProvider === 'anonymous' ? (
                  <div className="w-6 h-6 border-3 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <i className="fas fa-user-secret text-xl"></i>
                    <span>익명으로 둘러보기</span>
                  </>
                )}
              </div>
            </button>

            {/* 하단 정보 */}
            <div className="mt-6 text-center">
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
              </p>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 rounded-full transition-all ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        
        .bg-300\% {
          background-size: 300% 300%;
        }
      `}</style>
    </>
  )
}