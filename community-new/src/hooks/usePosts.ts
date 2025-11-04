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
    staleTime: 1000 * 60, // 1분
    gcTime: 1000 * 60 * 10, // 10분
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
}
