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

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      {/* Nickname Modal */}
      <NicknameModal
        isOpen={!isJoined}
        nickname={nickname}
        onNicknameChange={setNickname}
        onJoin={handleJoin}
      />

      {/* Main Chat Container */}
      {isJoined && (
        <div className="chat-page-container">
          {/* Room Sidebar - Desktop */}
          <div className="hidden md:flex">
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

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <ChatHeader
              currentRoom={currentRoom}
              userCount={userCount}
              isConnected={isConnected}
            />

            {/* Messages */}
            <MessageList
              messages={messages}
              currentUserId={userId}
              currentNickname={nickname}
            />

            {/* Input */}
            <MessageInput
              onSendMessage={sendMessage}
              disabled={!isConnected}
            />
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
