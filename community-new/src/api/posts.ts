/**
 * 게시글 API 서비스
 * 
 * 백엔드의 /api/posts 엔드포인트와 통신하는 함수들
 */

import { apiClient } from './client';
import type {
  Post,
  PostsResponse,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  VoteRequest,
  ApiResponse,
} from '../types';

/**
 * 게시글 목록 조회
 */
export async function getPosts(): Promise<Post[]> {
  const response = await apiClient.get<PostsResponse>('/api/posts');
  return response.data.posts;
}

/**
 * 게시글 상세 조회
 */
export async function getPost(id: number): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find(post => post.id === id) || null;
}

/**
 * 게시글 작성
 */
export async function createPost(data: CreatePostRequest): Promise<Post> {
  const response = await apiClient.post<ApiResponse<Post>>('/api/posts', data);
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || '게시글 작성에 실패했습니다.');
  }
  
  return response.data.data;
}

/**
 * 게시글 수정
 */
export async function updatePost(id: number, data: UpdatePostRequest): Promise<Post> {
  const response = await apiClient.put<ApiResponse<Post>>(`/api/posts/${id}`, data);
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || '게시글 수정에 실패했습니다.');
  }
  
  return response.data.data;
}

/**
 * 게시글 삭제
 */
export async function deletePost(id: number, password: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}`, {
    data: { password },
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || '게시글 삭제에 실패했습니다.');
  }
}

/**
 * 댓글 작성
 */
export async function createComment(postId: number, data: CreateCommentRequest): Promise<Post> {
  const response = await apiClient.post<ApiResponse<Post>>(`/api/posts/${postId}/comments`, data);
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || '댓글 작성에 실패했습니다.');
  }
  
  return response.data.data;
}

/**
 * 투표 (좋아요/싫어요)
 */
export async function votePost(postId: number, data: VoteRequest): Promise<Post> {
  const response = await apiClient.post<ApiResponse<Post>>(`/api/posts/${postId}/vote`, data);
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || '투표에 실패했습니다.');
  }
  
  return response.data.data;
}

/**
 * 조회수 증가
 * 
 * 현재 백엔드에는 별도 엔드포인트가 없으므로,
 * 게시글 조회 시 자동으로 증가하도록 수정 필요
 */
export async function incrementViews(postId: number): Promise<void> {
  // TODO: 백엔드에 조회수 증가 엔드포인트 추가 필요
  // await apiClient.post(`/api/posts/${postId}/views`);
  console.log(`[TODO] Increment views for post ${postId}`);
}
