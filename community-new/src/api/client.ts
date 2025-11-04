/**
 * API 클라이언트 (v4.0.0)
 * 
 * Axios 기반 HTTP 클라이언트
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// 환경 변수에서 API URL 가져오기
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

console.log('🌐 API Base URL:', API_BASE_URL);

/**
 * Axios 인스턴스 생성
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30초
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CORS 쿠키 전송
});

/**
 * 요청 인터셉터
 */
apiClient.interceptors.request.use(
  (config) => {
    console.log(`📤 [${config.method?.toUpperCase()}] ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ 요청 에러:', error);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [${response.status}] ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // 서버가 응답을 반환한 경우
      console.error(`❌ [${error.response.status}] ${error.config?.url}:`, error.response.data);
    } else if (error.request) {
      // 요청은 전송되었으나 응답이 없는 경우
      console.error('❌ 응답 없음:', error.config?.url);
    } else {
      // 요청 설정 중 에러가 발생한 경우
      console.error('❌ 요청 설정 에러:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
