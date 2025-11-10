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
