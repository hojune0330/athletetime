import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>애슬리트 타임 | 한국 육상인 통합 플랫폼</title>
        <meta name="description" content="초중고대실업마스터즈 육상 경기 시간표와 익명 커뮤니티" />
        
        {/* Tailwind CSS */}
        <script src="https://cdn.tailwindcss.com"></script>
        
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
        
        {/* Pretendard Font */}
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        
        {/* 카카오 JavaScript SDK */}
        <script src="https://t1.kakaocdn.net/kakao_js_sdk/2.4.0/kakao.min.js"></script>
        
        <style>{`
          body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
          }
          .active\\:scale-95:active {
            transform: scale(0.95);
          }
          .hover\\:scale-105:hover {
            transform: scale(1.05);
          }
        `}</style>
      </head>
      <body>
        {children}
        
        <script>{`
          // 애슬리트 타임 클라이언트 스크립트
          
          // 세션 관리
          const SessionManager = {
            setSession: (token) => localStorage.setItem('athletetime_session', token),
            getSession: () => localStorage.getItem('athletetime_session'),
            clearSession: () => localStorage.removeItem('athletetime_session'),
            isLoggedIn: () => !!localStorage.getItem('athletetime_session')
          };
          
          // 카카오 SDK 초기화
          if (typeof Kakao !== 'undefined') {
            Kakao.init('demo-kakao-app-key'); // 실제로는 환경변수 사용
          }
          
          // 로그인 모달 관리
          function showLoginModal() {
            document.getElementById('loginModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
          }
          
          function hideLoginModal() {
            document.getElementById('loginModal').classList.add('hidden');
            document.body.style.overflow = '';
          }
          
          // 소셜 로그인 처리 (데모)
          function handleSocialLogin(provider) {
            const providers = {
              google: '구글',
              apple: 'Apple',
              kakao: '카카오',
              naver: '네이버'
            };
            
            // 데모 사용자 정보 생성
            const demoUser = {
              email: \`user@\${provider}.com\`,
              name: \`\${providers[provider]} 사용자\`,
              provider: provider,
              isAnonymous: false,
              loginTime: new Date().toISOString()
            };
            
            // 세션 저장 (실제로는 JWT 토큰)
            SessionManager.setSession(JSON.stringify(demoUser));
            
            alert(\`\${providers[provider]} 로그인이 완료되었습니다! (데모)\`);
            hideLoginModal();
            updateUI();
          }
          
          // 익명 로그인 처리
          function handleAnonymousLogin() {
            const anonymousUser = {
              email: '',
              name: \`익명\${Math.floor(Math.random() * 10000)}\`,
              provider: 'anonymous',
              isAnonymous: true,
              loginTime: new Date().toISOString()
            };
            
            SessionManager.setSession(JSON.stringify(anonymousUser));
            alert('익명 로그인이 완료되었습니다!');
            hideLoginModal();
            updateUI();
          }
          
          // 페이지 이동 처리
          function navigateTo(page) {
            if (!SessionManager.isLoggedIn() && ['community', 'schedule', 'results'].includes(page)) {
              showLoginModal();
              return;
            }
            
            // 실제로는 SPA 라우팅, 지금은 알림으로 대체
            const pageNames = {
              community: '커뮤니티',
              schedule: '경기 일정',
              results: '경기 결과'
            };
            
            alert(\`\${pageNames[page]} 페이지로 이동합니다! (구현 중)\`);
          }
          
          // 카카오톡 공유
          function shareToKakao() {
            const url = window.location.href;
            const title = '애슬리트 타임 - 한국 육상인 통합 플랫폼';
            
            if (typeof Kakao !== 'undefined' && Kakao.Share) {
              Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                  title: title,
                  description: '초중고대실업마스터즈 육상 커뮤니티',
                  imageUrl: 'https://athlete-time.pages.dev/static/logo.png',
                  link: { mobileWebUrl: url, webUrl: url }
                }
              });
            } else {
              // Fallback: 링크 복사
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
                alert('링크가 클립보드에 복사되었습니다! 카카오톡에서 공유해보세요 📋');
              } else {
                prompt('링크를 복사하여 카카오톡에서 공유하세요:', url);
              }
            }
          }
          
          // UI 업데이트
          function updateUI() {
            const user = SessionManager.getSession();
            if (user) {
              const userData = JSON.parse(user);
              // 로그인 상태 UI 업데이트 (실제로는 더 복잡한 DOM 조작)
              console.log('로그인된 사용자:', userData.name);
            }
          }
          
          // 페이지 로드 시 초기화
          document.addEventListener('DOMContentLoaded', function() {
            console.log('🏃‍♂️ 애슬리트 타임 로드 완료!');
            updateUI();
            
            // 이벤트 리스너 등록 (더 안전한 방식)
            const loginBtn = document.querySelector('[data-action="showLogin"]');
            if (loginBtn) {
              loginBtn.addEventListener('click', showLoginModal);
            }
            
            const shareBtn = document.querySelector('[data-action="share"]');
            if (shareBtn) {
              shareBtn.addEventListener('click', shareToKakao);
            }
            
            // 커뮤니티 버튼
            const communityBtn = document.querySelector('[data-action="community"]');
            if (communityBtn) {
              communityBtn.addEventListener('click', () => navigateTo('community'));
            }
            
            // 일정 버튼
            const scheduleBtn = document.querySelector('[data-action="schedule"]');
            if (scheduleBtn) {
              scheduleBtn.addEventListener('click', () => navigateTo('schedule'));
            }
            
            // 결과 버튼
            const resultsBtn = document.querySelector('[data-action="results"]');
            if (resultsBtn) {
              resultsBtn.addEventListener('click', () => navigateTo('results'));
            }
            
            // 모달 관련
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
              // 모달 외부 클릭 시 닫기
              loginModal.addEventListener('click', function(e) {
                if (e.target === this) {
                  hideLoginModal();
                }
              });
              
              // 닫기 버튼
              const closeBtn = loginModal.querySelector('[data-action="closeModal"]');
              if (closeBtn) {
                closeBtn.addEventListener('click', hideLoginModal);
              }
              
              // 소셜 로그인 버튼들
              const googleBtn = loginModal.querySelector('[data-provider="google"]');
              if (googleBtn) googleBtn.addEventListener('click', () => handleSocialLogin('google'));
              
              const appleBtn = loginModal.querySelector('[data-provider="apple"]');
              if (appleBtn) appleBtn.addEventListener('click', () => handleSocialLogin('apple'));
              
              const kakaoBtn = loginModal.querySelector('[data-provider="kakao"]');
              if (kakaoBtn) kakaoBtn.addEventListener('click', () => handleSocialLogin('kakao'));
              
              const naverBtn = loginModal.querySelector('[data-provider="naver"]');
              if (naverBtn) naverBtn.addEventListener('click', () => handleSocialLogin('naver'));
              
              const anonBtn = loginModal.querySelector('[data-action="anonymous"]');
              if (anonBtn) anonBtn.addEventListener('click', handleAnonymousLogin);
            }
          });
          
          // 전역 함수 등록
          window.showLoginModal = showLoginModal;
          window.hideLoginModal = hideLoginModal;
          window.handleSocialLogin = handleSocialLogin;
          window.handleAnonymousLogin = handleAnonymousLogin;
          window.navigateTo = navigateTo;
          window.shareToKakao = shareToKakao;
        `}</script>
      </body>
    </html>
  )
})
