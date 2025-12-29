import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';

interface MessageListProps {
  messages: (ChatMessage | { type: 'system'; text: string })[];
  currentUserId: string;
  currentNickname: string;
}

const formatTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  currentNickname,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 새 메시지 시 스크롤
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
      }, 100);
    }
  }, [messages]);

  const isSystemMessage = (msg: ChatMessage | { type: 'system'; text: string }): msg is { type: 'system'; text: string } => {
    return 'type' in msg && msg.type === 'system';
  };

  const isOwnMessage = (msg: ChatMessage): boolean => {
    return msg.userId === currentUserId || msg.nickname === currentNickname;
  };

  return (
    <div
      ref={containerRef}
      className="message-list flex-1 overflow-y-auto p-5 bg-gray-50 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-gray-300"
    >
      {messages.map((msg, index) => {
        if (isSystemMessage(msg)) {
          return (
            <div
              key={`system-${index}`}
              className="text-center text-gray-500 text-xs py-2 my-2"
            >
              {msg.text}
            </div>
          );
        }

        const isOwn = isOwnMessage(msg);

        return (
          <div
            key={`msg-${index}`}
            className={`
              flex items-start gap-2 max-w-[70%] md:max-w-[70%] max-w-[85%]
              animate-fadeIn
              ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}
            `}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
              }}
            >
              {msg.nickname.charAt(0).toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1">
              {/* Author (not for own messages) */}
              {!isOwn && (
                <div className="text-xs text-gray-600 px-2">
                  {msg.nickname}
                </div>
              )}

              {/* Bubble */}
              <div
                className={`
                  px-3.5 py-2.5 rounded-[18px] text-sm leading-relaxed break-words
                  ${isOwn
                    ? 'bg-[#00ffa3] text-black rounded-br-[4px]'
                    : 'bg-white text-[#1e1e1e] border border-gray-200 rounded-bl-[4px]'
                  }
                `}
              >
                {msg.text}
              </div>

              {/* Time */}
              <div className={`text-[11px] text-gray-500 px-2 ${isOwn ? 'text-right' : ''}`}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
