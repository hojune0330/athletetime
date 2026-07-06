/**
 * 커뮤니티 인기글 스트립 (침하하 스타일)
 *
 * 상단 탭(실시간 인기 | 주간 | 월간 | 명예의 전당)으로 기간을 고르고,
 * 가로 스크롤 카드 스트립으로 인기글을 보여준다.
 * 백엔드 hot 정렬 결과를 받아 기간별로 클라이언트에서 나눈다.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChatBubbleLeftIcon,
  EyeIcon,
  FireIcon,
  HandThumbUpIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { usePosts } from '../../hooks/usePosts'
import type { Post } from '../../types'

export type BestTabKey = 'now' | 'week' | 'month' | 'hall'

export const BEST_TABS: readonly { readonly key: BestTabKey; readonly label: string }[] = [
  { key: 'now', label: '전체 인기글' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
  { key: 'hall', label: '명예의 전당' },
]

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_CARDS = 8
const HALL_MIN_LIKES = 10

function withinDays(dateString: string, days: number): boolean {
  const created = new Date(dateString).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created <= days * DAY_MS
}

export function filterBestPosts(posts: readonly Post[], tab: BestTabKey): Post[] {
  const liked = posts.filter((post) => post.likes_count > 0 && !post.is_notice)
  switch (tab) {
    case 'week':
      return liked.filter((post) => withinDays(post.created_at, 7)).slice(0, MAX_CARDS)
    case 'month':
      return liked.filter((post) => withinDays(post.created_at, 30)).slice(0, MAX_CARDS)
    case 'hall':
      return liked.filter((post) => post.likes_count >= HALL_MIN_LIKES).slice(0, MAX_CARDS)
    case 'now':
    default:
      return liked.slice(0, MAX_CARDS)
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 1000 / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

function BestCard({ post, rank }: { post: Post; rank: number }) {
  const thumbnail = post.images?.[0]?.thumbnail_url ?? null

  return (
    <Link
      to={`/community/post/${post.id}`}
      className="group w-56 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors duration-200 hover:border-primary-300"
    >
      {thumbnail ? (
        <div className="relative h-28 w-full overflow-hidden bg-neutral-100">
          <img
            src={thumbnail}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900/80 text-xs font-bold text-white">
            {rank}
          </span>
        </div>
      ) : null}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          {!thumbnail ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-900 text-[11px] font-bold text-white">
              {rank}
            </span>
          ) : null}
          {post.category_name ? (
            <span
              className="truncate text-xs font-semibold"
              style={{ color: post.category_color || '#6366f1' }}
            >
              {post.category_name}
            </span>
          ) : (
            <span className="text-xs font-semibold text-neutral-400">자유</span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-neutral-900 group-hover:text-primary-600">
          {post.title}
        </h3>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <span className="truncate font-medium text-neutral-600">{post.author}</span>
          <span className="shrink-0">{formatRelativeTime(post.created_at)}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1 text-primary-600">
            <HandThumbUpIcon className="h-3.5 w-3.5" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
            {post.comments_count}
          </span>
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" />
            {post.views}
          </span>
        </div>
      </div>
    </Link>
  )
}

function StripSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-56 shrink-0 rounded-xl border border-neutral-200 bg-white p-3">
          <div className="skeleton h-24 w-full rounded-lg" />
          <div className="skeleton mt-3 h-4 w-3/4 rounded" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

export function CommunityBestStrip() {
  const [tab, setTab] = useState<BestTabKey>('now')
  const { data, isLoading } = usePosts({ sort: 'hot', limit: 40, page: 1 })

  const posts = useMemo(() => filterBestPosts(data?.posts ?? [], tab), [data?.posts, tab])

  return (
    <section aria-label="인기글" className="mb-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FireIcon className="h-5 w-5 text-accent-500" />
          <h2 className="text-base font-bold text-neutral-900">인기글</h2>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="인기글 기간">
          {BEST_TABS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={tab === option.key}
              onClick={() => setTab(option.key)}
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                tab === option.key
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {option.key === 'hall' ? (
                <span className="flex items-center gap-1">
                  <TrophyIcon className="h-3.5 w-3.5" />
                  {option.label}
                </span>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <StripSkeleton />
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
          아직 이 기간의 인기글이 없어요. 좋아요가 쌓이면 여기에 올라와요.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {posts.map((post, index) => (
            <BestCard key={post.id} post={post} rank={index + 1} />
          ))}
        </div>
      )}
    </section>
  )
}
