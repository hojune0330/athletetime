import React from 'react';
import { Link } from 'react-router-dom';
import { type RoomId, CHAT_ROOMS } from '../types';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ChatHeaderProps {
  currentRoom: RoomId;
  userCount: number;
  isConnected: boolean;
  connectionStatus?: ConnectionStatus;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentRoom,
  userCount,
  isConnected,
  connectionStatus = isConnected ? 'connected' : 'disconnected',
}) => {
  const roomName = CHAT_ROOMS.find(r => r.id === currentRoom)?.name || '채팅방';

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { color: 'bg-green-500', text: `${userCount}명 접속중`, animate: 'animate-pulse' };
      case 'connecting':
        return { color: 'bg-yellow-500', text: '연결 중...', animate: 'animate-ping' };
      case 'disconnected':
        return { color: 'bg-red-500', text: '연결 끊김', animate: '' };
    }
  };

  const status = getStatusInfo();

  return (
    <div className="h-[60px] bg-white border-b border-gray-200 px-5 flex items-center justify-between">
      <div className="text-base font-semibold text-[#1e1e1e] flex items-center gap-2">
        {/* Connection Status Indicator */}
        <span className="relative flex h-3 w-3">
          {status.animate && (
            <span className={`absolute inline-flex h-full w-full rounded-full ${status.color} opacity-75 ${status.animate}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${status.color}`}></span>
        </span>
        <span>{roomName}</span>
        <span className={`text-sm ${connectionStatus === 'connected' ? 'text-gray-500' : 'text-red-500'}`}>
          ({status.text})
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
