/**
 * API Client Configuration
 * 
 * 백엔드 서버와의 HTTP 통신을 담당하는 Axios 클라이언트 설정
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios';

// 환경별 API URL 설정
// 
// 프로젝트 이름: athlete-time (하이픈 있음)
// 프론트엔드: https://athlete-time.netlify.app
// 백엔드 (프로덕션): https://athlete-time-backend.onrender.com
// 백엔드 (개발): http://localhost:3005
// 백엔드 (샌드박스): https://3005-iq027ecuq0v4g69kga779-2e77fc33.sandbox.novita.ai
// 
// ⚠️ 중요: 모든 URL에 하이픈(-) 사용으로 통일되었습니다.
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://athlete-time-backend.onrender.com'
  : 'http://localhost:3005';

/**
 * Axios 인스턴스 생성
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 * - 요청 전 로깅
 * - 인증 토큰 추가 (향후 구현)
 */
apiClient.interceptors.request.use(
  (config) => {
    // 개발 환경에서만 로깅
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * - 응답 전 로깅
 * - 에러 처리
 */
apiClient.interceptors.response.use(
  (response) => {
    // 개발 환경에서만 로깅
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    // 에러 로깅
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      console.error('[API Error]', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // 요청은 보냈지만 응답이 없음
      console.error('[API Error] No response received', error.message);
    } else {
      // 요청 설정 중 에러
      console.error('[API Error]', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * API 에러 타입
 */
export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

/**
 * Axios 에러를 ApiError로 변환
 */
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }
  
  return {
    message: '알 수 없는 오류가 발생했습니다.',
  };
}

export default apiClient;
