/**
 * 🌐 Athlete Time - 전역 상수 및 URL 관리
 * 
 * ⚠️ 중요: 모든 서비스 URL은 이 파일에서만 관리합니다.
 * 다른 파일에서 직접 URL을 하드코딩하지 마세요!
 * 
 * 이름 규칙:
 * - Frontend: athlete-time (하이픈 있음) - Netlify 도메인 변경 불가
 * - Backend: athletetime (하이픈 없음) - v3.0.0 신규 서비스
 * - Database: athletetime (하이픈 없음) - v3.0.0 신규 서비스
 */

// ============================================
// 🔧 프로덕션 URL 설정
// ============================================

/**
 * 프론트엔드 URL
 * - Netlify 도메인: athlete-time (하이픈 있음)
 * - 변경 불가 (기존 도메인 유지)
 */
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://athlete-time.netlify.app';

/**
 * 백엔드 API URL
 * - Render.com 서비스: athletetime-backend (하이픈 없음)
 * - v3.0.0 신규 통합 서버
 * 
 * ⚠️ 주의: athlete-time-backend가 아닙니다!
 * 
 * 환경 변수 우선순위:
 * 1. VITE_API_BASE_URL (환경 변수)
 * 2. 기본값 (하드코딩)
 */
export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'https://athletetime-backend.onrender.com';

/**
 * WebSocket URL
 * - 백엔드와 동일한 도메인 사용
 */
export const WEBSOCKET_URL = BACKEND_URL.replace('https://', 'wss://');

// ============================================
// 📱 개발 환경 설정
// ============================================

/**
 * 로컬 개발 서버 URL
 */
export const LOCAL_BACKEND_URL = 'http://localhost:3005';
export const LOCAL_WEBSOCKET_URL = 'ws://localhost:3005';

/**
 * e2b.dev 샌드박스 환경 감지 및 URL 생성
 */
export const getSandboxBackendUrl = (): string | null => {
  const hostname = window.location.hostname;
  
  if (!hostname.includes('e2b.dev')) {
    return null;
  }
  
  // 현재 URL: https://5173-sandbox-id.e2b.dev
  // 변환 URL: https://3005-sandbox-id.e2b.dev
  const currentHost = window.location.host;
  const apiHost = currentHost.replace(/^\d+/, '3005');
  return `https://${apiHost}`;
};

/**
 * 환경별 자동 URL 선택
 * 
 * 우선순위:
 * 1. 프로덕션 빌드 → BACKEND_URL
 * 2. e2b.dev 샌드박스 → 자동 감지
 * 3. 로컬 개발 → LOCAL_BACKEND_URL
 */
export const getApiBaseUrl = (): string => {
  // 프로덕션 환경
  if (import.meta.env.PROD) {
    return BACKEND_URL;
  }
  
  // 샌드박스 환경 자동 감지
  const sandboxUrl = getSandboxBackendUrl();
  if (sandboxUrl) {
    return sandboxUrl;
  }
  
  // 로컬 개발 환경
  return LOCAL_BACKEND_URL;
};

/**
 * WebSocket URL 자동 선택
 */
export const getWebSocketUrl = (): string => {
  // 프로덕션 환경
  if (import.meta.env.PROD) {
    return WEBSOCKET_URL;
  }
  
  // 샌드박스 환경
  const sandboxUrl = getSandboxBackendUrl();
  if (sandboxUrl) {
    return sandboxUrl.replace('https://', 'wss://');
  }
  
  // 로컬 환경
  return LOCAL_WEBSOCKET_URL;
};

// ============================================
// 📚 API 엔드포인트
// ============================================

export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  
  // 게시글
  POSTS: {
    LIST: '/api/posts',
    CREATE: '/api/posts',
    DETAIL: (id: number) => `/api/posts/${id}`,
    UPDATE: (id: number) => `/api/posts/${id}`,
    DELETE: (id: number) => `/api/posts/${id}`,
    VOTE: (id: number) => `/api/posts/${id}/vote`,
  },
  
  // 댓글
  COMMENTS: {
    LIST: (postId: number) => `/api/posts/${postId}/comments`,
    CREATE: (postId: number) => `/api/posts/${postId}/comments`,
    UPDATE: (postId: number, commentId: number) => `/api/posts/${postId}/comments/${commentId}`,
    DELETE: (postId: number, commentId: number) => `/api/posts/${postId}/comments/${commentId}`,
  },
  
  // 사용자
  USER: {
    PROFILE: '/api/user/profile',
    STATS: '/api/user/stats',
    POSTS: '/api/user/posts',
  },
  
  // 알림
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    READ: (id: number) => `/api/notifications/${id}/read`,
    READ_ALL: '/api/notifications/read-all',
  },
  
  // 헬스체크
  HEALTH: '/health',
} as const;

// ============================================
// 🎨 애플리케이션 설정
// ============================================

export const APP_CONFIG = {
  // 이름
  NAME: 'Athlete Time',
  DESCRIPTION: '육상 커뮤니티',
  
  // 버전
  VERSION: '3.0.0',
  
  // 페이지네이션
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // 파일 업로드
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // 타임아웃
  API_TIMEOUT: 10000, // 10초
  WEBSOCKET_RECONNECT_INTERVAL: 5000, // 5초
  
  // 캐싱
  CACHE_DURATION: 5 * 60 * 1000, // 5분
} as const;

// ============================================
// 🔐 로컬 스토리지 키
// ============================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'athlete_time_token',
  USER_INFO: 'athlete_time_user',
  THEME: 'athlete_time_theme',
  DRAFT_POST: 'athlete_time_draft_post',
} as const;

// ============================================
// 🐛 디버깅 정보 (개발 환경에서만)
// ============================================

if (import.meta.env.DEV) {
  console.group('🌐 Athlete Time Configuration');
  console.log('Environment:', import.meta.env.MODE);
  console.log('Frontend URL:', FRONTEND_URL);
  console.log('Backend URL:', getApiBaseUrl());
  console.log('WebSocket URL:', getWebSocketUrl());
  console.log('Version:', APP_CONFIG.VERSION);
  console.groupEnd();
}

// ============================================
// ⚠️ 이름 규칙 알림
// ============================================

/**
 * 🚨 중요: 서비스 이름 규칙
 * 
 * Frontend (Netlify):
 * - URL: athlete-time.netlify.app
 * - 이유: 기존 도메인 유지 (하이픈 있음)
 * 
 * Backend (Render.com):
 * - URL: athletetime-backend.onrender.com
 * - 이유: v3.0.0 신규 서비스 (하이픈 없음)
 * 
 * Database (Render.com):
 * - Name: athletetime-db
 * - 이유: v3.0.0 신규 서비스 (하이픈 없음)
 * 
 * GitHub:
 * - Repo: hojune0330/athletetime
 * - 이유: 원본 저장소 (하이픈 없음)
 * 
 * ⚠️ 주의사항:
 * - 절대로 athlete-time-backend 사용하지 마세요!
 * - 백엔드는 항상 athletetime-backend (하이픈 없음)
 * - 프론트엔드는 athlete-time (하이픈 있음) - 변경 불가
 */
