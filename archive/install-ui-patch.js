// PWA 설치 UI 패치 스크립트
(function() {
  'use strict';
  
  console.log('🎨 PWA 설치 UI 초기화 중...');
  
  let deferredPrompt = null;
  
  // beforeinstallprompt 이벤트 캐치
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📥 설치 프롬프트 준비됨');
    e.preventDefault();
    deferredPrompt = e;
    showAllInstallButtons();
  });
  
  // 페이지 로드 시 즉시 UI 표시
  window.addEventListener('load', () => {
    // 이미 설치된 경우 확인
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    
    if (isStandalone) {
      console.log('✅ 이미 설치됨 - 설치 UI 숨김');
      return;
    }
    
    // 디바이스 감지
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    // iOS인 경우 바로 UI 표시
    if (isIOS) {
      console.log('📱 iOS 감지 - 설치 UI 표시');
      showAllInstallButtons();
      showTopBanner();
    } 
    // Android는 beforeinstallprompt 대기 (3초 후 타임아웃)
    else {
      setTimeout(() => {
        if (!deferredPrompt) {
          console.log('🤖 Android/Desktop - 설치 UI 표시');
          showAllInstallButtons();
          showTopBanner();
        }
      }, 1000);
    }
  });
  
  // 모든 설치 버튼 표시
  function showAllInstallButtons() {
    // 헤더 버튼
    const headerBtn = document.getElementById('headerInstallBtn');
    if (headerBtn) {
      headerBtn.style.display = 'inline-flex';
      headerBtn.onclick = handleInstall;
    }
    
    // 히어로 CTA 버튼
    const heroBtn = document.getElementById('heroInstallBtn');
    if (heroBtn) {
      heroBtn.style.display = 'inline-flex';
      heroBtn.onclick = handleInstall;
    }
    
    // 배너 버튼
    const bannerBtn = document.getElementById('bannerInstallBtn');
    if (bannerBtn) {
      bannerBtn.onclick = handleInstall;
    }
    
    // 간단한 설치 버튼 (다른 페이지용)
    const simpleBtn = document.getElementById("simpleInstallBtn");
    if (simpleBtn) {
      simpleBtn.classList.add("show");
      simpleBtn.onclick = handleInstall;
    }
  }
  
  // 상단 배너 표시
  function showTopBanner() {
    const banner = document.getElementById('topInstallBanner');
    if (!banner) return;
    
    // 24시간 내에 닫았는지 확인
    const dismissed = localStorage.getItem('pwa-top-banner-dismissed');
    if (dismissed) {
      const dismissTime = parseInt(dismissed);
      const hoursPassed = (Date.now() - dismissTime) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        console.log('⏰ 배너 24시간 내 닫힘');
        return;
      }
    }
    
    banner.classList.add('show');
    
    // 닫기 버튼
    const closeBtn = document.getElementById('bannerCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        banner.classList.remove('show');
        
        const simpleBtn = document.getElementById("simpleInstallBtn");
        if (simpleBtn) simpleBtn.classList.remove("show");
        localStorage.setItem('pwa-top-banner-dismissed', Date.now().toString());
      };
    }
  }
  
  // 설치 처리
  async function handleInstall() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    // iOS인 경우 안내 메시지
    if (isIOS) {
      showIOSInstructions();
      return;
    }
    
    // Android/Desktop - beforeinstallprompt 사용
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ 설치 수락');
        hideAllInstallUI();
      } else {
        console.log('❌ 설치 거부');
      }
      
      deferredPrompt = null;
    } else {
      // beforeinstallprompt 없는 경우 일반 안내
      showGenericInstructions();
    }
  }
  
  // iOS 설치 안내
  function showIOSInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: 2px solid #00ffa3;
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">📱</div>
        <h2 style="color: #00ffa3; font-size: 1.5rem; font-weight: 700; margin-bottom: 16px;">
          iOS 설치 방법
        </h2>
        <div style="color: #e2e8f0; font-size: 1rem; line-height: 1.6; margin-bottom: 24px;">
          <p style="margin-bottom: 12px;">1. 하단 중앙의 <strong style="color: #00ffa3;">공유 버튼(□↑)</strong>을 탭하세요</p>
          <p style="margin-bottom: 12px;">2. 스크롤해서 <strong style="color: #00ffa3;">"홈 화면에 추가"</strong>를 찾으세요</p>
          <p style="margin-bottom: 12px;">3. <strong style="color: #00ffa3;">"추가"</strong> 버튼을 탭하세요</p>
          <p style="color: #00ffa3; font-weight: 600;">홈 화면에 앱 아이콘이 생성됩니다!</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #00ffa3, #00d4ff);
          border: none;
          border-radius: 12px;
          color: #0f0f0f;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        ">
          알겠습니다
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }
  
  // 일반 브라우저 안내
  function showGenericInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: 2px solid #00ffa3;
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">💻</div>
        <h2 style="color: #00ffa3; font-size: 1.5rem; font-weight: 700; margin-bottom: 16px;">
          설치 방법
        </h2>
        <div style="color: #e2e8f0; font-size: 1rem; line-height: 1.6; margin-bottom: 24px;">
          <p style="margin-bottom: 12px;">1. 브라우저 메뉴(⋮)를 여세요</p>
          <p style="margin-bottom: 12px;">2. <strong style="color: #00ffa3;">"홈 화면에 추가"</strong> 또는 <strong style="color: #00ffa3;">"설치"</strong>를 선택하세요</p>
          <p style="color: #00ffa3; font-weight: 600;">앱처럼 사용할 수 있습니다!</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #00ffa3, #00d4ff);
          border: none;
          border-radius: 12px;
          color: #0f0f0f;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        ">
          알겠습니다
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }
  
  // 모든 설치 UI 숨기기
  function hideAllInstallUI() {
    const headerBtn = document.getElementById('headerInstallBtn');
    if (headerBtn) headerBtn.style.display = 'none';
    
    const heroBtn = document.getElementById('heroInstallBtn');
    if (heroBtn) heroBtn.style.display = 'none';
    
    const banner = document.getElementById('topInstallBanner');
    if (banner) banner.classList.remove('show');
    
    const simpleBtn = document.getElementById('simpleInstallBtn');
    if (simpleBtn) simpleBtn.classList.remove('show');
  }
  
  // 설치 완료 이벤트
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA 설치 완료!');
    hideAllInstallUI();
    
    // 축하 메시지
    const toast = document.createElement('div');
    toast.textContent = '🎉 앱 설치 완료!';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #00ffa3, #00d4ff);
      color: #0f0f0f;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 700;
      z-index: 10001;
      box-shadow: 0 8px 24px rgba(0, 255, 163, 0.5);
      animation: slideInRight 0.5s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.5s ease-out';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  });
  
  // 애니메이션 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ PWA 설치 UI 준비 완료');
})();
