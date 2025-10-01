/**
 * 디바이스 감지 및 버전 관리 시스템
 */

class DeviceDetector {
  constructor() {
    this.isMobile = this.detectMobile();
    this.userPreference = this.getUserPreference();
    this.currentVersion = this.userPreference || (this.isMobile ? 'mobile' : 'desktop');
  }

  /**
   * 모바일 디바이스 감지
   */
  detectMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 모바일 디바이스 패턴
    const mobilePatterns = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Mobile/i,
      /Tablet/i
    ];
    
    // User Agent 체크
    const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
    
    // 화면 크기 체크 (추가 검증)
    const isMobileScreen = window.innerWidth <= 768;
    
    // 터치 지원 체크
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUA || (isMobileScreen && isTouchDevice);
  }

  /**
   * 저장된 사용자 선호 버전 가져오기
   */
  getUserPreference() {
    try {
      return localStorage.getItem('athleteTimeVersion');
    } catch (e) {
      console.warn('localStorage를 사용할 수 없습니다:', e);
      return null;
    }
  }

  /**
   * 사용자 선호 버전 저장
   */
  setUserPreference(version) {
    try {
      localStorage.setItem('athleteTimeVersion', version);
      this.userPreference = version;
      this.currentVersion = version;
    } catch (e) {
      console.warn('localStorage에 저장할 수 없습니다:', e);
    }
  }

  /**
   * 적절한 페이지로 리다이렉트
   */
  redirect(page = 'pace-calculator') {
    const version = this.currentVersion;
    const suffix = version === 'mobile' ? '-mobile' : '-desktop';
    const url = `${page}${suffix}.html`;
    
    // 현재 페이지와 다른 경우에만 리다이렉트
    if (!window.location.href.includes(suffix)) {
      window.location.href = url;
    }
  }

  /**
   * 버전 전환
   */
  switchVersion() {
    const newVersion = this.currentVersion === 'mobile' ? 'desktop' : 'mobile';
    this.setUserPreference(newVersion);
    this.redirect();
  }

  /**
   * 버전 전환 버튼 생성
   */
  createVersionSwitcher() {
    const button = document.createElement('button');
    button.className = 'version-switcher';
    button.innerHTML = this.currentVersion === 'mobile' 
      ? '<i class="fas fa-desktop"></i><span>PC 버전</span>'
      : '<i class="fas fa-mobile-alt"></i><span>모바일 버전</span>';
    
    button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #4A90E2;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #4A90E2;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    button.addEventListener('click', () => this.switchVersion());
    
    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.background = '#4A90E2';
      button.style.color = 'white';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255, 255, 255, 0.95)';
      button.style.color = '#4A90E2';
    });
    
    return button;
  }

  /**
   * 디바이스 정보 가져오기
   */
  getDeviceInfo() {
    return {
      isMobile: this.isMobile,
      isTablet: window.innerWidth >= 768 && window.innerWidth <= 1024,
      isDesktop: window.innerWidth > 1024,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      touchSupported: 'ontouchstart' in window,
      platform: navigator.platform,
      userAgent: navigator.userAgent
    };
  }
}

// 전역 인스턴스 생성
const deviceDetector = new DeviceDetector();

// 자동 초기화 (DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // 버전 전환 버튼 추가 (랜딩 페이지 제외)
    if (!window.location.pathname.includes('index.html') && 
        !window.location.pathname.endsWith('/')) {
      document.body.appendChild(deviceDetector.createVersionSwitcher());
    }
  });
} else {
  // 이미 로드된 경우
  if (!window.location.pathname.includes('index.html') && 
      !window.location.pathname.endsWith('/')) {
    document.body.appendChild(deviceDetector.createVersionSwitcher());
  }
}