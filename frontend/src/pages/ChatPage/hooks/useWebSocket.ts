import { useState, useEffect, useCallback, useRef } from 'react';
import type { RoomId, ChatMessage, WebSocketMessage } from '../types';

// WebSocket URL 결정 순서:
// 1) VITE_WS_URL 환경변수 (스테이징/특수 환경 오버라이드)
// 2) 같은 origin의 /ws/chat (통합 서버 기본 — 프론트와 API가 같은 서버)
function resolveWsUrl(): string {
  const override = import.meta.env.VITE_WS_URL;
  if (override) return override;
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/chat`;
  }
  return 'wss://athletetime-backend.onrender.com/ws/chat';
}
const WS_URL = resolveWsUrl();

interface UseWebSocketOptions {
  nickname: string;
  userId: string;
  onMessage?: (message: ChatMessage) => void;
  onSystemMessage?: (text: string) => void;
  onHistory?: (messages: ChatMessage[]) => void;
  onUserCountChange?: (count: number) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  currentRoom: RoomId;
  joinRoom: (room: RoomId) => void;
  sendMessage: (text: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket({
  nickname,
  userId,
  onMessage,
  onSystemMessage,
  onHistory,
  onUserCountChange,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentRoom, setCurrentRoom] = useState<RoomId>('main');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // ref로 최신 값 유지 (콜백 재생성 방지)
  const nicknameRef = useRef(nickname);
  const userIdRef = useRef(userId);
  const currentRoomRef = useRef(currentRoom);
  const callbacksRef = useRef({ onMessage, onSystemMessage, onHistory, onUserCountChange });
  
  // ref 값 업데이트
  useEffect(() => {
    nicknameRef.current = nickname;
    userIdRef.current = userId;
  }, [nickname, userId]);
  
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);
  
  useEffect(() => {
    callbacksRef.current = { onMessage, onSystemMessage, onHistory, onUserCountChange };
  }, [onMessage, onSystemMessage, onHistory, onUserCountChange]);

  const handleMessage = useCallback((data: WebSocketMessage) => {
    const { onMessage, onSystemMessage, onHistory, onUserCountChange } = callbacksRef.current;
    
    switch (data.type) {
      case 'history':
        if (data.messages && onHistory) {
          const messages: ChatMessage[] = data.messages.map(msg => ({
            nickname: msg.nickname,
            text: msg.message,
            timestamp: msg.created_at,
            userId: msg.user_id,
          }));
          onHistory(messages);
        }
        break;

      case 'message':
        if (data.data && onMessage) {
          onMessage(data.data);
        }
        break;

      case 'system':
        if (data.text && onSystemMessage) {
          onSystemMessage(data.text);
        }
        break;

      case 'userCount':
        if (data.count !== undefined && onUserCountChange) {
          onUserCountChange(data.count);
        }
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (!nicknameRef.current) return;
    
    // 이미 연결된 상태면 무시
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('⚠️ WebSocket 이미 연결됨/연결중, 중복 연결 방지');
      return;
    }

    setConnectionStatus('connecting');
    console.log('🔄 WebSocket 연결 시도 중...', WS_URL);

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket 연결됨');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // 연결 후 현재 방에 입장
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'join',
            room: currentRoomRef.current,
            nickname: nicknameRef.current,
            userId: userIdRef.current,
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('메시지 파싱 오류:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
        setConnectionStatus('disconnected');
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket 연결 종료', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // 자동 재연결 (최대 시도 횟수 제한)
        if (reconnectAttempts.current < maxReconnectAttempts && nicknameRef.current) {
          reconnectAttempts.current++;
          const delay = Math.min(3000 * reconnectAttempts.current, 15000); // 최대 15초
          console.log(`🔄 ${delay/1000}초 후 재연결 시도... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('❌ 최대 재연결 시도 횟수 초과');
          callbacksRef.current.onSystemMessage?.('서버 연결에 실패했습니다. 페이지를 새로고침 해주세요.');
        }
      };
    } catch (error) {
      console.error('WebSocket 연결 오류:', error);
      setConnectionStatus('disconnected');
    }
  }, [handleMessage]); // 의존성 최소화

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const joinRoom = useCallback((room: RoomId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join',
        room,
        nickname: nicknameRef.current,
        userId: userIdRef.current,
      }));
      setCurrentRoom(room);
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && text.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text: text.trim(),
        nickname: nicknameRef.current,
        userId: userIdRef.current,
      }));
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    currentRoom,
    joinRoom,
    sendMessage,
    connect,
    disconnect,
  };
}
