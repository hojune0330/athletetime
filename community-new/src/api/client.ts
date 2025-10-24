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
    } else {
      console.error('[API ERROR]', error.message)
    }
    return Promise.reject(error)
  }
)
