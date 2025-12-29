import React from 'react';
import { type RoomId, CHAT_ROOMS } from '../types';

interface RoomSidebarProps {
  currentRoom: RoomId;
  onRoomChange: (room: RoomId) => void;
  isVisible?: boolean;
  onClose?: () => void;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  currentRoom,
  onRoomChange,
  isVisible = true,
  onClose,
}) => {
  const handleRoomClick = (roomId: RoomId) => {
    onRoomChange(roomId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`
        w-[260px] bg-[#1e1e1e] flex flex-col border-r border-[#2a2a2a]
        md:relative md:bottom-auto md:translate-y-0 md:h-full md:max-h-none
        fixed bottom-0 left-0 right-0 z-[100] rounded-t-[20px] max-h-[70vh]
        transition-all duration-300 room-sidebar
        ${isVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}
    >
      {/* Header */}
      <div className="p-5 bg-[#161616] border-b border-[#2a2a2a]">
        <h2 className="text-white text-lg font-semibold">채팅방 목록</h2>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {CHAT_ROOMS.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => handleRoomClick(room.id)}
            className={`
              w-full p-3 mb-1 rounded-lg cursor-pointer transition-all duration-200
              flex items-center gap-2.5 text-left
              ${currentRoom === room.id
                ? 'bg-[#00ffa3] text-black font-semibold'
                : 'text-[#b0b0b0] hover:bg-[rgba(0,255,163,0.1)] hover:text-white'
              }
            `}
          >
            <span className="w-5 h-5 flex items-center justify-center">{room.icon}</span>
            <span>{room.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
