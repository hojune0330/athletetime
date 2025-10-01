// 디바이스 감지 및 라우팅 모듈
const DeviceRouter = {
  // 디바이스 타입 감지
  detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    const isTablet = /tablet|ipad/i.test(userAgent);
    const screenWidth = window.innerWidth;
    
    // 화면 크기와 UA 기반 판단
    if (screenWidth < 768 || isMobile) {
      return 'mobile';
    } else if (screenWidth < 1024 || isTablet) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  },

  // 사용자 선택 저장
  saveUserPreference(device) {
    localStorage.setItem('preferredDevice', device);
    localStorage.setItem('preferenceTimestamp', Date.now());
  },

  // 저장된 선택 가져오기
  getUserPreference() {
    const preference = localStorage.getItem('preferredDevice');
    const timestamp = localStorage.getItem('preferenceTimestamp');
    
    // 7일 이상 지난 선택은 무시
    if (preference && timestamp) {
      const daysSince = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return preference;
      }
    }
    return null;
  },

  // 디바이스별 페이지로 리디렉션
  redirectToVersion(device) {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    // 이미 올바른 버전에 있으면 리디렉션 안함
    if (currentPage.includes(`-${device}`)) {
      return;
    }
    
    // 페이지별 리디렉션 매핑
    const pageMap = {
      'index.html': device === 'mobile' ? 'index-mobile.html' : 'index-desktop.html',
      'pace-calculator.html': device === 'mobile' ? 'pace-calculator-mobile.html' : 'pace-calculator-desktop.html',
      'community.html': device === 'mobile' ? 'community-mobile.html' : 'community-desktop.html',
      'chat.html': device === 'mobile' ? 'chat-mobile.html' : 'chat-desktop.html'
    };
    
    // 기본 페이지 매핑
    let targetPage = pageMap[currentPage];
    
    // 매핑이 없으면 현재 페이지에 -mobile 또는 -desktop 추가
    if (!targetPage) {
      const pageName = currentPage.replace('.html', '');
      targetPage = `${pageName}-${device}.html`;
    }
    
    // 리디렉션
    if (targetPage && targetPage !== currentPage) {
      window.location.href = targetPage;
    }
  },

  // 자동 라우팅 초기화
  init() {
    // 사용자 선택 확인
    const userPreference = this.getUserPreference();
    
    if (userPreference) {
      // 저장된 선택이 있으면 해당 버전으로
      this.redirectToVersion(userPreference);
    } else {
      // 없으면 자동 감지
      const detectedDevice = this.detectDevice();
      const targetDevice = detectedDevice === 'tablet' ? 'mobile' : detectedDevice;
      this.redirectToVersion(targetDevice);
    }
  },

  // 수동 버전 전환
  switchVersion(device) {
    this.saveUserPreference(device);
    this.redirectToVersion(device);
  },

  // 현재 버전 확인
  getCurrentVersion() {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage.includes('-mobile')) return 'mobile';
    if (currentPage.includes('-desktop')) return 'desktop';
    return 'unknown';
  }
};

// 전역 사용 가능하도록 노출
window.DeviceRouter = DeviceRouter;