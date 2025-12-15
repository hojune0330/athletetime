import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NicknameModalProps {
  isOpen: boolean;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onJoin: () => boolean;
}

export const NicknameModal: React.FC<NicknameModalProps> = ({
  isOpen,
  nickname,
  onNicknameChange,
  onJoin,
}) => {
  const navigate = useNavigate();

  const handleJoin = () => {
    if (nickname.trim().length < 2 || nickname.trim().length > 10) {
      alert('닉네임은 2자 이상 10자 이하로 입력해주세요.');
      return;
    }
    onJoin();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-[#00ffa3]">🏃</span>
            애슬리트 타임 채팅
          </h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            채팅방에 입장하기 위해 닉네임을 설정해주세요.
          </p>
          
          <div className="mb-5">
            <label htmlFor="nicknameInput" className="block mb-2 text-sm text-gray-600">
              닉네임
            </label>
            <input
              type="text"
              id="nicknameInput"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="닉네임을 입력하세요 (2-10자)"
              minLength={2}
              maxLength={10}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00ffa3] transition-colors"
              autoFocus
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              💡 채팅 이용 안내<br />
              • 바른말 고운말을 사용해주세요<br />
              • 개인정보 공유에 주의하세요<br />
              • 스팸이나 광고는 금지됩니다
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex gap-3 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleJoin}
            className="flex-1 py-3 px-5 bg-[#00ffa3] text-black rounded-lg text-sm font-semibold hover:bg-[#00e694] transition-colors"
          >
            입장하기
          </button>
        </div>
      </div>
    </div>
  );
};
