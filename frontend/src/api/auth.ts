/**
 * 인증 API 클라이언트
 */

import { apiClient } from './client';

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  specialty?: string;
  region?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    specialty?: string;
    region?: string;
    createdAt: string;
  };
  requiresVerification: boolean;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    username: string;
    emailVerified: boolean;
    isAdmin: boolean;
  };
}

export interface UserResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    nickname: string;
    username: string;
    specialty?: string;
    region?: string;
    profileImage?: string;
    instagram?: string;
    bio?: string;
    emailVerified: boolean;
    isAdmin: boolean;
    isActive: boolean;
    stats: {
      totalPosts: number;
      totalComments: number;
      totalLikesReceived: number;
    };
    createdAt: string;
    lastLoginAt?: string;
  };
}

export interface UpdateProfileRequest {
  nickname?: string;
  specialty?: string;
  region?: string;
  instagram?: string;
  bio?: string;
}

/**
 * 회원가입
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post('/api/auth/register', data);
  return response.data;
}

/**
 * 이메일 인증
 */
export async function verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
  const response = await apiClient.post('/api/auth/verify-email', data);
  return response.data;
}

/**
 * 인증 코드 재발송
 */
export async function resendCode(email: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/api/auth/resend-code', { email });
  return response.data;
}

/**
 * 로그인
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post('/api/auth/login', data);
  return response.data;
}

/**
 * 로그아웃
 */
export async function logout(refreshToken?: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/api/auth/logout', { refreshToken });
  return response.data;
}

/**
 * 내 정보 조회
 */
export async function getMe(): Promise<UserResponse> {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
}

/**
 * 프로필 수정
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<{ success: boolean; message: string; user: any }> {
  const response = await apiClient.put('/api/auth/profile', data);
  return response.data;
}
