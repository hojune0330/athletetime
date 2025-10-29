// 애슬리트 타임 PWA 등록 스크립트
// Version: 2.0.0 - Production Ready

(function() {
  'use strict';

  console.log('✅ PWA 등록 스크립트 로드 완료');

  // Service Worker 지원 확인
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ 이 브라우저는 PWA를 지원하지 않습니다');
    return;
  }

  let deferredPrompt = null;
  let installButton = null;

  // Service Worker 등록
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker 등록 성공:', registration.scope);

        // 업데이트 확인
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 새 버전 발견!');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ 새 버전 준비됨');
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker 등록 실패:', error);
      });

    // iOS/Android 감지 및 설치 안내
    detectDeviceAndShowInstall();
  });

  // 디바이스 감지 및 설치 안내 표시
  function detectDeviceAndShowInstall() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone === true;

    // 이미 설치된 경우 배너 표시 안 함
    if (isInStandaloneMode) {
      console.log('✅ PWA가 이미 설치되어 있습니다');
      return;
    }

    // localStorage에서 배너 닫기 상태 확인 (24시간 동안 표시 안 함)
    const bannerDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (bannerDismissed) {
      const dismissTime = parseInt(bannerDismissed);
      const hoursPassed = (Date.now() - dismissTime) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        console.log('⏰ 배너 표시 대기 중 (24시간 내 닫힘)');
        return;
      }
    }

    // iOS Safari
    if (isIOS) {
      setTimeout(() => showIOSInstallBanner(), 2000);
    }
    // Android 또는 데스크톱
    else {
      // beforeinstallprompt 이벤트 대기 (3초 후 수동 배너 표시)
      setTimeout(() => {
        if (!deferredPrompt) {
          showGenericInstallBanner();
        }
      }, 3000);
    }
  }

  // PWA 설치 프롬프트 이벤트 캐치
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📥 설치 프롬프트 준비됨');
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  // 설치 성공 감지
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA 설치 완료!');
    hideAllBanners();
    deferredPrompt = null;
  });

  // Android/Desktop 설치 버튼 표시
  function showInstallButton() {
    if (installButton) return;

    installButton = document.createElement('button');
    installButton.id = 'pwa-install-button';
    installButton.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>앱 설치</span>
      </div>
    `;
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #00ffa3, #00d4ff);
      color: #0f0f0f;
      border: none;
      border-radius: 50px;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 255, 163, 0.4);
      z-index: 9999;
      transition: all 0.3s;
      animation: slideInUp 0.5s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInUp {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      #pwa-install-button:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 12px 32px rgba(0, 255, 163, 0.6);
      }
      #pwa-install-button:active {
        transform: translateY(0) scale(0.98);
      }
    `;
    document.head.appendChild(style);

    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ 사용자가 설치를 수락했습니다');
      } else {
        console.log('❌ 사용자가 설치를 거부했습니다');
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
      }

      deferredPrompt = null;
      installButton.remove();
      installButton = null;
    });

    document.body.appendChild(installButton);

    // 2초 후 펄스 효과
    setTimeout(() => {
      installButton.style.animation = 'pulse 1.5s infinite';
    }, 2000);
  }

  // iOS 설치 배너
  function showIOSInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'ios-install-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
        <div style="font-size: 32px; flex-shrink: 0;">📱</div>
        <div style="flex: 1;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">
            애슬리트 타임 앱으로 설치
          </div>
          <div style="font-size: 13px; opacity: 0.9; line-height: 1.4;">
            Safari 하단 <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline; vertical-align: middle; margin: 0 2px;"><path d="M18 16v2H6v-2H18zM14.5 9l-3 3-3-3H11V3h2v6h1.5z"/></svg> → "홈 화면에 추가"
          </div>
        </div>
        <button id="ios-banner-close" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
    `;
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #00ffa3, #00d4ff);
      color: #0f0f0f;
      padding: 16px 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      animation: slideInDown 0.5s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideOutUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    // 닫기 버튼
    document.getElementById('ios-banner-close').addEventListener('click', () => {
      banner.style.animation = 'slideOutUp 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
      localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    });

    // 15초 후 자동 닫기
    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.animation = 'slideOutUp 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
      }
    }, 15000);
  }

  // 일반 설치 배너 (beforeinstallprompt 없는 경우)
  function showGenericInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'generic-install-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
        <div style="font-size: 28px;">🚀</div>
        <div style="flex: 1;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">
            더 빠른 앱 경험
          </div>
          <div style="font-size: 13px; opacity: 0.9;">
            브라우저 메뉴 → "홈 화면에 추가"
          </div>
        </div>
        <button id="generic-banner-close" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        ">×</button>
      </div>
    `;
    banner.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #00ffa3, #00d4ff);
      color: #0f0f0f;
      padding: 16px 20px;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9998;
      animation: slideInUp 0.5s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    document.body.appendChild(banner);

    document.getElementById('generic-banner-close').addEventListener('click', () => {
      banner.style.animation = 'slideOutDown 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
      localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    });

    // 10초 후 자동 닫기
    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.animation = 'slideOutDown 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
      }
    }, 10000);
  }

  // 모든 배너 숨기기
  function hideAllBanners() {
    const banners = document.querySelectorAll('#ios-install-banner, #generic-install-banner');
    banners.forEach(banner => banner.remove());
    if (installButton) {
      installButton.remove();
      installButton = null;
    }
  }

  // 새 버전 업데이트 알림
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
        <div style="font-size: 24px;">🔄</div>
        <div style="flex: 1;">
          <div style="font-weight: 700;">새 버전 사용 가능</div>
          <div style="font-size: 13px; opacity: 0.9;">지금 업데이트하시겠습니까?</div>
        </div>
        <button id="update-now" style="
          background: white;
          color: #0f0f0f;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        ">업데이트</button>
        <button id="update-later" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        ">나중에</button>
      </div>
    `;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      max-width: 500px;
      margin: 0 auto;
      background: linear-gradient(135deg, #00ffa3, #00d4ff);
      color: #0f0f0f;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideInUp 0.5s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    document.body.appendChild(notification);

    document.getElementById('update-now').addEventListener('click', () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    });

    document.getElementById('update-later').addEventListener('click', () => {
      notification.remove();
    });
  }

  // 온라인/오프라인 상태 모니터링
  window.addEventListener('online', () => {
    console.log('🌐 온라인 상태로 전환');
    showToast('인터넷에 다시 연결되었습니다', 'success');
  });

  window.addEventListener('offline', () => {
    console.log('📡 오프라인 상태로 전환');
    showToast('오프라인 모드 - 캐시된 콘텐츠 사용', 'warning');
  });

  // 간단한 토스트 메시지
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#00ffa3' : type === 'warning' ? '#fbbf24' : '#3b82f6'};
      color: #0f0f0f;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      font-weight: 600;
      animation: fadeIn 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 페이드 애니메이션
  const fadeStyle = document.createElement('style');
  fadeStyle.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(fadeStyle);

})();
