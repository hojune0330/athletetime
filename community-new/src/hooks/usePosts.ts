import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createComment,
  createPost,
  deletePost,
  getPost,
  getPosts,
  votePost,
  type CreateCommentPayload,
  type CreatePostPayload,
  type DeletePostPayload,
  type ListPostsParams,
  type VotePostPayload,
} from '../api/posts'
import type { Post } from '../types/post'

export const postsQueryKeys = {
  all: ['posts'] as const,
  list: (params?: ListPostsParams) => ['posts', params ?? {}] as const,
  detail: (id: number | string) => ['posts', 'detail', String(id)] as const,
}

export function usePosts(params?: ListPostsParams) {
  return useQuery({
    queryKey: postsQueryKeys.list(params),
    queryFn: () => getPosts(params),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

export function usePost(id?: number | string) {
  const queryClient = useQueryClient()
  const queryKey = id ? postsQueryKeys.detail(id) : ['posts', 'detail', 'unknown'] as const

  return useQuery({
    queryKey,
    enabled: Boolean(id),
    queryFn: () => getPost(id!),
    initialData: () => {
      if (!id) return undefined
      const existingLists = queryClient.getQueriesData<Post[]>({ queryKey: postsQueryKeys.all })
      for (const [, data] of existingLists) {
        const match = data?.find((post) => String(post.id) === String(id))
        if (match) return match
      }
      return undefined
    },
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.all })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DeletePostPayload) => deletePost(payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.all })
      queryClient.removeQueries({ queryKey: postsQueryKeys.detail(variables.id) })
    },
  })
}

export function useVotePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: VotePostPayload) => votePost(payload),
    onSuccess: (updatedPost) => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.all })
      queryClient.setQueryData<Post>(postsQueryKeys.detail(updatedPost.id), updatedPost)
    },
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => createComment(payload),
    onSuccess: (_comment, variables) => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.detail(variables.postId) })
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.all })
    },
  })
}
