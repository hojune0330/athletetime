/**
 * 인증 Context
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';

interface User {
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
  stats?: {
    totalPosts: number;
    totalComments: number;
    totalLikesReceived: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: authApi.RegisterRequest) => Promise<authApi.RegisterResponse>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  updateProfile: (data: authApi.UpdateProfileRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  /** C: 페이지 이동 없이 로그인 모달을 띄운다. redirectTo 지정 시 로그인 성공 후 그곳으로 이동(A). */
  promptLogin: (redirectTo?: string) => void;
  /** Header 모달이 구독하는 표시 상태 (C) */
  loginPromptOpen: boolean;
  /** 모달을 닫을 때 호출 */
  closeLoginPrompt: () => void;
  /** 로그인 성공 직후 호출 — 저장된 복귀 경로가 있으면 이동(A) */
  consumeRedirect: () => void;
}

/** A: 로그인 후 복귀 경로 저장 키 (새로고침/모달 전환에도 살아남도록 sessionStorage) */
const REDIRECT_KEY = 'redirectAfterLogin';
const SESSION_HINT_COOKIE_NAME = 'athletetime_csrf';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isHttpStatus(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status;
}

function hasCookie(name: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.cookie.split('; ').some((entry) => entry.startsWith(`${name}=`));
}

function toContextUser(apiUser: NonNullable<authApi.LoginResponse['user']>): User {
  return {
    ...apiUser,
    id: String(apiUser.id),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const navigate = useNavigate();

  // C: 보호 동작 시 페이지 이동 없이 로그인 모달을 띄운다.
  //    redirectTo가 있으면 로그인 성공 후 복귀하도록 sessionStorage에 저장(A).
  const promptLogin = (redirectTo?: string) => {
    if (redirectTo) {
      sessionStorage.setItem(REDIRECT_KEY, redirectTo);
    }
    setLoginPromptOpen(true);
  };

  const closeLoginPrompt = () => setLoginPromptOpen(false);

  // A: 로그인 성공 직후 저장된 복귀 경로로 이동. 없으면 아무것도 안 함(현 위치 유지).
  const consumeRedirect = () => {
    const target = sessionStorage.getItem(REDIRECT_KEY);
    if (target) {
      sessionStorage.removeItem(REDIRECT_KEY);
      navigate(target);
    }
  };

  // 사용자 정보 불러오기
  const fetchUser = async () => {
    if (!hasCookie(SESSION_HINT_COOKIE_NAME)) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      setUser(toContextUser(response.user));
    } catch (error) {
      if (!isHttpStatus(error, 401)) {
        console.error('사용자 정보 조회 실패:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchUser();
  }, []);

  // 로그인
  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      
      // 로그인 실패 처리 (authApi.login이 에러를 catch해서 {success:false}로 반환하는 경우)
      if (!response.success || !response.user) {
        throw new Error(response.error || '로그인에 실패했습니다');
      }
      
      setUser(toContextUser(response.user));
      setLoginPromptOpen(false);
      // A: 복귀 경로가 있으면 그곳으로, 없으면 홈으로.
      const target = sessionStorage.getItem(REDIRECT_KEY);
      if (target) {
        sessionStorage.removeItem(REDIRECT_KEY);
        navigate(target);
      } else {
        navigate('/');
      }
    } catch (error: unknown) {
      // authApi에서 throw된 에러 또는 위에서 직접 throw한 에러
      throw new Error(getErrorMessage(error, '로그인에 실패했습니다'));
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      setUser(null);
      // D: 로그아웃은 "그만 본다"가 아니라 "익명으로 계속 본다" — 홈으로.
      navigate('/');
    }
  };

  // 회원가입
  const register = async (data: authApi.RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      return response;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, '회원가입에 실패했습니다'));
    }
  };

  // 이메일 인증
  const verifyEmail = async (email: string, code: string) => {
    try {
      const response = await authApi.verifyEmail(email, code);
      if (!response.success) {
        throw new Error(response.error || '이메일 인증에 실패했습니다');
      }
      await fetchUser();
      navigate('/');
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, '이메일 인증에 실패했습니다'));
    }
  };

  // 프로필 수정
  const updateProfile = async (data: authApi.UpdateProfileRequest) => {
    try {
      await authApi.updateProfile(data);
      await fetchUser(); // 사용자 정보 새로고침
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, '프로필 수정에 실패했습니다'));
    }
  };

  // 사용자 정보 새로고침
  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    verifyEmail,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user,
    promptLogin,
    loginPromptOpen,
    closeLoginPrompt,
    consumeRedirect,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
