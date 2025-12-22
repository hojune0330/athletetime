/**
 * 게시글 API (v4.0.0)
 * 
 * 백엔드 API v4.0.0과 완벽하게 호환
 */

import { apiClient } from './client';
import type {
  Post,
  PostsResponse,
  PostDetailResponse,
  CreatePostRequest,
  CreateCommentRequest,
  VoteRequest,
  Category,
  HealthResponse,
  PollVoteRequest,
  PollVoteResponse,
  Poll,
} from '../types';

// ============================================
// 헬스체크
// ============================================

export async function checkHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

// ============================================
// 카테고리
// ============================================

export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<Category[]>('/api/categories');
  return response.data;
}

// ============================================
// 게시글 목록
// ============================================

export interface GetPostsParams {
  category?: string;
  limit?: number;
  page?: number;
  sort?: 'latest' | 'hot' | 'comment';
}

export async function getPosts(params?: GetPostsParams): Promise<PostsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.sort) {
    queryParams.append('sort', params.sort);
  }
  
  const url = `/api/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<PostsResponse>(url);
  
  return response.data;
}

// ============================================
// 게시글 상세
// ============================================

export async function getPost(id: string | number): Promise<Post> {
  const response = await apiClient.get<PostDetailResponse>(`/api/posts/${id}`);
  
  if (!response.data.success || !response.data.post) {
    throw new Error('게시글을 찾을 수 없습니다.');
  }
  
  return response.data.post;
}

// ============================================
// 게시글 작성
// ============================================

export async function createPost(
  data: CreatePostRequest,
  images: File[] = []
): Promise<Post> {
  const formData = new FormData();
  
  // 텍스트 필드 추가
  formData.append('title', data.title);
  formData.append('content', data.content);
  formData.append('author', data.author);
  formData.append('password', data.password);
  formData.append('category', data.category);
  formData.append('anonymousId', data.anonymousId);
  
  if (data.instagram) {
    formData.append('instagram', data.instagram);
  }
  
  if (data.isNotice) {
    formData.append('isNotice', 'true');
  }
  
  // 투표 데이터 추가
  if (data.poll && data.poll.question && data.poll.options.length >= 2) {
    formData.append('poll', JSON.stringify(data.poll));
  }
  
  // 이미지 파일 추가 (최대 5개)
  images.slice(0, 5).forEach((image) => {
    formData.append('images', image);
  });
  
  const response = await apiClient.post<{ success: boolean; post: Post }>(
    '/api/posts',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('게시글 작성에 실패했습니다.');
  }
  
  return response.data.post;
}

// ============================================
// 게시글 삭제
// ============================================

export async function deletePost(id: string | number, password: string): Promise<void> {
  const response = await apiClient.delete<{ success: boolean; message?: string }>(
    `/api/posts/${id}`,
    {
      data: { password },
    }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.message || '게시글 삭제에 실패했습니다.');
  }
}

// ============================================
// 게시글 비밀번호 검증
// ============================================

export async function verifyPostPassword(id: string | number, password: string): Promise<boolean> {
  const response = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
    `/api/posts/${id}/verify-password`,
    { password }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error || '비밀번호가 일치하지 않습니다.');
  }
  
  return true;
}

// ============================================
// 게시글 수정
// ============================================

export interface UpdatePostRequest {
  title: string;
  content: string;
  category: string;
  password: string;
}

export async function updatePost(
  id: string | number,
  data: UpdatePostRequest
): Promise<Post> {
  const response = await apiClient.put<{ success: boolean; post: Post; message?: string; error?: string }>(
    `/api/posts/${id}`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error(response.data.error || '게시글 수정에 실패했습니다.');
  }
  
  return response.data.post;
}

// ============================================
// 댓글 작성
// ============================================

export async function createComment(
  postId: string | number,
  data: CreateCommentRequest
): Promise<Post> {
  const response = await apiClient.post<{ success: boolean; post: Post }>(
    `/api/posts/${postId}/comments`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('댓글 작성에 실패했습니다.');
  }
  
  return response.data.post;
}

// ============================================
// 투표
// ============================================

export async function votePost(
  postId: string | number,
  data: VoteRequest
): Promise<Post> {
  const response = await apiClient.post<{ success: boolean; post: Post }>(
    `/api/posts/${postId}/vote`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('투표에 실패했습니다.');
  }
  
  return response.data.post;
}

// ============================================
// 설문 투표
// ============================================

export async function votePoll(
  postId: string | number,
  data: PollVoteRequest
): Promise<Poll> {
  const response = await apiClient.post<PollVoteResponse>(
    `/api/posts/${postId}/poll/vote`,
    data
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error || '투표에 실패했습니다.');
  }
  
  return response.data.poll;
}

// ============================================
// 검색
// ============================================

export async function searchPosts(query: string): Promise<Post[]> {
  const response = await apiClient.get<{ success: boolean; posts: Post[] }>(
    `/api/posts/search?q=${encodeURIComponent(query)}`
  );
  
  if (response.data && response.data.posts) {
    return response.data.posts;
  }
  
  return [];
}
