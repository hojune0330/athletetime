import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchBoards, fetchPopularPosts, fetchPostDetail, fetchPosts } from './api'
import type { ListResponse, PostSummary } from '../../lib/types'

type UsePostsOptions = {
  boardSlug?: string
  page?: number
  pageSize?: number
  sort?: 'latest' | 'popular' | 'comments' | 'views'
  query?: string
}

export const boardKeys = {
  all: ['boards'] as const,
}

export const postKeys = {
  list: (options: UsePostsOptions) =>
    ['posts', options.boardSlug ?? 'all', options.page ?? 1, options.sort ?? 'latest', options.query ?? ''] as const,
  detail: (postId: string) => ['posts', 'detail', postId] as const,
  popular: ['posts', 'popular'] as const,
}

export function useBoards() {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: fetchBoards,
  })
}

export function usePosts(options: UsePostsOptions) {
  return useQuery<ListResponse<PostSummary>>({
    queryKey: postKeys.list(options),
    queryFn: () => fetchPosts(options),
    placeholderData: keepPreviousData,
  })
}

export function usePopularPosts(limit = 5) {
  return useQuery({
    queryKey: postKeys.popular,
    queryFn: fetchPopularPosts,
    select: (posts: PostSummary[]) => posts.slice(0, limit),
  })
}

export function usePostDetail(postId: string | undefined) {
  return useQuery({
    queryKey: postId ? postKeys.detail(postId) : ['posts', 'detail', 'unknown'],
    queryFn: () => (postId ? fetchPostDetail(postId) : Promise.reject(new Error('게시글 ID가 필요합니다.'))),
    enabled: Boolean(postId),
  })
}

export function useBoardNavigation(boardSlug?: string) {
  const { data: boards } = useBoards()

  return useMemo(() => {
    const activeBoard = boards?.find((board) => board.slug === boardSlug)

    return {
      boards: boards ?? [],
      activeBoard,
    }
  }, [boards, boardSlug])
}
