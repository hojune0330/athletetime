import { useState } from 'react';

type EditPasswordModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (password: string) => void;
  readonly isVerifying: boolean;
  readonly error?: string | null;
};

export function EditPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  isVerifying,
  error,
}: EditPasswordModalProps) {
  const [password, setPassword] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.trim()) onConfirm(password);
  };
  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">게시글 수정</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            게시글을 수정하려면 비밀번호를 입력하세요.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              className="input mb-4"
              disabled={isVerifying}
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={isVerifying}>
                취소
              </button>
              <button type="submit" disabled={isVerifying || !password.trim()} className="btn-primary flex-1">
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>확인 중...</span>
                  </>
                ) : '확인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type DeleteModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (password: string) => void;
  readonly isDeleting: boolean;
};

export function DeleteModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  const [password, setPassword] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.trim()) onConfirm(password);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">게시글 삭제</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            게시글을 삭제하려면 비밀번호를 입력하세요.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              className="input mb-4"
              disabled={isDeleting}
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isDeleting}>
                취소
              </button>
              <button type="submit" disabled={isDeleting || !password.trim()} className="btn-danger flex-1">
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
