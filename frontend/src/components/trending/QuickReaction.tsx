/**
 * QuickReaction - 빠른 이모지 리액션 바
 * 
 * 게시글, 기록, 댓글에 부착하여 빠르게 감정 표현
 * 숏폼 UX: 탭 한 번으로 반응 완료
 */

import { useState } from 'react';
import { addReaction } from '../../api/trending';
import { getAnonymousId } from '../../utils/anonymousUser';

interface QuickReactionProps {
  targetId: string | number;
  targetType: 'post' | 'record' | 'comment';
  initialReactions?: Record<string, number>;
  compact?: boolean;
}

const QUICK_EMOJIS = [
  { key: 'fire', icon: '🔥' },
  { key: 'clap', icon: '👏' },
  { key: 'heart', icon: '❤️' },
  { key: 'shock', icon: '😱' },
  { key: 'laugh', icon: '😂' },
  { key: 'sad', icon: '😢' },
];

export default function QuickReaction({ targetId, targetType, initialReactions = {}, compact = false }: QuickReactionProps) {
  const [reactions, setReactions] = useState<Record<string, number>>(initialReactions);
  const [reacted, setReacted] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleReact = async (emoji: string) => {
    if (reacted === emoji) return; // 이미 같은 이모지 선택
    
    // 즉시 UI 업데이트 (낙관적 업데이트)
    setReactions(prev => {
      const next = { ...prev };
      // 이전 리액션 취소
      if (reacted && next[reacted]) next[reacted] -= 1;
      // 새 리액션 추가
      next[emoji] = (next[emoji] || 0) + 1;
      return next;
    });
    setReacted(emoji);

    // API 호출
    try {
      await addReaction(targetId, targetType, emoji, getAnonymousId());
    } catch { /* ignore */ }
  };

  const totalReactions = Object.values(reactions).reduce((s, v) => s + v, 0);
  const visibleEmojis = showAll ? QUICK_EMOJIS : QUICK_EMOJIS.slice(0, compact ? 3 : 5);

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'flex-wrap'}`}>
      {visibleEmojis.map(e => {
        const count = reactions[e.key] || 0;
        const isActive = reacted === e.key;
        
        return (
          <button
            key={e.key}
            onClick={() => handleReact(e.key)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all active:scale-90 ${
              isActive
                ? 'bg-primary-100 border border-primary-300 scale-105'
                : 'bg-neutral-100 border border-transparent hover:bg-neutral-200 hover:scale-105'
            }`}
            title={e.icon}
          >
            <span className={compact ? 'text-xs' : 'text-sm'}>{e.icon}</span>
            {count > 0 && (
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary-600' : 'text-neutral-500'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}

      {!showAll && QUICK_EMOJIS.length > visibleEmojis.length && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[10px] text-neutral-400 hover:text-neutral-600 px-1"
        >
          +{QUICK_EMOJIS.length - visibleEmojis.length}
        </button>
      )}

      {totalReactions > 0 && !compact && (
        <span className="text-[10px] text-neutral-400 ml-1">{totalReactions}</span>
      )}
    </div>
  );
}
