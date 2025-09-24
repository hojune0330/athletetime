// 사용자 세션 관리
import type { UserSession } from './providers'

// JWT 토큰 생성 (간단한 버전, 실제로는 더 안전한 라이브러리 사용)
export const createSessionToken = (user: Omit<UserSession, 'id'>): string => {
  const sessionData = {
    ...user,
    id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일
  }
  
  // 실제로는 JWT 라이브러리 사용, 지금은 Base64 인코딩
  return btoa(JSON.stringify(sessionData))
}

// 세션 토큰 검증
export const verifySessionToken = (token: string): UserSession | null => {
  try {
    const sessionData = JSON.parse(atob(token))
    
    // 만료 체크
    if (new Date(sessionData.expiresAt) < new Date()) {
      return null
    }
    
    return sessionData as UserSession
  } catch (error) {
    return null
  }
}

// 익명 사용자 세션 생성
export const createAnonymousSession = (): string => {
  const anonymousUser = {
    email: '',
    name: `익명${Math.floor(Math.random() * 10000)}`,
    provider: 'anonymous',
    isAnonymous: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
  
  return createSessionToken(anonymousUser)
}

// 클라이언트 사이드 세션 관리
export const SessionManager = {
  // 세션 저장
  setSession: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('athletetime_session', token)
    }
  },
  
  // 세션 가져오기
  getSession: (): UserSession | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('athletetime_session')
      if (token) {
        return verifySessionToken(token)
      }
    }
    return null
  },
  
  // 세션 제거 (로그아웃)
  clearSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('athletetime_session')
    }
  },
  
  // 로그인 체크
  isLoggedIn: (): boolean => {
    return SessionManager.getSession() !== null
  }
}