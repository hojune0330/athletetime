// 채팅 관련 타입 정의

export type RoomId = 'main' | 'running' | 'free';

export interface ChatRoom {
  id: RoomId;
  name: string;
  icon: string;
}

export interface ChatMessage {
  id?: string;
  nickname: string;
  text: string;
  timestamp: string | Date;
  userId: string;
}

export interface SystemMessage {
  type: 'system';
  text: string;
}

export interface WebSocketMessage {
  type: 'join' | 'message' | 'history' | 'system' | 'userCount';
  room?: RoomId;
  nickname?: string;
  userId?: string;
  text?: string;
  data?: ChatMessage;
  messages?: Array<{
    nickname: string;
    message: string;
    created_at: string;
    user_id: string;
  }>;
  count?: number;
}

export const CHAT_ROOMS: ChatRoom[] = [
  { id: 'main', name: '메인 채팅방', icon: '🏠' },
  { id: 'running', name: '러닝 채팅방', icon: '🏃' },
  { id: 'free', name: '자유 채팅방', icon: '💬' },
];
