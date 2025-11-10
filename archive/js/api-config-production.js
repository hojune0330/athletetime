// Production API Configuration
// Render 배포 후 이 파일을 사용하세요

const API_CONFIG = {
  // ⚠️ 여기에 실제 Render URL을 넣으세요!
  // 예: https://athlete-time-backend-xxxx.onrender.com
  baseURL: 'https://athlete-time-backend.onrender.com',  // <- 실제 URL로 변경
  
  // WebSocket URL (https를 wss로 변경)
  wsURL: 'wss://athlete-time-backend.onrender.com',  // <- 실제 URL로 변경

  // API 엔드포인트
  endpoints: {
    // 게시판
    posts: '/api/posts',
    post: (id) => `/api/posts/${id}`,
    comments: (id) => `/api/posts/${id}/comments`, 
    vote: (id) => `/api/posts/${id}/vote`,
    
    // 채팅
    chatStats: '/api/chat/stats',
    chatRooms: '/api/chat/rooms'
  }
};

// 모든 페이지에 이 설정 적용
window.API_BASE_URL = API_CONFIG.baseURL;
window.WS_URL = API_CONFIG.wsURL;

console.log('🚀 API Connected to:', API_CONFIG.baseURL);