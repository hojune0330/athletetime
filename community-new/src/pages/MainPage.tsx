import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * MainPage 컴포넌트
 * 
 * 전체 애플리케이션의 메인 랜딩 페이지
 * - Hero 섹션
 * - 주요 기능 카드 (커뮤니티, 페이스 계산기, 훈련 계산기, 채팅 등)
 * - CTA 버튼
 */

const MainPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    document.body.style.overflow = !mobileMenuOpen ? 'hidden' : '';
  };

  const showComingSoon = (featureName: string) => {
    alert(`${featureName}\n\n이 기능은 현재 개발 중입니다.\n곧 만나보실 수 있습니다!`);
  };

  const features = [
    {
      id: 'community',
      icon: '💬',
      iconClass: 'icon-community',
      title: '익명 커뮤니티',
      description: '로그인 없이 바로 참여하는 익명 육상인 커뮤니티',
      link: '/community',
      className: 'community'
    },
    {
      id: 'pace',
      icon: '⏱️',
      iconClass: 'icon-pace',
      title: '페이스 계산기',
      description: '정확한 페이스 계산과 기록 예측',
      link: '/pace-calculator',
      className: 'pace'
    },
    {
      id: 'training',
      icon: '💪',
      iconClass: 'icon-training',
      title: '훈련 계산기',
      description: '과학적인 훈련 계획과 관리',
      link: '/training-calculator',
      className: 'training'
    },
    {
      id: 'chat',
      icon: '💭',
      iconClass: 'icon-chat',
      title: '실시간 채팅',
      description: '육상인들과의 실시간 소통',
      link: '/chat',
      className: 'chat'
    },
    {
      id: 'marketplace',
      icon: '🛒',
      iconClass: 'icon-marketplace',
      title: '중고 거래',
      description: '육상 용품 거래 마켓플레이스',
      onClick: () => showComingSoon('중고 거래'),
      className: 'marketplace'
    },
    {
      id: 'results',
      icon: '🏆',
      iconClass: 'icon-results',
      title: '경기 결과',
      description: '실시간 결과 업데이트와 기록 관리',
      onClick: () => showComingSoon('경기 결과'),
      className: 'results'
    }
  ];

  return (
    <>
      <style>{`
        /* MainPage Styles */
        .main-page-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Hero Section */
        .hero {
          text-align: center;
          padding: var(--space-10) 0;
          position: relative;
          overflow: hidden;
        }
        
        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, var(--color-primary-50) 0%, transparent 60%);
          z-index: -1;
          animation: heroGlow 8s ease-in-out infinite;
        }
        
        @keyframes heroGlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(10%, 5%) scale(1.1); }
        }
        
        .hero-title {
          font-size: var(--text-4xl);
          font-weight: var(--font-extrabold);
          margin-bottom: var(--space-4);
          background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-500));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: fadeInDown 0.6s ease-out;
        }
        
        .hero-subtitle {
          font-size: var(--text-lg);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-8);
          animation: fadeIn 0.8s ease-out 0.2s both;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
        }
        
        .logo-icon {
          font-size: 2.5rem;
          animation: bounce 2s ease infinite;
        }
        
        .logo-text {
          font-size: var(--text-2xl);
          font-weight: var(--font-extrabold);
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .hero-description {
          color: var(--color-text-tertiary);
          font-size: var(--text-sm);
          margin-bottom: var(--space-6);
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        /* CTA Buttons */
        .cta-container {
          display: flex;
          justify-content: center;
          gap: var(--space-4);
          margin-bottom: var(--space-10);
        }
        
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-8);
          font-size: var(--text-lg);
          font-weight: var(--font-bold);
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all var(--transition-base);
          text-decoration: none;
          border: none;
        }
        
        .cta-primary {
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
          color: white;
          box-shadow: var(--shadow-primary);
        }
        
        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
        
        .cta-secondary {
          background: var(--color-bg-card);
          color: var(--color-primary-600);
          border: 2px solid var(--color-primary-200);
        }
        
        .cta-secondary:hover {
          border-color: var(--color-primary-500);
          background: var(--color-primary-50);
        }

        /* Features Grid */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-6);
          margin-bottom: var(--space-12);
          max-width: var(--container-lg);
          margin-left: auto;
          margin-right: auto;
          padding: 0 var(--space-4);
        }
        
        @media (max-width: 1023px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 639px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
          
          .cta-container {
            flex-direction: column;
            padding: 0 var(--space-4);
          }
          
          .cta-btn {
            width: 100%;
            justify-content: center;
          }

          .hero-title {
            font-size: var(--text-3xl);
          }
          
          .hero-subtitle {
            font-size: var(--text-base);
          }
        }

        /* Feature Card */
        .feature-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          cursor: pointer;
          transition: all var(--transition-slow);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 180px;
          text-decoration: none;
          color: inherit;
        }
        
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--gradient-color, linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600)));
          opacity: 0;
          transition: opacity var(--transition-base);
        }
        
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-xl);
          border-color: var(--color-primary-200);
        }
        
        .feature-card:hover::before {
          opacity: 1;
        }
        
        .feature-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          margin-bottom: var(--space-4);
          box-shadow: var(--shadow-sm);
        }
        
        .feature-title {
          font-size: var(--text-lg);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }
        
        .feature-description {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
          flex-grow: 1;
        }
        
        .feature-arrow {
          position: absolute;
          bottom: var(--space-4);
          right: var(--space-4);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-neutral-100);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          opacity: 0;
          transform: translateX(-10px);
          transition: all var(--transition-base);
        }
        
        .feature-card:hover .feature-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* Feature Card Gradient Colors */
        .feature-card.community { --gradient-color: linear-gradient(135deg, #ef4444, #ec4899); }
        .feature-card.pace { --gradient-color: linear-gradient(135deg, #f97316, #ef4444); }
        .feature-card.training { --gradient-color: linear-gradient(135deg, #6366f1, #a855f7); }
        .feature-card.chat { --gradient-color: linear-gradient(135deg, #14b8a6, #22c55e); }
        .feature-card.marketplace { --gradient-color: linear-gradient(135deg, #3b82f6, #06b6d4); }
        .feature-card.results { --gradient-color: linear-gradient(135deg, #22c55e, #10b981); }
        
        /* Icon Background Colors */
        .icon-community { background: linear-gradient(135deg, #fef2f2, #fce7f3); }
        .icon-pace { background: linear-gradient(135deg, #fff7ed, #fef2f2); }
        .icon-training { background: linear-gradient(135deg, #eef2ff, #f3e8ff); }
        .icon-chat { background: linear-gradient(135deg, #f0fdfa, #ecfdf5); }
        .icon-marketplace { background: linear-gradient(135deg, #eff6ff, #ecfeff); }
        .icon-results { background: linear-gradient(135deg, #ecfdf5, #d1fae5); }

        /* Main Container */
        .main-content {
          flex: 1;
          max-width: var(--container-lg);
          margin: 0 auto;
          width: 100%;
          padding: var(--space-6) 0;
        }

        /* Footer */
        .main-footer {
          background: var(--color-neutral-100);
          border-top: 1px solid var(--color-border-default);
          padding: var(--space-8) var(--space-4);
          text-align: center;
        }
        
        .footer-content {
          max-width: var(--container-lg);
          margin: 0 auto;
        }
        
        .footer-text {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: var(--space-4);
          margin-top: var(--space-4);
        }
        
        .footer-link {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        
        .footer-link:hover {
          color: var(--color-primary-500);
        }

        /* Animation Stagger */
        .stagger-animation > * {
          animation: fadeInUp 0.5s ease-out both;
        }
        
        .stagger-animation > *:nth-child(1) { animation-delay: 0.1s; }
        .stagger-animation > *:nth-child(2) { animation-delay: 0.15s; }
        .stagger-animation > *:nth-child(3) { animation-delay: 0.2s; }
        .stagger-animation > *:nth-child(4) { animation-delay: 0.25s; }
        .stagger-animation > *:nth-child(5) { animation-delay: 0.3s; }
        .stagger-animation > *:nth-child(6) { animation-delay: 0.35s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="main-page-container">
        <main className="main-content">
          {/* Hero Section */}
          <section className="hero">
            <div className="logo-container">
              <span className="logo-icon">🏃‍♂️</span>
              <span className="logo-text">ATHLETE TIME</span>
            </div>
            <h1 className="hero-title">육상인들의 새로운 시작</h1>
            <p className="hero-subtitle">초등부부터 마스터즈까지, 모든 한국 육상인들이 함께하는 공간</p>
            
            <p className="hero-description">
              페이스 계산, 훈련 관리, 커뮤니티까지 - 육상인을 위한 올인원 플랫폼
            </p>
            
            {/* CTA Buttons */}
            <div className="cta-container">
              <Link to="/pace-calculator" className="cta-btn cta-primary">
                <i className="fas fa-stopwatch"></i>
                페이스 계산기 시작
              </Link>
              <Link to="/community" className="cta-btn cta-secondary">
                <i className="fas fa-users"></i>
                커뮤니티 참여
              </Link>
            </div>
          </section>

          {/* Features Grid */}
          <section className="features-grid stagger-animation">
            {features.map((feature) => {
              if (feature.link) {
                return (
                  <Link
                    key={feature.id}
                    to={feature.link}
                    className={`feature-card ${feature.className}`}
                  >
                    <div className={`feature-icon-wrapper ${feature.iconClass}`}>
                      {feature.icon}
                    </div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                    <div className="feature-arrow">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </Link>
                );
              } else {
                return (
                  <article
                    key={feature.id}
                    className={`feature-card ${feature.className}`}
                    onClick={feature.onClick}
                  >
                    <div className={`feature-icon-wrapper ${feature.iconClass}`}>
                      {feature.icon}
                    </div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                    <div className="feature-arrow">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </article>
                );
              }
            })}
          </section>
        </main>

        {/* Footer */}
        <footer className="main-footer">
          <div className="footer-content">
            <p className="footer-text">© 2025 Athlete Time. 모든 육상인들을 위한 플랫폼</p>
            <div className="footer-links">
              <a href="#" className="footer-link">이용약관</a>
              <a href="#" className="footer-link">개인정보처리방침</a>
              <a href="#" className="footer-link">문의하기</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MainPage;
