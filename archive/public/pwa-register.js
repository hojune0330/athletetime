// 애슬리트 타임 PWA 등록 스크립트
// Version: 1.0.0

(function() {
  'use strict';

  // Service Worker 지원 확인
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ 이 브라우저는 PWA를 지원하지 않습니다');
    return;
  }

  // Service Worker 등록
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/public/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker 등록 성공:', registration.scope);

        // 업데이트 확인
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 새 버전 발견!');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 새 버전 사용 가능
              console.log('✨ 새 버전 준비됨');
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker 등록 실패:', error);
      });
  });

  // 새 버전 알림 표시
  function showUpdateNotification() {
    if (!window.confirm('새 버전이 있습니다. 지금 업데이트하시겠습니까?')) {
      return;
    }

    // 대기 중인 Service Worker 활성화
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });

    // 페이지 리로드
    window.location.reload();
  }

  // PWA 설치 프롬프트
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA 설치 가능!');
    
    // 기본 프롬프트 방지
    e.preventDefault();
    
    // 나중에 사용하기 위해 저장
    deferredPrompt = e;

    // 설치 버튼 표시
    showInstallButton();
  });

  // 설치 버튼 표시
  function showInstallButton() {
    // 이미 설치됨 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ 이미 PWA로 설치됨');
      return;
    }

    // 설치 버튼 생성
    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-btn';
    installButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v12m0 0l-4-4m4 4l4-4m5-2v6a2 2 0 01-2 2H3a2 2 0 01-2-2v-6" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>앱으로 설치</span>
    `;
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #00ffa3, #00d4ff);
      color: #000000;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 255, 163, 0.3);
      transition: all 0.3s;
      animation: slideUp 0.3s ease;
    `;

    // 애니메이션
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      #pwa-install-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 255, 163, 0.4);
      }
      #pwa-install-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);

    // 클릭 이벤트
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.warn('⚠️ 설치 프롬프트가 없습니다');
        return;
      }

      // 설치 프롬프트 표시
      deferredPrompt.prompt();

      // 사용자 선택 대기
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`👤 사용자 선택: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('✅ PWA 설치 시작');
        
        // 설치 버튼 제거
        installButton.remove();
      }

      // 프롬프트 초기화
      deferredPrompt = null;
    });

    // DOM에 추가
    document.body.appendChild(installButton);

    // 7일 후 자동 숨김
    const installShownTime = localStorage.getItem('pwa-install-shown');
    if (!installShownTime) {
      localStorage.setItem('pwa-install-shown', Date.now());
    } else {
      const daysPassed = (Date.now() - parseInt(installShownTime)) / (1000 * 60 * 60 * 24);
      if (daysPassed > 7) {
        setTimeout(() => {
          installButton.style.display = 'none';
        }, 30000); // 30초 후 숨김
      }
    }

    // 닫기 버튼 추가
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #27272a;
      color: #ffffff;
      border: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      installButton.remove();
      localStorage.setItem('pwa-install-dismissed', Date.now());
    });
    installButton.style.position = 'relative';
    installButton.appendChild(closeBtn);
  }

  // 설치 완료 이벤트
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA 설치 완료!');
    
    // Google Analytics 이벤트 (나중에 추가)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'Install'
      });
    }

    // 설치 버튼 제거
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.remove();
    }

    // 환영 메시지
    setTimeout(() => {
      if (confirm('🎉 애슬리트 타임 앱 설치 완료!\n\n이제 홈 화면에서 바로 실행할 수 있습니다.')) {
        // 설치 성공 페이지로 이동 (선택)
      }
    }, 1000);
  });

  // iOS Safari 감지 및 안내
  function detectiOS() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

    if (isIOS && !isInStandaloneMode) {
      // iOS에서 설치 안내 (Safari Share 버튼)
      console.log('📱 iOS 감지: Safari Share 버튼으로 홈 화면에 추가하세요');
      
      // iOS 설치 안내 배너 표시 (선택)
      showIOSInstallBanner();
    }
  }

  function showIOSInstallBanner() {
    // 이미 표시했거나 7일 이내라면 표시 안 함
    const lastShown = localStorage.getItem('ios-install-banner-shown');
    if (lastShown && (Date.now() - parseInt(lastShown)) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    const banner = document.createElement('div');
    banner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #00ffa3, #00d4ff);
        padding: 16px;
        z-index: 9999;
        animation: slideUp 0.3s ease;
      ">
        <div style="display: flex; align-items: center; gap: 12px; color: #000;">
          <svg width="24" height="24" fill="none" stroke="currentColor">
            <path d="M12 5v14m-7-7h14" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 4px;">
              홈 화면에 추가
            </div>
            <div style="font-size: 12px; opacity: 0.8;">
              Safari의 <strong>공유</strong> 버튼을 눌러 추가하세요
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove(); localStorage.setItem('ios-install-banner-shown', Date.now());" 
                  style="background: rgba(0,0,0,0.2); border: none; color: #000; width: 32px; height: 32px; border-radius: 50%; font-size: 20px; cursor: pointer;">
            ×
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
    localStorage.setItem('ios-install-banner-shown', Date.now());
  }

  // iOS 체크
  detectiOS();

  // 연결 상태 모니터링
  window.addEventListener('online', () => {
    console.log('🌐 인터넷 연결됨');
    showConnectionStatus('온라인', '#00ffa3');
  });

  window.addEventListener('offline', () => {
    console.log('📡 인터넷 연결 끊김');
    showConnectionStatus('오프라인', '#ff4444');
  });

  function showConnectionStatus(message, color) {
    const status = document.createElement('div');
    status.textContent = message;
    status.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${color};
      color: #ffffff;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      z-index: 10000;
      animation: slideDown 0.3s ease;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styleEl);

    document.body.appendChild(status);

    setTimeout(() => {
      status.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => status.remove(), 300);
    }, 3000);
  }

  console.log('✅ PWA 등록 스크립트 로드 완료');
})();
