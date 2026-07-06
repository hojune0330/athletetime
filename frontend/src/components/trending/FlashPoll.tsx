/**
 * FlashPoll - 빠른 플래시 설문
 * 
 * 24시간 한정 빠른 투표 - 숏폼 스타일로 사용자 반응을 빠르게 수집
 * 결과를 실시간으로 보여줘서 트렌드 파악
 */

import { useState, useEffect } from 'react';
import { BoltIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { getFlashPolls, voteFlashPoll } from '../../api/trending';
import type { FlashPoll as FlashPollType } from '../../api/trending';
import { getAnonymousId } from '../../utils/anonymousUser';

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '종료됨';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

function PollCard({ poll: initialPoll }: { poll: FlashPollType }) {
  const [poll, setPoll] = useState(initialPoll);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // 이미 투표했는지 확인
  useEffect(() => {
    const visitorId = getAnonymousId();
    if (poll.voters.includes(visitorId)) {
      setHasVoted(true);
    }
  }, [poll.voters]);

  const handleVote = async (optionId: number) => {
    if (hasVoted || voting) return;
    setVoting(true);
    setSelectedOption(optionId);

    try {
      const visitorId = getAnonymousId();
      const res = await voteFlashPoll(poll.id, optionId, visitorId);
      setPoll(res.poll);
      setHasVoted(true);
    } catch {
      // 이미 투표한 경우도 결과 표시
      setHasVoted(true);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl border border-primary-100 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BoltIcon className="w-4 h-4" />
          <span className="text-xs font-bold">플래시 투표</span>
        </div>
        <span className="text-[10px] text-primary-100">{getTimeRemaining(poll.expiresAt)}</span>
      </div>

      <div className="p-4">
        {/* 질문 */}
        <h4 className="text-sm font-bold text-neutral-900 mb-3 leading-snug">
          {poll.question}
        </h4>

        {/* 선택지 */}
        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = poll.totalVotes > 0
              ? Math.round((option.votes / poll.totalVotes) * 100)
              : 0;

            if (hasVoted) {
              // 투표 후 - 결과 표시
              return (
                <div key={option.id} className="relative overflow-hidden rounded-xl border border-primary-100 bg-white">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary-100/60 transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex items-center justify-between p-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {selectedOption === option.id && (
                        <span className="text-primary-600 text-xs">✓</span>
                      )}
                      <span className="text-xs font-medium text-neutral-700">{option.text}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400">{option.votes}</span>
                      <span className="text-xs font-bold text-primary-600">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            }

            // 투표 전 - 선택 버튼
            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={voting}
                className="w-full p-2.5 px-3 text-left rounded-xl border border-primary-100 bg-white hover:border-primary-300 hover:bg-primary-50/50 transition-all text-xs font-medium text-neutral-700 active:scale-[0.98] disabled:opacity-50"
              >
                {option.text}
              </button>
            );
          })}
        </div>

        {/* 총 참여자 */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <ChartBarIcon className="w-3 h-3" />
            {poll.totalVotes}명 참여
          </span>
          {hasVoted && (
            <span className="text-primary-500 font-medium">✓ 투표 완료</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlashPollSection() {
  const [polls, setPolls] = useState<FlashPollType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getFlashPolls();
        setPolls(res.polls);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading || polls.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BoltIcon className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-bold text-neutral-900">플래시 투표</h3>
        <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-[10px] font-bold rounded-full">24H</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {polls.map(poll => (
          <PollCard key={poll.id} poll={poll} />
        ))}
      </div>
    </div>
  );
}
