/**
 * React Query 훅 (v4.0.0)
 * 
 * 게시글 관련 데이터 페칭 및 뮤테이션
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import * as api from '../api/posts';
import type { Post, PostsResponse, CreatePostRequest, CreateCommentRequest, VoteRequest, PollVoteRequest, Poll } from '../types';

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

export function usePost(id?: string | number): UseQueryResult<Post, Error> {
  return useQuery({
    queryKey: queryKeys.post(id || ''),
    queryFn: () => api.getPost(id!),
    enabled: !!id && !isNaN(Number(id)),
    staleTime: 0, // 항상 최신 데이터 가져오기
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
// 게시글 비밀번호 검증
// ============================================

interface VerifyPasswordMutationVariables {
  id: string | number;
  password: string;
}

export function useVerifyPostPassword(): UseMutationResult<boolean, Error, VerifyPasswordMutationVariables> {
  return useMutation({
    mutationFn: ({ id, password }: VerifyPasswordMutationVariables) => 
      api.verifyPostPassword(id, password),
  });
}

// ============================================
// 게시글 수정
// ============================================

interface UpdatePostMutationVariables {
  id: string | number;
  data: api.UpdatePostRequest;
}

export function useUpdatePost(): UseMutationResult<Post, Error, UpdatePostMutationVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: UpdatePostMutationVariables) => 
      api.updatePost(id, data),
    onSuccess: (updatedPost, variables) => {
      // 해당 게시글 캐시 업데이트
      queryClient.setQueryData(queryKeys.post(variables.id), updatedPost);
      // 게시글 목록 무효화
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
      // 해당 게시글 캐시 업데이트 (서버 응답으로 직접 업데이트)
      queryClient.setQueryData(queryKeys.post(variables.postId), updatedPost);
      // 목록 캐시의 해당 게시글도 업데이트
      queryClient.setQueriesData(
        { queryKey: queryKeys.posts },
        (oldData: PostsResponse | undefined) => {
          if (!oldData?.posts) return oldData;
          return {
            ...oldData,
            posts: oldData.posts.map(post => 
              post.id === updatedPost.id 
                ? { ...post, likes_count: updatedPost.likes_count, dislikes_count: updatedPost.dislikes_count }
                : post
            ),
          };
        }
      );
    },
  });
}

// ============================================
// 설문 투표
// ============================================

interface PollVoteMutationVariables {
  postId: string | number;
  data: PollVoteRequest;
}

export function usePollVote(): UseMutationResult<Poll, Error, PollVoteMutationVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, data }: PollVoteMutationVariables) => 
      api.votePoll(postId, data),
    onSuccess: (updatedPoll, variables) => {
      // 해당 게시글 캐시에서 poll 업데이트
      queryClient.setQueryData(
        queryKeys.post(variables.postId),
        (oldData: Post | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            poll: updatedPoll
          };
        }
      );
    },
  });
}
