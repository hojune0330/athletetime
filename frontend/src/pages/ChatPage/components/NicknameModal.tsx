import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BusySpinner } from '@/components/ui/loading-state';

const RULES_AGREED_KEY = 'chat_rules_agreed';

// H-1c 랜덤 닉네임: {수식어} {육상명사} {2자리수}
const ADJECTIVES = [
  '질주하는', '역주하는', '막판스퍼트', '빠른', '날렵한',
  '폭발적인', '침착한', '끈질긴', '자유로운', '따뜻한',
  '도전하는', '숨가쁜', '가벼운', '강한', '꾸준한',
  '승부사', '호흡이 긴', '출발선의', '결승선의', '바람과 함께',
];

const NOUNS = [
  '치타', '가젤', '영양', '스타트', '스퍼트', '바통', '트랙',
  '질주', '단거리', '장거리', '허들', '피니시', '랩', '러너',
  '슬릭', '프로펠러', '닻', '부스터', '코어', '스트라이드',
];

const RULES: string[] = [
  '특정인 저격·비방 금지 (선수·지도자·학부모 모두)',
  '개인정보(실명·소속·연락처) 노출 금지',
  '익명은 보호 장치이지 면책이 아님 — 위반 시 제재',
  '신고 3회 누적 시 자동 블라인드, 운영자 검토 후 조치',
  '홍보·도배 금지',
];

export function isRulesAgreed(): boolean {
  try {
    return localStorage.getItem(RULES_AGREED_KEY) === '1';
  } catch {
    return false;
  }
}

export function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${adj} ${noun} ${num}`;
}

interface NicknameModalProps {
  isOpen: boolean;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onJoin: () => Promise<boolean>;
  isCheckingNickname?: boolean;
  nicknameError?: string | null;
}

export const NicknameModal: React.FC<NicknameModalProps> = ({
  isOpen,
  nickname,
  onNicknameChange,
  onJoin,
  isCheckingNickname = false,
  nicknameError = null,
}) => {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // 최초 마운트 시 랜덤 닉네임 자동 부여 (리롤은 클릭 시에만)
  const initialNickname = useMemo(() => nickname || generateRandomNickname(), [nickname]);
  const [rolledNickname, setRolledNickname] = useState(initialNickname);
  const [hasRolled, setHasRolled] = useState(false);

  const currentNickname = hasRolled ? rolledNickname : initialNickname;

  // 초기 자동 부여 닉네임을 부모(useChat)에 동기화 — joinChat이 올바른 닉네임으로 입장
  useEffect(() => {
    if (isOpen && !hasRolled && initialNickname) {
      onNicknameChange(initialNickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasRolled, initialNickname]);

  useEffect(() => {
    if (hasRolled && rolledNickname) {
      onNicknameChange(rolledNickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRolled, rolledNickname]);

  const handleReroll = () => {
    const next = generateRandomNickname();
    setRolledNickname(next);
    setHasRolled(true);
    onNicknameChange(next);
  };

  const handleJoin = async () => {
    if (!agreed) return;
    setIsJoining(true);
    try {
      try {
        localStorage.setItem(RULES_AGREED_KEY, '1');
      } catch {
        // localStorage 불가 환경은 통과
      }
      await onJoin();
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isJoining && !isCheckingNickname && agreed) {
      handleJoin();
    }
  };

  const isLoading = isJoining || isCheckingNickname;
  const canJoin = agreed && !isLoading;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <span>💬</span>
            자유수다에 오신 걸 환영해요
          </h2>
        </div>

        {/* Body */}
        <div className="p-6" onKeyPress={handleKeyPress}>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            완전 익명으로 이야기할 수 있는 공간이에요.
            랜덤 닉네임이 자동으로 정해져요 — 입장 전에는 몇 번이든 바꿀 수 있어요.
          </p>

          {/* 랜덤 닉네임 카드 */}
          <div className="bg-[#f7f7f7] border border-gray-200 rounded-2xl p-6 text-center mb-5 select-none">
            <div className="text-[11px] text-gray-400 mb-2 font-medium tracking-wide">
              내 닉네임
            </div>
            <div className="text-xl font-bold text-[#1e1e1e]" role="status" aria-live="polite">
              {currentNickname}
            </div>

            <button
              type="button"
              onClick={handleReroll}
              disabled={isLoading}
              className="mt-4 px-4 py-2.5 bg-[#00ffa3] text-black rounded-xl text-sm font-semibold hover:bg-[#00e694] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <span role="img" aria-label="주사위">🎲</span>
              다른 이름
            </button>
            <p className="mt-2 text-[11px] text-gray-400">
              입장 후에는 변경할 수 없어요
            </p>
          </div>

          {/* 닉네임 에러 (중복 등) */}
          {nicknameError && (
            <p className="mb-4 text-sm text-red-500 flex items-center gap-1">
              <span>⚠️</span> {nicknameError}
            </p>
          )}

          {/* 규칙 동의 — H-1b 5개 조항 */}
          <div className="bg-gray-50 p-4 rounded-xl mt-1">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              커뮤니티 규칙 (진입 전 동의 필요)
            </p>
            <ol className="text-xs text-gray-600 leading-relaxed space-y-1.5 list-decimal pl-4">
              {RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>

            <label className="flex items-start gap-2 mt-4 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 accent-[#00b389] w-4 h-4"
              />
              <span>위 규칙을 확인했고 동의해요</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex gap-3 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!canJoin}
            className="flex-1 py-3 px-5 bg-[#00ffa3] text-black rounded-lg text-sm font-semibold hover:bg-[#00e694] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <BusySpinner className="border-ink/80 border-t-transparent" />
                확인 중...
              </>
            ) : (
              '입장하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
