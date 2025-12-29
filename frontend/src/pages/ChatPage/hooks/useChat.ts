import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, RoomId } from '../types';
import { useWebSocket } from './useWebSocket';
import { apiClient } from '../../../api/client';

// sessionStorage 키
const STORAGE_KEYS = {
  NICKNAME: 'chat_nickname',
  USER_ID: 'chat_user_id',
};

// sessionStorage에서 저장된 값 불러오기
const getSavedNickname = (): string => {
  return sessionStorage.getItem(STORAGE_KEYS.NICKNAME) || '';
};

const getSavedUserId = (): string => {
  const saved = sessionStorage.getItem(STORAGE_KEYS.USER_ID);
  if (saved) return saved;
  
  const newUserId = 'user_' + Date.now();
  sessionStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
  return newUserId;
};

export interface UseChatReturn {
  // State
  nickname: string;
  isJoined: boolean;
  messages: (ChatMessage | { type: 'system'; text: string })[];
  userCount: number;
  currentRoom: RoomId;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  isCheckingNickname: boolean;
  nicknameError: string | null;
  
  // Actions
  setNickname: (value: string) => void;
  joinChat: () => Promise<boolean>;
  sendMessage: (text: string) => void;
  changeRoom: (room: RoomId) => void;
  checkNickname: (nickname: string) => Promise<{ available: boolean; message: string }>;
}

export function useChat(): UseChatReturn {
  // sessionStorage에서 닉네임과 userId 불러오기
  const [nickname, setNicknameState] = useState(getSavedNickname);
  const [isJoined, setIsJoined] = useState(() => !!getSavedNickname());
  const [messages, setMessages] = useState<(ChatMessage | { type: 'system'; text: string })[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [userId] = useState(getSavedUserId);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  
  // 닉네임 설정 시 에러 초기화
  const setNickname = useCallback((value: string) => {
    setNicknameState(value);
    setNicknameError(null);
  }, []);
  
  // 닉네임 중복 체크 API
  const checkNickname = useCallback(async (nicknameToCheck: string): Promise<{ available: boolean; message: string }> => {
    try {
      const response = await apiClient.get('/api/chat/check-nickname', {
        params: { nickname: nicknameToCheck }
      });
      return {
        available: response.data.available,
        message: response.data.message
      };
    } catch (error: any) {
      const message = error.response?.data?.error || '닉네임 확인 중 오류가 발생했습니다.';
      return { available: false, message };
    }
  }, []);

  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const handleSystemMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { type: 'system', text }]);
  }, []);

  const handleHistory = useCallback((historyMessages: ChatMessage[]) => {
    setMessages(historyMessages);
  }, []);

  const handleUserCountChange = useCallback((count: number) => {
    setUserCount(count);
  }, []);

  const {
    isConnected,
    connectionStatus,
    currentRoom,
    joinRoom,
    sendMessage: wsSendMessage,
    connect,
  } = useWebSocket({
    nickname,
    userId,
    onMessage: handleMessage,
    onSystemMessage: handleSystemMessage,
    onHistory: handleHistory,
    onUserCountChange: handleUserCountChange,
  });

  const joinChat = useCallback(async (): Promise<boolean> => {
    const trimmedNickname = nickname.trim();
    
    if (trimmedNickname.length < 2 || trimmedNickname.length > 10) {
      setNicknameError('닉네임은 2~10자 사이여야 합니다.');
      return false;
    }
    
    // 닉네임 중복 체크
    setIsCheckingNickname(true);
    setNicknameError(null);
    
    try {
      const result = await checkNickname(trimmedNickname);
      
      if (!result.available) {
        setNicknameError(result.message);
        return false;
      }
      
      // sessionStorage에 닉네임 저장
      sessionStorage.setItem(STORAGE_KEYS.NICKNAME, trimmedNickname);
      setIsJoined(true);
      return true;
    } catch {
      setNicknameError('닉네임 확인 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsCheckingNickname(false);
    }
  }, [nickname, checkNickname]);

  // 입장 후 WebSocket 연결
  useEffect(() => {
    if (isJoined && nickname) {
      connect();
    }
  }, [isJoined, nickname, connect]);

  const changeRoom = useCallback((room: RoomId) => {
    if (room !== currentRoom) {
      setMessages([]); // 메시지 초기화
      joinRoom(room);
    }
  }, [currentRoom, joinRoom]);

  return {
    nickname,
    isJoined,
    messages,
    userCount,
    currentRoom,
    isConnected,
    connectionStatus,
    isCheckingNickname,
    nicknameError,
    setNickname,
    joinChat,
    sendMessage: wsSendMessage,
    changeRoom,
    checkNickname,
  };
}
