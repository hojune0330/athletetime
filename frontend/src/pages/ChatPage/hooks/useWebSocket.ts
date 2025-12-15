import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomId, ChatMessage, WebSocketMessage } from '../types';

const WS_URL = 'wss://athlete-time-backend.onrender.com/ws';

interface UseWebSocketOptions {
  nickname: string;
  userId: string;
  onMessage?: (message: ChatMessage) => void;
  onSystemMessage?: (text: string) => void;
  onHistory?: (messages: ChatMessage[]) => void;
  onUserCountChange?: (count: number) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
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
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<RoomId>('main');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!nickname) return;

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket 연결됨');
        setIsConnected(true);
        
        // 연결 후 현재 방에 입장
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'join',
            room: currentRoom,
            nickname,
            userId,
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
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket 연결 종료');
        setIsConnected(false);
        
        // 자동 재연결
        reconnectTimeoutRef.current = setTimeout(() => {
          if (nickname) {
            connect();
          }
        }, 3000);
      };
    } catch (error) {
      console.error('WebSocket 연결 오류:', error);
    }
  }, [nickname, userId, currentRoom]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((data: WebSocketMessage) => {
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
  }, [onMessage, onSystemMessage, onHistory, onUserCountChange]);

  const joinRoom = useCallback((room: RoomId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join',
        room,
        nickname,
        userId,
      }));
      setCurrentRoom(room);
    }
  }, [nickname, userId]);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && text.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text: text.trim(),
        nickname,
        userId,
      }));
    }
  }, [nickname, userId]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    currentRoom,
    joinRoom,
    sendMessage,
    connect,
    disconnect,
  };
}
