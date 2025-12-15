import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex gap-2.5 items-center bg-gray-100 rounded-3xl px-4 py-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          maxLength={500}
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-sm text-[#1e1e1e] py-2 placeholder:text-gray-400"
          style={{ fontSize: '16px' }} // iOS 확대 방지
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center transition-all
            ${disabled || !message.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[#00ffa3] text-black hover:scale-110 hover:bg-[#00e694]'
            }
          `}
        >
          <i className="fas fa-paper-plane text-sm" />
        </button>
      </div>
    </div>
  );
};
