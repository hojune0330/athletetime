/**
 * TrendPulse - 실시간 트렌딩 토픽 바
 * 
 * 커뮤니티에서 화제인 주제를 한눈에 보여주고
 * 클릭하면 관련 검색으로 이동하는 숏폼 스타일 컴포넌트
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowTrendingUpIcon, FireIcon } from '@heroicons/react/24/outline';
import { getTrendingTopics } from '../../api/trending';
import type { TrendingTopic } from '../../api/trending';

const TREND_ICONS: Record<string, string> = {
  up: '🔥',
  down: '📉',
  stable: '➡️',
};

const CATEGORY_LINKS: Record<string, string> = {
  event: '/competitions',
  record: '/records',
  training: '/community',
  gear: '/marketplace',
  health: '/community',
};

export default function TrendPulse() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getTrendingTopics(8);
        setTopics(res.topics);
      } catch {
        // 무시 - 트렌딩은 선택적 기능
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || topics.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-accent-50 to-accent-100 border-b border-neutral-100 flex items-center gap-2">
        <FireIcon className="w-4 h-4 text-accent-500" />
        <span className="text-xs font-bold text-accent-700">실시간 트렌드</span>
        <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-accent-400" />
        <span className="ml-auto text-[10px] text-neutral-400">지금 육상인들이 말하는</span>
      </div>
      <div className="px-3 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
        {topics.map((topic, i) => (
          <Link
            key={topic.tag}
            to={`${CATEGORY_LINKS[topic.category] || '/community'}?q=${encodeURIComponent(topic.tag)}`}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
              i === 0
                ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-sm'
                : i < 3
                ? 'bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <span className="text-[10px]">{TREND_ICONS[topic.trend]}</span>
            <span>#{topic.tag}</span>
            <span className={`text-[10px] ${i === 0 ? 'text-accent-100' : 'text-neutral-400'}`}>
              {topic.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
