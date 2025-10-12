import type { ApiError } from '../types'

const DEFAULT_API_BASE = 'https://athletetime-backend.onrender.com/community'

const API_BASE_URL = (import.meta.env.VITE_COMMUNITY_API_URL as string | undefined)?.trim()

const baseUrl = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL : DEFAULT_API_BASE

const isAbsoluteUrl = /^(?:[a-z]+:)?\/\//i

function resolveUrl(path: string) {
  if (isAbsoluteUrl.test(path)) {
    return path
  }

  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.replace(/^\//, '')
  return `${normalizedBase}/${normalizedPath}`
}

async function parseJson(response: Response) {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    console.warn('Failed to parse JSON response', error)
    return null
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const headers = new Headers(init?.headers ?? {})
    const body = init?.body

    if (!(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(resolveUrl(path), {
      credentials: 'include',
      ...init,
      headers,
      signal: controller.signal,
    })

    const payload = await parseJson(response)

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message: (payload && typeof payload.message === 'string' && payload.message.length > 0)
          ? payload.message
          : '알 수 없는 오류가 발생했습니다.',
        details: payload?.details ?? undefined,
      }
      throw error
    }

    return payload as T
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw {
        status: 408,
        message: '요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.',
      } satisfies ApiError
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}
