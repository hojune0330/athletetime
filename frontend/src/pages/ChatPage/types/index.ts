// 채팅 관련 타입 정의

export type RoomId = 'main';

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
  isBlinded?: boolean;
}

export interface SystemMessage {
  type: 'system';
  text: string;
}

export interface WebSocketMessage {
  type: 'join' | 'message' | 'history' | 'system' | 'userCount' | 'error' | 'blind';
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
    is_blinded?: boolean;
  }>;
  count?: number;
  today?: number;
  code?: string;
  message?: string;
  messageId?: string;
}

export const CHAT_ROOMS: ChatRoom[] = [
  { id: 'main', name: '자유수다', icon: '💬' },
];
