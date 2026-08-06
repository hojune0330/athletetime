import React from 'react';
import { CHAT_ROOMS } from '../types';

interface RoomSidebarProps {
  currentRoom: string;
  isVisible?: boolean;
  onClose?: () => void;
}

const COMMUNITY_RULES: string[] = [
  '특정인 저격·비방 금지',
  '개인정보(실명·소속·연락처) 노출 금지',
  '신고 3회 누적 시 자동 블라인드',
  '홍보·도배 금지',
];

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  currentRoom,
  isVisible = true,
  onClose,
}) => {
  const handleOverlayClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* 모바일 오버레이 - 목록 영역 외 터치 시 닫기 */}
      {isVisible && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[39] transition-opacity duration-300"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      <div
        className={`
          bg-[#1e1e1e] flex flex-col border-r border-[#2a2a2a]
          md:relative md:bottom-auto md:translate-y-0 md:w-full md:h-full md:rounded-none md:max-h-none md:z-0
          fixed bottom-0 left-0 right-0 z-[40] rounded-t-[20px] max-h-[70vh] w-full
          transition-all duration-300
          ${isVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}
      >
        {/* Header */}
        <div className="p-5 bg-[#161616] border-b border-[#2a2a2a]">
          <h2 className="text-white text-lg font-semibold">자유수다</h2>
        </div>

        {/* 단일 상시방 */}
        <div className="flex-1 overflow-y-auto p-2.5">
          {CHAT_ROOMS.map((room) => (
            <div
              key={room.id}
              className={`
                w-full p-3 mb-1 rounded-lg
                flex items-center gap-2.5 text-left
                ${currentRoom === room.id
                  ? 'bg-[#00ffa3] text-black font-semibold'
                  : 'text-[#b0b0b0]'
                }
              `}
            >
              <span className="w-5 h-5 flex items-center justify-center">{room.icon}</span>
              <span>{room.name}</span>
              <span className="ml-auto text-[10px] font-normal opacity-70">상시</span>
            </div>
          ))}

          {/* 커뮤니티 규칙 안내 */}
          <div className="mt-4 p-3.5 rounded-lg bg-[#161616] border border-[#2a2a2a]">
            <p className="text-white text-sm font-semibold mb-2">커뮤니티 규칙</p>
            <ul className="text-[#b0b0b0] text-xs leading-relaxed space-y-1.5">
              {COMMUNITY_RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-1.5">
                  <span className="text-[#00ffa3]">•</span>
                  {rule}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-[#8a8a8a] leading-relaxed">
              메시지를 길게 누르면 신고할 수 있어요.
              신고가 누적되면 메시지가 자동으로 블라인드돼요.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
