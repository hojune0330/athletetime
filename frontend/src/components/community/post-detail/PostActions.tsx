import {
  HandThumbDownIcon,
  HandThumbUpIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { showPostToast } from './postDetailPresentation';

type PostActionsProps = {
  readonly likesCount: number | null;
  readonly dislikesCount: number | null;
  readonly myVote?: 'like' | 'dislike' | null;
  readonly onVote: (type: 'like' | 'dislike') => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly isVoting: boolean;
  readonly countsVisible: boolean;
  readonly showManagementActions: boolean;
};

export function PostActions({
  likesCount,
  dislikesCount,
  myVote,
  onVote,
  onEdit,
  onDelete,
  isVoting,
  countsVisible,
  showManagementActions,
}: PostActionsProps) {
  const handleShare = async () => {
    const url = window.location.href;

    const copyLink = async () => {
      if (!navigator.clipboard?.writeText) {
        showPostToast('링크를 복사하지 못했어요. 주소창에서 직접 복사해 주세요.');
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        showPostToast('링크가 복사되었어요.');
      } catch {
        showPostToast('링크를 복사하지 못했어요. 주소창에서 직접 복사해 주세요.');
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        showPostToast('공유할 앱을 열었어요.');
        return;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copyLink();
  };

  const isLiked = myVote === 'like';
  const isDisliked = myVote === 'dislike';

  return (
    <div className="p-6 border-t border-neutral-100 bg-neutral-50">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onVote('like')}
            disabled={isVoting}
            className={`btn-secondary transition-all ${
              isLiked
                ? 'bg-primary-100 text-primary-600 border-primary-300'
                : 'hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
            }`}
          >
            <HandThumbUpIcon className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{isLiked ? '추천 취소' : '추천'}</span>
            {countsVisible && (
              <span className="font-bold text-primary-600">{likesCount}</span>
            )}
          </button>

          <button
            onClick={() => onVote('dislike')}
            disabled={isVoting}
            className={`btn-secondary transition-all ${
              isDisliked
                ? 'bg-danger-100 text-danger-600 border-danger-300'
                : 'hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200'
            }`}
          >
            <HandThumbDownIcon className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
            <span>{isDisliked ? '비추천 취소' : '비추천'}</span>
            {countsVisible && dislikesCount !== null && dislikesCount > 0 && (
              <span className="font-bold text-danger-500">{dislikesCount}</span>
            )}
          </button>

          {!countsVisible && (
            <span className="px-2 text-xs font-medium text-neutral-500">추천 수 집계 중</span>
          )}

          <button onClick={handleShare} className="btn-secondary hover:bg-neutral-100">
            <ShareIcon className="w-5 h-5" />
            <span className="hidden sm:inline">공유</span>
          </button>
        </div>

        {showManagementActions && (
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="btn-ghost text-primary-500 hover:bg-primary-50">
              <PencilSquareIcon className="w-5 h-5" />
              <span>수정</span>
            </button>
            <button onClick={onDelete} className="btn-ghost text-danger-500 hover:bg-danger-50">
              <TrashIcon className="w-5 h-5" />
              <span>삭제</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
