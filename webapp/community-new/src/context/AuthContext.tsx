/**
 * 인증 Context
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 토큰 관리
  const getAccessToken = () => localStorage.getItem('accessToken');
  const getRefreshToken = () => localStorage.getItem('refreshToken');
  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // 사용자 정보 불러오기
  const fetchUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      setUser(response.user);
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
      clearTokens();
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
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      navigate('/');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '로그인에 실패했습니다');
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await authApi.logout(refreshToken || undefined);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      clearTokens();
      setUser(null);
      navigate('/login');
    }
  };

  // 회원가입
  const register = async (data: authApi.RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '회원가입에 실패했습니다');
    }
  };

  // 이메일 인증
  const verifyEmail = async (email: string, code: string) => {
    try {
      const response = await authApi.verifyEmail({ email, code });
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      navigate('/');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '이메일 인증에 실패했습니다');
    }
  };

  // 프로필 수정
  const updateProfile = async (data: authApi.UpdateProfileRequest) => {
    try {
      await authApi.updateProfile(data);
      await fetchUser(); // 사용자 정보 새로고침
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '프로필 수정에 실패했습니다');
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
    isAuthenticated: !!user
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
