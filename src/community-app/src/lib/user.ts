const STORAGE_KEY = 'athletetime:anonymousUserId'

function createUserId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `anon-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

export function getAnonymousUserId() {
  if (typeof window === 'undefined') {
    return 'server-user'
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) {
      return existing
    }

    const next = createUserId()
    window.localStorage.setItem(STORAGE_KEY, next)
    return next
  } catch (error) {
    console.warn('Failed to read/write anonymous user ID:', error)
    return 'fallback-user'
  }
}
