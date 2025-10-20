import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import type { CommentThread as CommentThreadModel } from '../../lib/types'
import { formatRelativeTime } from '../../lib/utils'

interface CommentThreadProps {
  comment: CommentThreadModel
  depth?: number
}

function CommentThread({ comment, depth = 0 }: CommentThreadProps) {
  return (
    <li className="space-y-3 rounded-xl bg-slate-50/80 p-4">
      <div className="flex items-center justify-between text-xs text-ink-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink-600">{comment.authorNick}</span>
          {comment.authorBadge ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">
              {comment.authorBadge}
            </span>
          ) : null}
          <span>{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 text-ink-400" aria-label="댓글 추천" disabled>
            <HandThumbUpIcon className="h-4 w-4" />
            {comment.likeCount}
          </button>
          <button className="inline-flex items-center gap-1 text-ink-400" aria-label="댓글 비추천" disabled>
            <HandThumbDownIcon className="h-4 w-4" />
            {comment.dislikeCount}
          </button>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-ink-700">
        {comment.isHidden ? '신고 누적으로 숨겨진 댓글입니다.' : comment.content}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
        <span className="inline-flex items-center gap-1">
          <HandThumbUpIcon className="h-4 w-4" />
          {comment.likeCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <HandThumbDownIcon className="h-4 w-4" />
          {comment.dislikeCount}
        </span>
        <span>신고 {comment.reportCount}</span>
      </div>

      {comment.children.length > 0 ? (
        <ul className="space-y-3 border-l-2 border-dashed border-slate-200 pl-4">
          {comment.children.map((child) => (
            <CommentThread key={child.id} comment={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export default CommentThread
