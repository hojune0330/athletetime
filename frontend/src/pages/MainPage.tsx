import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  AcademicCapIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ShoppingBagIcon,
  TrophyIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

/**
 * MainPage 컴포넌트
 * 
 * 전체 애플리케이션의 메인 랜딩 페이지
 * - Hero 섹션
 * - 주요 기능 카드 (커뮤니티, 페이스 계산기, 훈련 계산기, 채팅 등)
 * - CTA 버튼
 */

interface Feature {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  link?: string;
  onClick?: () => void;
  gradient: string;
  iconBg: string;
  available: boolean;
}

const MainPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // URL 쿼리 파라미터 또는 sessionStorage로 로그인 모달 트리거
  useEffect(() => {
    // URL 쿼리 파라미터 확인
    if (searchParams.get('showLogin') === 'true') {
      setShowLoginModal(true);
      searchParams.delete('showLogin');
      setSearchParams(searchParams, { replace: true });
    }
    // sessionStorage 확인 (RegisterPage에서 뒤로가기 시)
    if (sessionStorage.getItem('showLoginModal') === 'true') {
      setShowLoginModal(true);
      sessionStorage.removeItem('showLoginModal');
    }
  }, [searchParams, setSearchParams]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!loginForm.email || !loginForm.password) {
      setLoginError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    
    setIsLoggingIn(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await response.json();
      
      if (data.success && data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setShowLoginModal(false);
        setLoginForm({ email: '', password: '' });
        window.location.reload(); // 새로고침으로 상태 업데이트
      } else {
        setLoginError(data.error || '로그인에 실패했습니다.');
      }
    } catch (error: any) {
      setLoginError(error.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginForm({ email: '', password: '' });
    setLoginError('');
  };

  const showComingSoon = (featureName: string) => {
    alert(`${featureName}\n\n이 기능은 현재 개발 중입니다.\n곧 만나보실 수 있습니다!`);
  };

  const features: Feature[] = [
    {
      id: 'community',
      icon: <ChatBubbleLeftRightIcon className="w-7 h-7" />,
      emoji: '💬',
      title: '익명 커뮤니티',
      description: '로그인 없이 바로 참여하는 익명 육상인 커뮤니티',
      link: '/community',
      gradient: 'from-rose-500 to-pink-500',
      iconBg: 'bg-gradient-to-br from-rose-50 to-pink-50',
      available: true
    },
    {
      id: 'pace',
      icon: <ClockIcon className="w-7 h-7" />,
      emoji: '⏱️',
      title: '페이스 계산기',
      description: '정확한 페이스 계산과 기록 예측',
      link: '/pace-calculator',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-gradient-to-br from-orange-50 to-red-50',
      available: true
    },
    {
      id: 'training',
      icon: <AcademicCapIcon className="w-7 h-7" />,
      emoji: '💪',
      title: '훈련 계산기',
      description: '과학적인 훈련 계획과 관리',
      link: '/training-calculator',
      gradient: 'from-indigo-500 to-purple-500',
      iconBg: 'bg-gradient-to-br from-indigo-50 to-purple-50',
      available: true
    },
    {
      id: 'chat',
      icon: <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7" />,
      emoji: '💭',
      title: '실시간 채팅',
      description: '육상인들과의 실시간 소통',
      link: '/chat',
      gradient: 'from-teal-500 to-green-500',
      iconBg: 'bg-gradient-to-br from-teal-50 to-green-50',
      available: true
    },
    {
      id: 'marketplace',
      icon: <ShoppingBagIcon className="w-7 h-7" />,
      emoji: '🛒',
      title: '중고 거래',
      description: '육상 용품 거래 마켓플레이스',
      onClick: () => showComingSoon('중고 거래'),
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      available: false
    },
    {
      id: 'results',
      icon: <TrophyIcon className="w-7 h-7" />,
      emoji: '🏆',
      title: '경기 결과',
      description: '실시간 결과 업데이트와 기록 관리',
      link: '/competitions',
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      available: true
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-100 rounded-full opacity-50 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6 animate-fadeIn">
              <span className="text-4xl md:text-5xl animate-bounce">🏃‍♂️</span>
              <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                ATHLETE TIME
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent animate-fadeInUp">
              육상인들의 새로운 시작
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-neutral-600 mb-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              초등부부터 마스터즈까지, 모든 한국 육상인들이 함께하는 공간
            </p>
            
            {/* Description */}
            <p className="text-sm md:text-base text-neutral-500 mb-8 max-w-lg mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              페이스 계산, 훈련 관리, 커뮤니티까지 - 육상인을 위한 올인원 플랫폼
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="flex-1 container mx-auto px-4 py-12 md:py-16">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const CardContent = (
              <>
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <div className={`w-14 h-14 ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl">{feature.emoji}</span>
                </div>
                
                {/* Title */}
                <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  {feature.title}
                  {!feature.available && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">
                      준비중
                    </span>
                  )}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-neutral-500 flex-grow">
                  {feature.description}
                </p>
                
                {/* Arrow */}
                <div className="absolute bottom-4 right-4 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <ChevronRightIcon className="w-4 h-4 text-neutral-600" />
                </div>
              </>
            );

            if (feature.link) {
              return (
                <Link
                  key={feature.id}
                  to={feature.link}
                  className="group relative card card-hover p-6 flex flex-col min-h-[180px] animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {CardContent}
                </Link>
              );
            } else {
              return (
                <button
                  key={feature.id}
                  onClick={feature.onClick}
                  className="group relative card card-hover p-6 flex flex-col min-h-[180px] text-left animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {CardContent}
                </button>
              );
            }
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-t border-neutral-100">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            <div className="p-4">
              <div className="text-2xl md:text-3xl font-bold text-primary-600 mb-1">1,000+</div>
              <div className="text-sm text-neutral-500">활성 사용자</div>
            </div>
            <div className="p-4">
              <div className="text-2xl md:text-3xl font-bold text-primary-600 mb-1">5,000+</div>
              <div className="text-sm text-neutral-500">커뮤니티 게시글</div>
            </div>
            <div className="p-4">
              <div className="text-2xl md:text-3xl font-bold text-primary-600 mb-1">10,000+</div>
              <div className="text-sm text-neutral-500">페이스 계산</div>
            </div>
            <div className="p-4">
              <div className="text-2xl md:text-3xl font-bold text-primary-600 mb-1">24/7</div>
              <div className="text-sm text-neutral-500">실시간 채팅</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-100 border-t border-neutral-200">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xl">🏃‍♂️</span>
              <span className="text-lg font-bold text-neutral-700">ATHLETE TIME</span>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              © 2025 Athlete Time. 모든 육상인들을 위한 플랫폼
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <button className="text-neutral-500 hover:text-primary-600 transition-colors">
                이용약관
              </button>
              <span className="text-neutral-300">|</span>
              <button className="text-neutral-500 hover:text-primary-600 transition-colors">
                개인정보처리방침
              </button>
              <span className="text-neutral-300">|</span>
              <button className="text-neutral-500 hover:text-primary-600 transition-colors">
                문의하기
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">로그인</h2>
                <button
                  onClick={closeLoginModal}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 에러 메시지 */}
              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {loginError}
                </div>
              )}

              {/* 로그인 폼 */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoggingIn}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoggingIn}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>로그인 중...</span>
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>
              </form>

              {/* 하단 링크 */}
              <div className="mt-4 text-center text-sm text-neutral-500">
                계정이 없으신가요?{' '}
                <Link
                  to="/register"
                  onClick={closeLoginModal}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  회원가입
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
