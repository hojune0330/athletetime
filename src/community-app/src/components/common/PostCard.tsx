import { Link } from 'react-router-dom'
import { ChatBubbleLeftEllipsisIcon, EyeIcon, FireIcon } from '@heroicons/react/24/outline'
import type { PostSummary } from '../../lib/types'
import { cn, formatNumber, formatRelativeTime } from '../../lib/utils'

interface PostCardProps {
  post: PostSummary
}

function PostCard({ post }: PostCardProps) {
  const label = post.isNotice ? '공지' : post.isHot ? 'HOT' : undefined

  return (
    <article className="card group overflow-hidden">
      <Link to={`/post/${post.id}`} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-400">
              <span className="pill bg-white text-ink-500">{post.boardName}</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
            </div>
            <h3 className="text-lg font-semibold text-ink-900 leading-snug group-hover:text-brand-600">
              {post.title}
            </h3>
            <p className="text-sm text-ink-600 line-clamp-2">{post.excerpt}</p>
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs text-brand-600">
                {post.tags.map((tag) => (
                  <span key={tag} className="pill bg-brand-50/70">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {post.thumbnailUrl ? (
            <img
              src={post.thumbnailUrl}
              alt="게시물 썸네일"
              className="h-24 w-32 shrink-0 rounded-xl object-cover"
              loading="lazy"
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-ink-500">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1', label === '공지' ? 'bg-amber-100 text-amber-700' : label === 'HOT' ? 'bg-red-100 text-red-600' : 'hidden')}>
              {label === 'HOT' ? <FireIcon className="h-3.5 w-3.5" /> : null}
              {label}
            </span>
            <span className="font-medium text-ink-600">{post.authorNick}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="h-4 w-4" aria-hidden="true" />
              {formatNumber(post.views)}
            </span>
            <span className="inline-flex items-center gap-1 text-brand-600">
              <FireIcon className="h-4 w-4" aria-hidden="true" />
              {formatNumber(post.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" aria-hidden="true" />
              {formatNumber(post.commentCount)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}

export default PostCard
