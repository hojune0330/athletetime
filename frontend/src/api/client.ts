import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const CSRF_COOKIE_NAME = 'athletetime_csrf'
const UNSAFE_HTTP_METHODS = new Set(['post', 'put', 'patch', 'delete'])
const retriedAuthRequests = new WeakSet<InternalAxiosRequestConfig>()

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function isUnsafeMethod(method: string | undefined): boolean {
  return UNSAFE_HTTP_METHODS.has((method || 'get').toLowerCase())
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const prefix = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

let csrfPromise: Promise<string | null> | null = null

async function fetchCsrfToken(): Promise<string | null> {
  const response = await axios.get<{ csrfToken?: string }>(
    `${API_BASE_URL}/api/auth/csrf-token`,
    { timeout: 30000, withCredentials: true }
  )

  return response.data.csrfToken || null
}

async function getCsrfToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE_NAME)
  if (existing) {
    return existing
  }

  if (!csrfPromise) {
    csrfPromise = fetchCsrfToken().finally(() => {
      csrfPromise = null
    })
  }

  return csrfPromise
}

function setHeader(config: InternalAxiosRequestConfig, name: string, value: string): void {
  config.headers.set(name, value)
}

apiClient.interceptors.request.use(
  async (config) => {
    if (isUnsafeMethod(config.method) && !String(config.url || '').includes('/api/auth/csrf-token')) {
      const csrfToken = await getCsrfToken()
      if (csrfToken) {
        setHeader(config, 'X-CSRF-Token', csrfToken)
      }
    }

    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type')
    }

    return config
  },
  (error: unknown) => {
    console.error('API request error:', error)
    return Promise.reject(error)
  }
)

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function runRefresh(): Promise<boolean> {
  try {
    const csrfToken = await getCsrfToken()
    const response = await axios.post<{ success?: boolean }>(
      `${API_BASE_URL}/api/auth/refresh`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        timeout: 30000,
        withCredentials: true,
      }
    )

    return Boolean(response.data?.success)
  } catch (error: unknown) {
    if (error instanceof Error && import.meta.env.DEV) {
      console.warn('Session refresh failed:', error.message)
    }
    return false
  }
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/csrf-token')
  )
}

async function handleUnauthorized(original: InternalAxiosRequestConfig): Promise<boolean> {
  retriedAuthRequests.add(original)

  if (!isRefreshing) {
    isRefreshing = true
    refreshPromise = runRefresh().finally(() => {
      isRefreshing = false
    })
  }

  return refreshPromise || false
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config
    const status = error.response?.status
    const url = original?.url || ''

    if (
      status === 401 &&
      original &&
      !retriedAuthRequests.has(original) &&
      !isAuthEndpoint(url)
    ) {
      const refreshed = await handleUnauthorized(original)
      if (refreshed) {
        return apiClient(original)
      }
    }

    if (error.response) {
      console.error(`API response error [${error.response.status}] ${error.config?.url}:`, error.response.data)
    } else if (error.request) {
      console.error('API response missing:', error.config?.url)
    } else {
      console.error('API request setup error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default apiClient
