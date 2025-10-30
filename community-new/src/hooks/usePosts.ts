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
export function usePosts(params?: { category?: string; limit?: number; page?: number }) {
  return useQuery({
    queryKey: postKeys.list(params),
    queryFn: () => getPosts(params),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 게시글 상세 조회 훅
 */
export function usePost(id: number | string) {
  return useQuery({
    queryKey: postKeys.detail(Number(id)),
    queryFn: () => getPost(Number(id)),
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
    enabled: !isNaN(Number(id)), // ID가 유효한 숫자일 때만 요청
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
    onSuccess: (_, { id }) => {
      // 상세 페이지 캐시 제거
      queryClient.removeQueries({ queryKey: postKeys.detail(id) });
      
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
    onError: (error) => {
      console.error('삭제 실패:', error);
      // TODO: 사용자 알림 추가
    },
  });
}

/**
 * 댓글 작성 훅 (캐시 직접 업데이트)
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: CreateCommentRequest }) =>
      createComment(postId, data),
    onSuccess: (updatedPost, { postId }) => {
      // 댓글이 추가된 전체 Post 객체로 캐시 업데이트
      queryClient.setQueryData(postKeys.detail(postId), updatedPost);
      
      // 목록도 갱신 (commentsCount 변경)
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
    onError: (error) => {
      console.error('댓글 작성 실패:', error);
      // TODO: 사용자 알림 추가
    },
  });
}

/**
 * 투표 훅 (낙관적 업데이트 + 캐시 갱신)
 */
export function useVotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: VoteRequest }) =>
      votePost(postId, data),
    onSuccess: (updatedPost, { postId }) => {
      // 상세 페이지 캐시 직접 업데이트
      queryClient.setQueryData(postKeys.detail(postId), updatedPost);
      
      // 목록 캐시 무효화 (새로고침)
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
    onError: (error) => {
      console.error('투표 실패:', error);
      // TODO: 사용자 알림 추가
    },
  });
}
