import { useState } from 'react';
import { useChat } from './hooks/useChat';
import { isRulesAgreed } from './components/NicknameModal';
import {
  NicknameModal,
  RoomSidebar,
  ChatHeader,
  MessageList,
  MessageInput,
  MobileMenuButton,
} from './components';
import './styles/chat.css';

/**
 * 오픈 채팅「자유수다」 — 단일 상시방(main), 완전 익명.
 * 입장 전 랜덤 닉네임 리롤 + 규칙 동의(localStorage 플래그) 후 입장.
 * 재방문 시 규칙 동의 상태면 닉네임 모달 없이 바로 입장.
 */
export default function ChatPage() {
  const {
    nickname,
    isJoined,
    messages,
    userCount,
    today,
    currentRoom,
    isConnected,
    connectionStatus,
    isCheckingNickname,
    nicknameError,
    setNickname,
    joinChat,
    sendMessage,
    reportMessage,
  } = useChat();

  const [rulesAgreed] = useState(isRulesAgreed);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="chat-page-container bg-white">
      {/* 데스크톱 사이드바 (md 이상) */}
      <div className="hidden md:block md:w-[280px] h-full">
        <RoomSidebar currentRoom={currentRoom} />
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <ChatHeader
          currentRoom={currentRoom}
          userCount={userCount}
          today={today}
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          onMenuToggle={() => setIsSidebarOpen(true)}
          isMenuOpen={isSidebarOpen}
        />

        <div className="flex-1 min-h-0 relative">
          <MessageList
            messages={messages}
            currentUserId={''}
            currentNickname={nickname}
            onReport={reportMessage}
          />

          {/* 빈 상태 */}
          {messages.length === 0 && isJoined && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-6">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  아직 메시지가 없어요.
                  <br />
                  첫 마디를 남겨보세요!
                </p>
              </div>
            </div>
          )}
        </div>

        <MessageInput onSendMessage={sendMessage} disabled={!isJoined} />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      <div className={`md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <RoomSidebar
          currentRoom={currentRoom}
          isVisible={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* 모바일 메뉴 버튼 */}
      {isJoined && (
        <MobileMenuButton
          onClick={() => setIsSidebarOpen(prev => !prev)}
          isMenuOpen={isSidebarOpen}
        />
      )}

      {/* 규칙 동의 후 입장 — 미동의 시에만 모달 (재방문 시 localStorage로 스킵) */}
      {!rulesAgreed && (
        <NicknameModal
          isOpen
          nickname={nickname}
          onNicknameChange={setNickname}
          onJoin={joinChat}
          isCheckingNickname={isCheckingNickname}
          nicknameError={nicknameError}
        />
      )}
    </div>
  );
}
