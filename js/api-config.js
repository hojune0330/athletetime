// API 설정 - Render 백엔드 전용
const APIConfig = {
  // Render 백엔드 URL
  baseURL: 'https://athletetime-backend.onrender.com',
  
  // WebSocket URL
  wsURL: 'wss://athletetime-backend.onrender.com/ws',
  
  // API 엔드포인트
  endpoints: {
    posts: '/api/posts',
    stats: '/api/stats',
    chat: '/api/chat'
  }
};

// 전역 객체로 등록
window.APIConfig = APIConfig;