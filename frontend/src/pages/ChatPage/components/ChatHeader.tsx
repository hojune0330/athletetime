import React from 'react';
import { Link } from 'react-router-dom';
import type { RoomId, CHAT_ROOMS } from '../types';

interface ChatHeaderProps {
  currentRoom: RoomId;
  userCount: number;
  isConnected: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentRoom,
  userCount,
  isConnected,
}) => {
  const roomName = CHAT_ROOMS.find(r => r.id === currentRoom)?.name || '채팅방';

  return (
    <div className="h-[60px] bg-white border-b border-gray-200 px-5 flex items-center justify-between">
      <div className="text-base font-semibold text-[#1e1e1e] flex items-center gap-2">
        {/* Online Indicator */}
        <span
          className={`
            w-2 h-2 rounded-full
            ${isConnected ? 'bg-[#00ff88] animate-pulse' : 'bg-gray-400'}
          `}
        />
        <span>{roomName}</span>
        <span className="text-gray-500 text-sm">
          ({userCount}명 접속중)
        </span>
      </div>
      
      <Link
        to="/"
        className="py-2 px-4 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
      >
        <i className="fas fa-home mr-1" />
        홈으로
      </Link>
    </div>
  );
};
