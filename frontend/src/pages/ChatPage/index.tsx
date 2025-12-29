import React, { useState, useMemo } from 'react';
import {
  NicknameModal,
  RoomSidebar,
  ChatHeader,
  MessageList,
  MessageInput,
  MobileMenuButton,
} from './components';
import { useChat } from './hooks/useChat';
import './styles/chat.css';

const ChatPage: React.FC = () => {
  const {
    nickname,
    isJoined,
    messages,
    userCount,
    currentRoom,
    isConnected,
    connectionStatus,
    setNickname,
    joinChat,
    sendMessage,
    changeRoom,
  } = useChat();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // userId는 한 번만 생성
  const userId = useMemo(() => 'user_' + Date.now(), []);

  const handleJoin = () => {
    return joinChat();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleRoomChange = (room: typeof currentRoom) => {
    changeRoom(room);
    setIsMobileMenuOpen(false);
  };

  // 채팅 페이지 높이 계산: 뷰포트 높이 - 헤더(약 64px) - Layout 패딩(py-6 = 48px) - 여유공간
  // calc(100vh - 헤더 - 상단패딩 - 하단패딩)
  return (
    <div className="bg-gray-100 overflow-hidden -mx-4 -mt-6 -mb-6" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Nickname Modal */}
      <NicknameModal
        isOpen={!isJoined}
        nickname={nickname}
        onNicknameChange={setNickname}
        onJoin={handleJoin}
      />

      {/* Main Chat Container */}
      {isJoined && (
        <div className="h-full flex max-w-[1400px] mx-auto bg-white">
          {/* Room Sidebar - Desktop: fixed height, no scroll with page */}
          <div className="hidden md:block w-[260px] h-full flex-shrink-0">
            <RoomSidebar
              currentRoom={currentRoom}
              onRoomChange={handleRoomChange}
              isVisible={true}
            />
          </div>

          {/* Room Sidebar - Mobile */}
          <div className="md:hidden">
            <RoomSidebar
              currentRoom={currentRoom}
              onRoomChange={handleRoomChange}
              isVisible={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>

          {/* Chat Area - flex column with fixed header/input */}
          <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
            {/* Header - fixed at top */}
            <div className="flex-shrink-0">
              <ChatHeader
                currentRoom={currentRoom}
                userCount={userCount}
                isConnected={isConnected}
                connectionStatus={connectionStatus}
              />
            </div>

            {/* Messages - scrollable middle section */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageList
                messages={messages}
                currentUserId={userId}
                currentNickname={nickname}
              />
            </div>

            {/* Input - fixed at bottom */}
            <div className="flex-shrink-0">
              <MessageInput
                onSendMessage={sendMessage}
                disabled={!isConnected}
              />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <MobileMenuButton
            onClick={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>
      )}
    </div>
  );
};

export default ChatPage;
