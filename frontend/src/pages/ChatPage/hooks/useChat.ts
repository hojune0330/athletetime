import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, RoomId } from '../types';
import { useWebSocket } from './useWebSocket';

export interface UseChatReturn {
  // State
  nickname: string;
  isJoined: boolean;
  messages: (ChatMessage | { type: 'system'; text: string })[];
  userCount: number;
  currentRoom: RoomId;
  isConnected: boolean;
  
  // Actions
  setNickname: (value: string) => void;
  joinChat: () => boolean;
  sendMessage: (text: string) => void;
  changeRoom: (room: RoomId) => void;
}

export function useChat(): UseChatReturn {
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<(ChatMessage | { type: 'system'; text: string })[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [userId] = useState(() => 'user_' + Date.now());

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
    setNickname,
    joinChat,
    sendMessage: wsSendMessage,
    changeRoom,
  };
}
