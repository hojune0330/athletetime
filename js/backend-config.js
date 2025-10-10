/**
 * Athlete Time 백엔드 통합 설정
 * 이 파일에서 모든 백엔드 URL을 중앙 관리합니다.
 * 
 * Render Starter 플랜 사용 중 - 24/7 운영
 * Backend URL: https://athletetime-backend.onrender.com
 */

const BackendConfig = {
  /**
   * 환경 감지
   */
  isLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  },

  isDevelopment() {
    return window.location.hostname.includes('e2b.dev');
  },

  isProduction() {
    return !this.isLocalhost() && !this.isDevelopment();
  },

  /**
   * 백엔드 URL 가져오기
   */
  getBackendURL() {
    if (this.isLocalhost()) {
      return 'http://localhost:3000';
    } else if (this.isDevelopment()) {
      // e2b.dev 개발 환경
      const hostname = window.location.hostname;
      const sandboxId = hostname.split('-')[1];
      return `https://3000-${sandboxId}`;
    } else {
      // 프로덕션 (Netlify, 실제 도메인 등)
      return 'https://athletetime-backend.onrender.com';
    }
  },

  /**
   * WebSocket URL 가져오기
   */
  getWebSocketURL() {
    if (this.isLocalhost()) {
      return 'ws://localhost:3000/ws';
    } else if (this.isDevelopment()) {
      const hostname = window.location.hostname;
      const sandboxId = hostname.split('-')[1];
      return `wss://3000-${sandboxId}/ws`;
    } else {
      // 프로덕션
      return 'wss://athletetime-backend.onrender.com/ws';
    }
  },

  /**
   * API 엔드포인트
   */
  endpoints: {
    // 헬스체크
    health: '/api/health',
    
    // 게시판
    posts: '/api/posts',
    post: (id) => `/api/posts/${id}`,
    postComments: (id) => `/api/posts/${id}/comments`,
    postVote: (id) => `/api/posts/${id}/vote`,
    postReport: (id) => `/api/posts/${id}/report`,
    
    // 채팅 (REST API가 있다면)
    chatRooms: '/api/chat/rooms',
    chatStats: '/api/chat/stats',
    
    // 기타 추가 가능한 엔드포인트
    upload: '/api/upload',
    statistics: '/api/statistics'
  },

  /**
   * API 요청 헬퍼
   */
  async apiRequest(endpoint, options = {}) {
    const url = this.getBackendURL() + endpoint;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      console.error('URL:', url);
      console.error('Options:', options);
      throw error;
    }
  },

  /**
   * WebSocket 연결 헬퍼
   */
  connectWebSocket(handlers = {}) {
    const wsUrl = this.getWebSocketURL();
    console.log('🔌 WebSocket 연결 시도:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = (event) => {
      console.log('✅ WebSocket 연결 성공');
      if (handlers.onOpen) handlers.onOpen(event);
    };
    
    ws.onmessage = (event) => {
      if (handlers.onMessage) handlers.onMessage(event);
    };
    
    ws.onerror = (event) => {
      console.error('❌ WebSocket 에러:', event);
      if (handlers.onError) handlers.onError(event);
    };
    
    ws.onclose = (event) => {
      console.log('🔌 WebSocket 연결 종료');
      if (handlers.onClose) handlers.onClose(event);
    };
    
    return ws;
  },

  /**
   * 상태 확인
   */
  async checkBackendStatus() {
    try {
      const response = await fetch(this.getBackendURL() + '/');
      const data = await response.json();
      console.log('✅ 백엔드 서버 상태:', data);
      return data;
    } catch (error) {
      console.error('❌ 백엔드 서버 연결 실패:', error);
      return null;
    }
  },

  /**
   * 초기화 및 디버깅 정보
   */
  init() {
    console.log('🔧 Athlete Time Backend Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Current Host:', window.location.hostname);
    console.log('🌍 Environment:', this.isProduction() ? 'Production' : 
                              this.isDevelopment() ? 'Development' : 'Localhost');
    console.log('🔗 Backend URL:', this.getBackendURL());
    console.log('🔌 WebSocket URL:', this.getWebSocketURL());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 자동으로 백엔드 상태 확인
    this.checkBackendStatus();
  }
};

// 페이지 로드 시 자동 초기화
if (typeof window !== 'undefined') {
  window.BackendConfig = BackendConfig;
  
  // DOM이 준비되면 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BackendConfig.init());
  } else {
    BackendConfig.init();
  }
}

// CommonJS/ES6 모듈 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackendConfig;
}