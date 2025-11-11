// OAuth 소셜 로그인 공급자 설정
export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  clientId: string;
  authUrl: string;
  scopes: string[];
}

// 환경변수에서 클라이언트 ID 가져오기 (실제 운영시 설정)
const getClientId = (provider: string): string => {
  // 개발환경에서는 더미 값, 실제로는 환경변수 사용
  const clientIds: Record<string, string> = {
    google: process.env.GOOGLE_CLIENT_ID || 'demo-google-client-id',
    apple: process.env.APPLE_CLIENT_ID || 'demo-apple-client-id', 
    kakao: process.env.KAKAO_CLIENT_ID || 'demo-kakao-client-id',
    naver: process.env.NAVER_CLIENT_ID || 'demo-naver-client-id'
  }
  return clientIds[provider] || 'demo-client-id'
}

export const oauthProviders: OAuthProvider[] = [
  {
    id: 'google',
    name: '구글로 계속하기',
    icon: 'fab fa-google',
    color: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    clientId: getClientId('google'),
    authUrl: 'https://accounts.google.com/oauth/authorize',
    scopes: ['openid', 'email', 'profile']
  },
  {
    id: 'apple',
    name: 'Apple로 계속하기', 
    icon: 'fab fa-apple',
    color: 'bg-black text-white hover:bg-gray-800',
    clientId: getClientId('apple'),
    authUrl: 'https://appleid.apple.com/auth/authorize',
    scopes: ['name', 'email']
  },
  {
    id: 'kakao',
    name: '카카오로 계속하기',
    icon: 'fas fa-comment',
    color: 'bg-yellow-400 text-black hover:bg-yellow-500',
    clientId: getClientId('kakao'),
    authUrl: 'https://kauth.kakao.com/oauth/authorize',
    scopes: ['profile_nickname', 'account_email']
  },
  {
    id: 'naver',
    name: '네이버로 계속하기',
    icon: 'fas fa-n',
    color: 'bg-green-500 text-white hover:bg-green-600',
    clientId: getClientId('naver'),
    authUrl: 'https://nid.naver.com/oauth2.0/authorize',
    scopes: ['name', 'email', 'profile_image']
  }
]

// OAuth URL 생성 함수
export const generateOAuthUrl = (provider: OAuthProvider, redirectUri: string): string => {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state: `auth_${provider.id}_${Date.now()}` // CSRF 보호
  })

  return `${provider.authUrl}?${params.toString()}`
}

// 사용자 세션 타입
export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  isAnonymous: boolean;
  createdAt: string;
  lastLoginAt: string;
}