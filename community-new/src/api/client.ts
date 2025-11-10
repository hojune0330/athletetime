<<<<<<< HEAD
import axios from 'axios'

const DEFAULT_BACKEND_URL = 'https://athletetime-backend.onrender.com'

const baseURL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL)
  ? import.meta.env.VITE_BACKEND_URL
  : DEFAULT_BACKEND_URL

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('[API ERROR]', error.response.status, error.response.data)
      
      // 네트워크 오류 처리
      if (error.response.status === 0) {
        console.error('[NETWORK ERROR] Cannot connect to backend server')
      }
      // 인증 오류
      else if (error.response.status === 401) {
        console.warn('[AUTH ERROR] Unauthorized access')
      }
      // 서버 오류
      else if (error.response.status >= 500) {
        console.error('[SERVER ERROR] Backend server error')
      }
    } else if (error.request) {
      console.error('[NETWORK ERROR] No response from server:', error.message)
    } else {
      console.error('[REQUEST ERROR] Request setup error:', error.message)
    }
    return Promise.reject(error)
  }
)
=======
/**
 * API 클라이언트 (v4.0.0)
 * 
 * Axios 기반 HTTP 클라이언트
 */

import axios from 'axios';
import type { AxiosError } from 'axios';

// 환경 변수에서 API URL 가져오기
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

console.log('🌐 API Base URL:', API_BASE_URL);

/**
 * Axios 인스턴스 생성
 */
export const apiClient = axios.create({
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
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
