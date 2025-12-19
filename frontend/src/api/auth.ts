/**
 * 인증 API (v4.2.0)
 * 
 * 회원가입, 로그인, 이메일 인증 관련 API
 */

import { apiClient } from './client';

// ============================================
// 타입 정의
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    nickname: string;
    username: string;
    emailVerified: boolean;
    isAdmin: boolean;
  };
  requiresVerification?: boolean;
  error?: string;
}

export interface SendVerificationRequest {
  email: string;
}

export interface SendVerificationResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    nickname: string;
  };
  error?: string;
}

export interface CheckNicknameResponse {
  success: boolean;
  available: boolean;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    nickname: string;
    username: string;
    emailVerified: boolean;
    isAdmin: boolean;
  };
  error?: string;
}

// ============================================
// 이메일 인증 코드 발송
// ============================================

export async function sendVerificationCode(email: string): Promise<SendVerificationResponse> {
  try {
    // send-verification API가 이메일 중복 체크도 함께 수행함
    const response = await apiClient.post<SendVerificationResponse>(
      '/api/auth/send-verification',
      { email }
    );
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '인증 코드 발송에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 이메일 인증 코드 확인 (회원가입 전)
// ============================================

export async function verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
  try {
    const response = await apiClient.post<VerifyEmailResponse>(
      '/api/auth/verify-code',
      { email, code }
    );
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '인증 코드 확인에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 닉네임 중복 확인
// ============================================

export async function checkNickname(nickname: string): Promise<CheckNicknameResponse> {
  try {
    const response = await apiClient.post<CheckNicknameResponse>(
      '/api/auth/check-nickname',
      { nickname }
    );
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '닉네임 확인에 실패했습니다';
    return {
      success: false,
      available: false,
      error: errorMessage
    };
  }
}

// ============================================
// 회원가입
// ============================================

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  try {
    const response = await apiClient.post<RegisterResponse>(
      '/api/auth/register',
      data
    );
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '회원가입에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 로그인
// ============================================

export async function login(data: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<LoginResponse>(
      '/api/auth/login',
      data
    );
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '로그인에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 인증 코드 재발송
// ============================================

export async function resendVerificationCode(email: string): Promise<SendVerificationResponse> {
  try {
    const response = await apiClient.post<SendVerificationResponse>(
      '/api/auth/resend-code',
      { email }
    );
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '인증 코드 재발송에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 내 정보 조회
// ============================================

export interface GetMeResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    nickname: string;
    username: string;
    emailVerified: boolean;
    isAdmin: boolean;
  };
  error?: string;
}

export async function getMe(): Promise<GetMeResponse> {
  const response = await apiClient.get<GetMeResponse>('/api/auth/me');
  return response.data;
}

// ============================================
// 로그아웃
// ============================================

export async function logout(refreshToken?: string): Promise<void> {
  await apiClient.post('/api/auth/logout', { refreshToken });
}

// ============================================
// 프로필 수정
// ============================================

export interface UpdateProfileRequest {
  nickname?: string;
  password?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: {
    nickname: string;
  };
  error?: string;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  try {
    const response = await apiClient.put<UpdateProfileResponse>(
      '/api/auth/profile',
      data
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '프로필 수정에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 비밀번호 찾기 (인증 코드 발송)
// ============================================

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  try {
    const response = await apiClient.post<ForgotPasswordResponse>(
      '/api/auth/forgot-password',
      { email }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '인증 코드 발송에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 비밀번호 재설정 인증 코드 확인
// ============================================

export interface VerifyResetCodeResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function verifyResetCode(email: string, code: string): Promise<VerifyResetCodeResponse> {
  try {
    const response = await apiClient.post<VerifyResetCodeResponse>(
      '/api/auth/verify-reset-code',
      { email, code }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '인증 코드 확인에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}

// ============================================
// 새 비밀번호 설정
// ============================================

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<ResetPasswordResponse> {
  try {
    const response = await apiClient.post<ResetPasswordResponse>(
      '/api/auth/reset-password',
      { email, code, newPassword }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '비밀번호 재설정에 실패했습니다';
    return {
      success: false,
      message: '',
      error: errorMessage
    };
  }
}
