// 백엔드 설정 - Render 전용
const BackendConfig = {
  // Render 백엔드 URL 반환
  getBackendURL() {
    return 'https://athletetime-backend.onrender.com';
  },
  
  // WebSocket URL 반환
  getWebSocketURL() {
    return 'wss://athletetime-backend.onrender.com/ws';
  },
  
  // API 엔드포인트 생성
  getAPIEndpoint(path) {
    return `${this.getBackendURL()}${path}`;
  }
};

// 전역 객체로 등록
window.BackendConfig = BackendConfig;