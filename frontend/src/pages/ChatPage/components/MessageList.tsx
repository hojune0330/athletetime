import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

export const BLINDED_TEXT = '신고 누적으로 블라인드된 게시물입니다.';

const REPORT_REASONS = ['저격·비방', '개인정보 노출', '음란·불쾌', '도배·광고', '기타'];

export interface MessageListProps {
  messages: (ChatMessage | { type: 'system'; text: string })[];
  currentUserId: string;
  currentNickname: string;
  onReport?: (messageId: string, reasonCode: string, detail?: string) => Promise<boolean> | boolean;
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
  onReport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  // 새 메시지 시 스크롤
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
      }, 100);
    }
  }, [messages]);

  // 신고 모달 열 때 롱프레스 타이머 정리
  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const isSystemMessage = (msg: ChatMessage | { type: 'system'; text: string }): msg is { type: 'system'; text: string } => {
    return 'type' in msg && msg.type === 'system';
  };

  const isOwnMessage = (msg: ChatMessage): boolean => {
    return msg.userId === currentUserId || msg.nickname === currentNickname;
  };

  const startLongPress = (msg: ChatMessage) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setReportTarget(msg);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    cancelLongPress();
    setReportTarget(msg);
  };

  const submitReport = async (reasonCode: string) => {
    if (!reportTarget || !onReport) return;
    const messageId = String(reportTarget.id || '');
    if (!messageId) {
      setReportFeedback('신고할 수 없는 메시지예요.');
      return;
    }
    const result = await onReport(messageId, reasonCode);
    setReportFeedback(result ? '신고가 접수되었어요. 감사해요.' : '이미 신고했거나 처리 중 오류가 났어요.');
    setReportTarget(null);
    setTimeout(() => setReportFeedback(null), 3000);
  };

  const closeReport = () => {
    setReportTarget(null);
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto p-5 bg-gray-50 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-gray-300"
    >
      {messages.map((msg, index) => {
        if (isSystemMessage(msg)) {
          return (
            <div
              key={`system-${index}`}
              className="text-center text-gray-500 text-xs py-2 my-2 animate-pulse"
            >
              {msg.text}
            </div>
          );
        }

        const isOwn = isOwnMessage(msg);
        const isBlinded = !!msg.isBlinded;
        const displayText = isBlinded ? BLINDED_TEXT : msg.text;

        return (
          <div
            key={`msg-${index}`}
            className={`
              flex items-start gap-2 max-w-[70%] md:max-w-[70%] max-w-[85%]
              animate-fadeIn
              ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}
            `}
            onContextMenu={(e) => handleContextMenu(e, msg)}
            onPointerDown={() => !isOwn && startLongPress(msg)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            title="길게 누르면 신고할 수 있어요"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{
                background: isBlinded
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
              }}
            >
              {isBlinded ? '🔒' : msg.nickname.charAt(0).toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1 min-w-0">
              {/* Author (not for own messages) */}
              {!isOwn && (
                <div className={`text-xs px-2 ${isBlinded ? 'text-gray-400' : 'text-gray-600'}`}>
                  {msg.nickname}
                </div>
              )}

              {/* Bubble */}
              <div
                className={`
                  px-3.5 py-2.5 rounded-[18px] text-sm leading-relaxed break-words
                  ${isBlinded
                    ? 'bg-gray-200 text-gray-500 italic'
                    : isOwn
                      ? 'bg-[#00ffa3] text-black rounded-br-[4px]'
                      : 'bg-white text-[#1e1e1e] border border-gray-200 rounded-bl-[4px]'
                  }
                `}
              >
                {displayText}
              </div>

              {/* Time */}
              <div className={`text-[11px] text-gray-500 px-2 ${isOwn ? 'text-right' : ''}`}>
                {isBlinded ? '블라인드됨' : formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        );
      })}

      {/* 신고 피드백 토스트 */}
      {reportFeedback && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-[#1e1e1e] text-white text-xs px-4 py-2.5 rounded-full shadow-lg animate-fadeIn">
          {reportFeedback}
        </div>
      )}

      {/* 신고 모달 */}
      {reportTarget && (
        <div
          className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/50 p-5 animate-fadeIn"
          onClick={closeReport}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[400px] overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800">메시지 신고</h3>
              <p className="text-xs text-gray-500 mt-1">
                {reportTarget.nickname}님의 메시지 — 신고 사유를 선택해 주세요. <br />
                신고 3회 누적 시 자동 블라인드돼요.
              </p>
            </div>
            <div className="p-3">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => submitReport(reason)}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-[#00ffa3]/10 hover:text-black transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="p-4 pt-0 border-t border-gray-100">
              <button
                type="button"
                onClick={closeReport}
                className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
