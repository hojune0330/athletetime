import { useState } from 'react';

const DELETE_REASONS = [
  { value: 'spam', label: '스팸/광고' },
  { value: 'abuse', label: '욕설/비방' },
  { value: 'illegal', label: '불법 콘텐츠' },
  { value: 'duplicate', label: '중복 게시글' },
  { value: 'inappropriate', label: '부적절한 내용' },
  { value: 'other', label: '기타' },
] as const;

type AdminDeleteModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (deleteReason: string) => void;
  readonly isDeleting: boolean;
};

export function AdminDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: AdminDeleteModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const reason = selectedReason === 'other' ? customReason.trim() : selectedReason;
    if (reason) onConfirm(reason);
  };
  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };
  const isValid = selectedReason && (selectedReason !== 'other' || customReason.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-xl font-bold text-neutral-900">관리자 삭제</h3>
          </div>
          <p className="text-neutral-500 mb-4 text-sm">
            삭제 사유를 선택해주세요. 삭제 기록이 저장됩니다.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="space-y-2 mb-4">
              {DELETE_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason.value
                      ? 'border-danger-300 bg-danger-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(event) => setSelectedReason(event.target.value)}
                    className="w-4 h-4 text-danger-600"
                    disabled={isDeleting}
                  />
                  <span className="text-sm text-neutral-700">{reason.label}</span>
                </label>
              ))}
            </div>

            {selectedReason === 'other' && (
              <input
                type="text"
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                placeholder="삭제 사유를 입력하세요"
                className="input mb-4"
                disabled={isDeleting}
                autoFocus
              />
            )}

            <div className="flex gap-2">
              <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={isDeleting}>
                취소
              </button>
              <button type="submit" disabled={isDeleting || !isValid} className="btn-danger flex-1">
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : '삭제'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
