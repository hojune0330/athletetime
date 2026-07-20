import {
  ChatBubbleLeftIcon,
  EyeIcon,
  HandThumbUpIcon,
} from '@heroicons/react/24/outline';
import { formatPostDate } from './postDetailPresentation';

type PostHeaderProps = {
  readonly title: string;
  readonly author: string;
  readonly createdAt: string;
  readonly categoryName: string;
  readonly categoryIcon: string;
  readonly categoryColor: string;
  readonly isNotice: boolean;
  readonly views: number;
  readonly likesCount: number | null;
  readonly commentsCount: number;
  readonly countsVisible: boolean;
};

export function PostHeader({
  title,
  author,
  createdAt,
  categoryName,
  categoryIcon,
  categoryColor,
  isNotice,
  views,
  likesCount,
  commentsCount,
  countsVisible,
}: PostHeaderProps) {
  return (
    <div className="p-6 border-b border-neutral-100">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="badge bg-neutral-100" style={{ color: categoryColor }}>
          <span>{categoryIcon}</span>
          <span className="ml-1">{categoryName}</span>
        </span>
        {isNotice && (
          <span className="badge bg-warning-100 text-warning-600">📌 공지</span>
        )}
        <span className="text-neutral-300">·</span>
        <span className="text-xs text-neutral-500">{formatPostDate(createdAt)}</span>
      </div>

      <h1 className="text-2xl font-bold text-neutral-900 mb-4">{title}</h1>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-sm">
            {author[0]}
          </div>
          <span className="text-sm font-medium text-neutral-900">{author}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            <span>{views}</span>
          </span>
          <span className="flex items-center gap-1 text-primary-600">
            <HandThumbUpIcon className="w-4 h-4" />
            <span>{countsVisible ? likesCount : '집계 중'}</span>
          </span>
          <span className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-4 h-4" />
            <span>{commentsCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
