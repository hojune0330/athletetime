// API 설정 파일
const API_CONFIG = {
  // Render.com 백엔드 URL
  baseURL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://athletetime-backend.onrender.com',
    
  // WebSocket URL
  wsURL: window.location.hostname === 'localhost'
    ? 'ws://localhost:3000/ws'
    : 'wss://athletetime-backend.onrender.com/ws',

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

// 헬퍼 함수
async function apiRequest(endpoint, options = {}) {
  const url = API_CONFIG.baseURL + endpoint;
  
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
    throw error;
  }
}

// WebSocket 연결 헬퍼
function connectWebSocket(handlers) {
  const ws = new WebSocket(API_CONFIG.wsURL);
  
  ws.onopen = handlers.onOpen || (() => console.log('WebSocket connected'));
  ws.onmessage = handlers.onMessage || ((e) => console.log('Message:', e.data));
  ws.onerror = handlers.onError || ((e) => console.error('WebSocket error:', e));
  ws.onclose = handlers.onClose || (() => console.log('WebSocket disconnected'));
  
  return ws;
}