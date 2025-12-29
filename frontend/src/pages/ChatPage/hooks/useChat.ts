import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, RoomId } from '../types';
import { useWebSocket } from './useWebSocket';

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
  
  // Actions
  setNickname: (value: string) => void;
  joinChat: () => boolean;
  sendMessage: (text: string) => void;
  changeRoom: (room: RoomId) => void;
}

export function useChat(): UseChatReturn {
  // sessionStorage에서 닉네임과 userId 불러오기
  const [nickname, setNicknameState] = useState(getSavedNickname);
  const [isJoined, setIsJoined] = useState(() => !!getSavedNickname());
  const [messages, setMessages] = useState<(ChatMessage | { type: 'system'; text: string })[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [userId] = useState(getSavedUserId);
  
  // 닉네임 설정 시 sessionStorage에도 저장
  const setNickname = useCallback((value: string) => {
    setNicknameState(value);
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

  const joinChat = useCallback(() => {
    const trimmedNickname = nickname.trim();
    
    if (trimmedNickname.length < 2 || trimmedNickname.length > 10) {
      return false;
    }
    
    // sessionStorage에 닉네임 저장
    sessionStorage.setItem(STORAGE_KEYS.NICKNAME, trimmedNickname);
    setIsJoined(true);
    return true;
  }, [nickname]);

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
    setNickname,
    joinChat,
    sendMessage: wsSendMessage,
    changeRoom,
  };
}
