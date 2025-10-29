/**
 * 게시글 관련 React Query 훅 (v3.0.0)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPosts,
  getPost,
  createPost as apiCreatePost,
  updatePost,
  deletePost,
  createComment,
  votePost,
} from '../api/posts';
import type {
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  VoteRequest,
} from '../types';

/**
 * Query Keys
 */
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters?: any) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: number) => [...postKeys.details(), id] as const,
};

/**
 * 게시글 목록 조회 훅
 */
export function usePosts(category?: string, limit?: number, offset?: number) {
  return useQuery({
    queryKey: postKeys.list({ category, limit, offset }),
    queryFn: () => getPosts(category, limit, offset),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 게시글 상세 조회 훅
 */
export function usePost(id: number) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => getPost(id),
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
}

/**
 * 게시글 작성 훅
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, images }: { data: CreatePostRequest; images?: File[] }) =>
      apiCreatePost(data, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * 게시글 수정 훅
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePostRequest }) =>
      updatePost(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * 게시글 삭제 훅
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      deletePost(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * 댓글 작성 훅
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: CreateCommentRequest }) =>
      createComment(postId, data),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

/**
 * 투표 훅
 */
export function useVotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: VoteRequest }) =>
      votePost(postId, data),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
