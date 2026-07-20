import { getAnonymousId } from '../../../utils/anonymousUser';
import type { Poll } from '../../../types';

type PollSectionProps = {
  readonly poll: Poll;
  readonly onVote: (optionId: number) => void;
  readonly isVoting: boolean;
  readonly hasVoted: boolean;
};

export function PollSection({ poll, onVote, isVoting, hasVoted }: PollSectionProps) {
  const visitorId = getAnonymousId();
  const userHasVoted = hasVoted || poll.voters.includes(visitorId);

  return (
    <div className="p-6 border-t border-neutral-100">
      <div className="bg-neutral-50 rounded-xl p-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          📊 {poll.question}
        </h3>

        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0
              ? Math.round((option.votes / poll.total_votes) * 100)
              : 0;

            return (
              <div key={option.id} className="relative">
                {userHasVoted ? (
                  <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary-100 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between p-3">
                      <span className="text-sm font-medium text-neutral-700">{option.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">{option.votes}표</span>
                        <span className="text-sm font-bold text-primary-600">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onVote(option.id)}
                    disabled={isVoting}
                    className="w-full p-3 text-left rounded-lg border border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm font-medium text-neutral-700">{option.text}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>총 {poll.total_votes}명 참여</span>
          {userHasVoted && (
            <span className="text-primary-600 font-medium">✓ 투표 완료</span>
          )}
        </div>
      </div>
    </div>
  );
}
