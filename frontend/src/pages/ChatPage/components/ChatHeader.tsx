import React from 'react';
import { type RoomId, CHAT_ROOMS } from '../types';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ChatHeaderProps {
  currentRoom: RoomId;
  userCount: number;
  isConnected: boolean;
  connectionStatus?: ConnectionStatus;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentRoom,
  userCount,
  isConnected,
  connectionStatus = isConnected ? 'connected' : 'disconnected',
  onMenuToggle,
  isMenuOpen = false,
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
      
      {/* 모바일 채팅방 전환 버튼 */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="md:hidden py-2 px-4 bg-[#00ffa3] text-black rounded-lg text-sm font-medium hover:bg-[#00e694] transition-colors flex items-center gap-2"
        aria-label={isMenuOpen ? '메뉴 닫기' : '채팅방 목록'}
      >
        <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-list'}`} />
        채팅방
      </button>
    </div>
  );
};
