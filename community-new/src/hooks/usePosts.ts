/**
 * 게시글 관련 React Query 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPosts,
  getPost,
  createPost,
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
export function usePosts() {
  return useQuery({
    queryKey: postKeys.lists(),
    queryFn: getPosts,
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
    enabled: !!id,
  });
}

/**
 * 게시글 작성 훅
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePostRequest) => createPost(data),
    onSuccess: () => {
      // 게시글 목록 캐시 무효화
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
    onSuccess: (_, variables) => {
      // 해당 게시글 캐시 무효화
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.id) });
      // 목록도 무효화
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
      // 게시글 목록 캐시 무효화
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
    onSuccess: (_, variables) => {
      // 해당 게시글 캐시 무효화
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      // 목록도 무효화 (댓글 수 업데이트)
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
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
    onSuccess: (_, variables) => {
      // 해당 게시글 캐시 무효화
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      // 목록도 무효화 (좋아요 수 업데이트)
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
