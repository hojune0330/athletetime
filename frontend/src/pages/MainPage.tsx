import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  AcademicCapIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ShoppingBagIcon,
  TrophyIcon,
  ChevronRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

/**
 * MainPage 컴포넌트
 * 
 * 전체 애플리케이션의 메인 랜딩 페이지
 * - Hero 섹션 (전체 화면 배경)
 * - 주요 기능 카드
 * - 갤러리 섹션
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
      title: '훈련 계획',
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
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Screen Background */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          {/* Unsplash 육상 이미지 */}
          <img 
            src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop" 
            alt="Running Track" 
            className="w-full h-full object-cover"
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
        </div>

        {/* Hero Content */}
        <div className="relative h-full flex items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            {/* Small Title */}
            <div className="mb-6 animate-fadeIn">
              <p className="text-white/90 text-lg md:text-xl font-medium tracking-wider uppercase mb-2">
                Train With Us &
              </p>
            </div>
            
            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-tight animate-fadeInUp">
              FEEL THE
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                ADRENALIN
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-12 font-light animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              한국 육상인들을 위한 통합 플랫폼
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <Link
                to="/community"
                className="px-8 py-4 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl min-w-[200px]"
              >
                커뮤니티 시작하기
              </Link>
              <Link
                to="/pace-calculator"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/20 border-2 border-white/30 transform hover:scale-105 transition-all duration-300 min-w-[200px]"
              >
                페이스 계산기
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Secondary Hero Section */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)',
            color: 'white'
          }}></div>
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left: Image */}
            <div className="w-full md:w-1/2">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=2070&auto=format&fit=crop" 
                  alt="Track Athletes" 
                  className="rounded-2xl shadow-2xl w-full"
                />
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300 transform hover:scale-110">
                    <PlayIcon className="w-10 h-10 text-white ml-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="w-full md:w-1/2 text-white">
              <p className="text-primary-400 text-sm font-bold tracking-wider uppercase mb-4">
                Train With Us &
              </p>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Become a
                <span className="text-primary-400"> Pro</span>
              </h2>
              <p className="text-lg text-neutral-300 mb-8 leading-relaxed">
                초등부부터 마스터즈까지, 모든 한국 육상인들이 함께 성장하는 공간입니다. 
                전문적인 훈련 계획, 정확한 페이스 계산, 그리고 활발한 커뮤니티를 통해 
                당신의 기록을 한 단계 끌어올리세요.
              </p>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">목표 설정</h4>
                    <p className="text-neutral-400 text-sm">당신의 기록 목표를 설정하세요</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">체계적 훈련</h4>
                    <p className="text-neutral-400 text-sm">과학적인 훈련 계획으로 준비하세요</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">기록 달성</h4>
                    <p className="text-neutral-400 text-sm">최고의 퍼포먼스를 발휘하세요</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-primary-600 text-sm font-bold tracking-wider uppercase mb-4">
              Our Services
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-6">
              육상인을 위한
              <br />
              <span className="text-primary-600">All-in-One Platform</span>
            </h2>
            <p className="text-lg text-neutral-600">
              페이스 계산부터 훈련 관리, 커뮤니티까지 - 당신에게 필요한 모든 것
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const CardContent = (
                <>
                  {/* Icon */}
                  <div className={`w-16 h-16 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl">{feature.emoji}</span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-neutral-900 mb-3 flex items-center gap-2">
                    {feature.title}
                    {!feature.available && (
                      <span className="text-xs font-medium px-2 py-1 bg-neutral-200 text-neutral-600 rounded-full">
                        준비중
                      </span>
                    )}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-neutral-600 mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* CTA */}
                  <div className={`inline-flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-300`}>
                    자세히 보기
                    <ChevronRightIcon className="w-4 h-4 text-primary-600" />
                  </div>
                </>
              );

              if (feature.link) {
                return (
                  <Link
                    key={feature.id}
                    to={feature.link}
                    className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-100 animate-fadeInUp"
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
                    className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-100 text-left animate-fadeInUp"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {CardContent}
                  </button>
                );
              }
            })}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-primary-600 text-sm font-bold tracking-wider uppercase mb-4">
              Latest Gallery
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-6">
              우리들의 이야기
            </h2>
            <p className="text-lg text-neutral-600">
              함께 달리고, 함께 성장하는 육상인들의 순간
            </p>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {[
              { src: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=500', alt: '트랙 훈련' },
              { src: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=500', alt: '스타트 블록' },
              { src: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=500', alt: '스프린터' },
              { src: 'https://images.unsplash.com/photo-1526676037777-05a232554c77?w=500', alt: '장거리 러너' },
              { src: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=500', alt: '경기장' },
              { src: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=500', alt: '육상 경기' },
            ].map((image, index) => (
              <div 
                key={index} 
                className="group relative overflow-hidden rounded-2xl aspect-square animate-fadeInUp cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="font-bold text-lg">{image.alt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black mb-2">1,000+</div>
              <div className="text-primary-100 text-sm md:text-base">활성 사용자</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black mb-2">5,000+</div>
              <div className="text-primary-100 text-sm md:text-base">커뮤니티 게시글</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black mb-2">10,000+</div>
              <div className="text-primary-100 text-sm md:text-base">페이스 계산</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black mb-2">24/7</div>
              <div className="text-primary-100 text-sm md:text-base">실시간 채팅</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl text-neutral-300 mb-12">
              한국의 모든 육상인들이 함께하는 공간에 참여하세요
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/community"
                className="px-10 py-5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transform hover:scale-105 transition-all duration-300 shadow-xl text-lg min-w-[220px]"
              >
                무료로 시작하기
              </Link>
              <Link
                to="/pace-calculator"
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 border-2 border-white/30 transform hover:scale-105 transition-all duration-300 text-lg min-w-[220px]"
              >
                기능 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 text-neutral-400">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Top */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🏃‍♂️</span>
                  <span className="text-xl font-bold text-white">ATHLETE TIME</span>
                </div>
                <p className="text-sm text-neutral-500 mb-4">
                  한국 육상인들을 위한 올인원 플랫폼
                </p>
              </div>

              {/* Links */}
              <div>
                <h4 className="font-bold text-white mb-3">서비스</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/community" className="hover:text-primary-400 transition-colors">커뮤니티</Link></li>
                  <li><Link to="/pace-calculator" className="hover:text-primary-400 transition-colors">페이스 계산기</Link></li>
                  <li><Link to="/training-calculator" className="hover:text-primary-400 transition-colors">훈련 계획</Link></li>
                  <li><Link to="/chat" className="hover:text-primary-400 transition-colors">실시간 채팅</Link></li>
                </ul>
              </div>

              {/* Info */}
              <div>
                <h4 className="font-bold text-white mb-3">정보</h4>
                <ul className="space-y-2 text-sm">
                  <li><button className="hover:text-primary-400 transition-colors">이용약관</button></li>
                  <li><button className="hover:text-primary-400 transition-colors">개인정보처리방침</button></li>
                  <li><button className="hover:text-primary-400 transition-colors">문의하기</button></li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="pt-8 border-t border-neutral-800 text-center text-sm">
              <p>© 2025 Athlete Time. All rights reserved.</p>
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
