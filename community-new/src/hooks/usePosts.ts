<<<<<<< HEAD
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
=======
/**
 * React Query 훅 (v4.0.0)
 * 
 * 게시글 관련 데이터 페칭 및 뮤테이션
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import * as api from '../api/posts';
import type { Post, PostsResponse, CreatePostRequest, CreateCommentRequest, VoteRequest } from '../types';

// ============================================
// Query Keys
// ============================================

export const queryKeys = {
  posts: ['posts'] as const,
  postsList: (params?: api.GetPostsParams) => ['posts', 'list', params] as const,
  post: (id: string | number) => ['posts', 'detail', id] as const,
  categories: ['categories'] as const,
};

// ============================================
// 게시글 목록
// ============================================

export function usePosts(params?: api.GetPostsParams): UseQueryResult<PostsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.postsList(params),
    queryFn: () => api.getPosts(params),
    staleTime: 1000 * 30, // 30초
    gcTime: 1000 * 60 * 5, // 5분
  });
}

// ============================================
// 게시글 상세
// ============================================

export function usePost(id: string | number): UseQueryResult<Post, Error> {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => api.getPost(id),
    enabled: !!id && !isNaN(Number(id)),
    staleTime: 0, // 항상 최신 데이터 가져오기 (Priority 1 요구사항)
    gcTime: 1000 * 60 * 10, // 10분
    refetchOnMount: 'always', // 마운트 시 항상 새로고침
  });
}

// ============================================
// 카테고리 목록
// ============================================

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.getCategories,
    staleTime: 1000 * 60 * 10, // 10분 (카테고리는 자주 변하지 않음)
    gcTime: 1000 * 60 * 30, // 30분
  });
}

// ============================================
// 게시글 작성
// ============================================

interface CreatePostMutationVariables {
  data: CreatePostRequest;
  images: File[];
}

export function useCreatePost(): UseMutationResult<Post, Error, CreatePostMutationVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ data, images }: CreatePostMutationVariables) => 
      api.createPost(data, images),
    onSuccess: () => {
      // 게시글 목록 무효화 (새로고침)
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

// ============================================
// 게시글 삭제
// ============================================

interface DeletePostMutationVariables {
  id: string | number;
  password: string;
}

export function useDeletePost(): UseMutationResult<void, Error, DeletePostMutationVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, password }: DeletePostMutationVariables) => 
      api.deletePost(id, password),
    onSuccess: (_, variables) => {
      // 해당 게시글 캐시 제거
      queryClient.removeQueries({ queryKey: queryKeys.post(variables.id) });
      // 게시글 목록 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

// ============================================
// 댓글 작성
// ============================================

interface CreateCommentMutationVariables {
  postId: string | number;
  data: CreateCommentRequest;
}

export function useCreateComment(): UseMutationResult<Post, Error, CreateCommentMutationVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, data }: CreateCommentMutationVariables) => 
      api.createComment(postId, data),
    onSuccess: (updatedPost, variables) => {
      // 해당 게시글 캐시 업데이트
      queryClient.setQueryData(queryKeys.post(variables.postId), updatedPost);
      // 게시글 목록도 무효화 (댓글 수 업데이트)
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

// ============================================
// 투표
// ============================================

interface VotePostMutationVariables {
  postId: string | number;
  data: VoteRequest;
}

export function useVotePost(): UseMutationResult<Post, Error, VotePostMutationVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, data }: VotePostMutationVariables) => 
      api.votePost(postId, data),
    onSuccess: (updatedPost, variables) => {
      // 해당 게시글 캐시 업데이트
      queryClient.setQueryData(queryKeys.post(variables.postId), updatedPost);
      // 게시글 목록도 무효화 (좋아요 수 업데이트)
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
}
