import React from 'react';

/**
 * ChatPage 컴포넌트
 * 
 * 실시간 채팅 페이지
 * - 현재는 임시 iframe으로 구현, 추후 완전한 React 컴포넌트로 전환 예정
 */

const ChatPage: React.FC = () => {
  return (
    <>
      <style>{`
        .calculator-container {
          min-height: calc(100vh - 60px);
          width: 100%;
        }

        .coming-soon-container {
          min-height: calc(100vh - 60px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-8);
          text-align: center;
        }

        .coming-soon-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
        }

        .coming-soon-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }

        .coming-soon-description {
          font-size: var(--text-base);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-6);
        }

        .coming-soon-note {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          padding: var(--space-4);
          background: var(--color-neutral-100);
          border-radius: var(--radius-lg);
          max-width: 600px;
        }

        .legacy-link {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-6);
          margin-top: var(--space-4);
          background: var(--color-primary-500);
          color: white;
          border-radius: var(--radius-lg);
          text-decoration: none;
          font-weight: var(--font-semibold);
          transition: all var(--transition-base);
        }

        .legacy-link:hover {
          background: var(--color-primary-600);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
      `}</style>

      <div className="calculator-container">
        <div className="coming-soon-container">
          <div className="coming-soon-icon">💭</div>
          <h1 className="coming-soon-title">실시간 채팅</h1>
          <p className="coming-soon-description">
            React 버전의 실시간 채팅은 현재 개발 중입니다.
          </p>
          <div className="coming-soon-note">
            💡 현재는 기존 HTML 버전을 사용하실 수 있습니다.<br/>
            아래 버튼을 클릭하여 기존 채팅 페이지로 이동하세요.
          </div>
          <a href="/chat.html" className="legacy-link">
            <i className="fas fa-comment-dots"></i>
            기존 채팅 페이지 사용하기
          </a>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
