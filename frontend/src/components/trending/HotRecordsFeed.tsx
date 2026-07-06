/**
 * HotRecordsFeed - 숏폼 스타일 HOT 기록 카드
 * 
 * 틱톡/릴스처럼 빠르게 소비할 수 있는 카드형 기록 피드
 * 가로 스크롤 + 이모지 리액션 지원
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHotRecords, addReaction } from '../../api/trending';
import type { HotRecord } from '../../api/trending';
import { getAnonymousId } from '../../utils/anonymousUser';

const EMOJI_OPTIONS = [
  { key: 'fire', icon: '🔥', label: '불타오르네' },
  { key: 'clap', icon: '👏', label: '대단해' },
  { key: 'medal', icon: '💎', label: '레전드' },
  { key: 'shock', icon: '😱', label: '대박' },
  { key: 'heart', icon: '❤️', label: '응원해' },
];

function RecordCard({ record, onReact }: { record: HotRecord; onReact: (id: number, emoji: string) => void }) {
  const [showReactions, setShowReactions] = useState(false);
  const [localEmoji, setLocalEmoji] = useState(record.emoji || {});
  const [reacted, setReacted] = useState<string | null>(null);

  const totalReactions = Object.values(localEmoji).reduce((s, v) => s + v, 0);

  const handleReact = async (emoji: string) => {
    if (reacted) return;
    setReacted(emoji);
    setLocalEmoji(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setShowReactions(false);
    onReact(record.id, emoji);
  };

  return (
    <div className="flex-shrink-0 w-64 sm:w-72 bg-white rounded-2xl overflow-hidden shadow-card border border-neutral-200 relative group hover:shadow-card-hover transition-shadow">
      {/* 상단 배지 */}
      <div className="absolute top-3 left-3 z-10">
        <span className="px-2 py-1 bg-danger-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1">
          HOT
        </span>
      </div>

      {/* 카드 본문 */}
      <div className="p-5 pt-10">
        {/* 종목 */}
        <div className="text-xs text-neutral-400 mb-1">{record.competition}</div>
        <div className="text-sm font-medium text-neutral-600 mb-3">{record.event}</div>

        {/* 기록 (대형) */}
        <div className="text-4xl font-black tracking-tight mb-2 text-neutral-900" style={{ fontFeatureSettings: '"tnum" on' }}>
          {record.record}
        </div>

        {/* 선수 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
            {record.athlete[0]}
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900">{record.athlete}</div>
            <div className="text-[10px] text-neutral-400">{record.date}</div>
          </div>
        </div>

        {/* 리액션 바 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.slice(0, 3).map(e => (
              <button
                key={e.key}
                onClick={() => handleReact(e.key)}
                disabled={!!reacted}
                className={`px-2 py-1 rounded-full text-xs transition-all ${
                  reacted === e.key
                    ? 'bg-primary-100 scale-110'
                    : 'bg-neutral-100 hover:bg-neutral-200 hover:scale-105 active:scale-95'
                } ${reacted && reacted !== e.key ? 'opacity-50' : ''}`}
              >
                <span>{e.icon}</span>
                <span className="ml-1 text-[10px] text-neutral-600">{localEmoji[e.key] || 0}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowReactions(!showReactions)}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            +{EMOJI_OPTIONS.length - 3}
          </button>
        </div>

        {/* 확장 리액션 */}
        {showReactions && (
          <div className="mt-2 flex gap-1 animate-fadeIn">
            {EMOJI_OPTIONS.slice(3).map(e => (
              <button
                key={e.key}
                onClick={() => handleReact(e.key)}
                disabled={!!reacted}
                className="px-2 py-1 rounded-full text-xs bg-neutral-100 hover:bg-neutral-200 transition-all hover:scale-105"
              >
                <span>{e.icon}</span>
                <span className="ml-1 text-[10px] text-neutral-600">{localEmoji[e.key] || 0}</span>
              </button>
            ))}
          </div>
        )}

        {/* 총 반응 수 + 링크 */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400">{totalReactions}명이 반응</span>
          <Link
            to={`/records?q=${encodeURIComponent(record.athlete)}`}
            className="text-[10px] text-primary-600 hover:text-primary-700 font-medium"
          >
            기록 더보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HotRecordsFeed() {
  const [records, setRecords] = useState<HotRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getHotRecords(6);
        setRecords(res.records);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleReact = async (recordId: number, emoji: string) => {
    try {
      await addReaction(recordId, 'record', emoji, getAnonymousId());
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-64 h-52 bg-neutral-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (records.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <h3 className="text-lg font-bold text-neutral-900">HOT 기록</h3>
          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">LIVE</span>
        </div>
        <Link to="/competitions?tab=results" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
          전체보기 →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {records.map(record => (
          <div key={record.id} className="snap-start">
            <RecordCard record={record} onReact={handleReact} />
          </div>
        ))}
      </div>
    </div>
  );
}
