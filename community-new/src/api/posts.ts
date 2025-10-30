/**
 * 게시글 API 서비스 (v3.0.0 PostgreSQL)
 * 
 * 백엔드 server.js v3.0.0과 완전히 호환되는 API 클라이언트
 */

import { apiClient } from './client';
import type {
  Post,
  PostsResponse,
  Category,
  CategoriesResponse,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  VoteRequest,
  PostDetailResponse,
  HealthResponse,
} from '../types';

/**
 * 백엔드 응답 데이터를 정규화
 */
function normalizePost(rawPost: any): Post {
  return {
    ...rawPost,
    // images가 null인 경우 빈 배열로 변환
    images: rawPost.images || [],
    // 문자열로 오는 숫자 필드들을 숫자로 변환
    images_count: Number(rawPost.images_count) || 0,
    views_count: Number(rawPost.views_count) || Number(rawPost.views) || 0,
    likes_count: Number(rawPost.likes_count) || 0,
    dislikes_count: Number(rawPost.dislikes_count) || 0,
    comments_count: Number(rawPost.comments_count) || 0,
  };
}

/**
 * Health Check
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

/**
 * 카테고리 목록 조회
 */
export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<CategoriesResponse>('/api/categories');
  return response.data;
}

/**
 * 게시글 목록 조회
 * 
 * @param category - 카테고리 필터 (optional)
 * @param limit - 페이지 크기 (default: 50)
 * @param offset - 오프셋 (default: 0)
 */
export async function getPosts(
  category?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Post[]> {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    console.log('[getPosts] 요청 시작:', `/api/posts?${params.toString()}`);
    
    const response = await apiClient.get<any>(`/api/posts?${params.toString()}`);
    
    console.log('[getPosts] 응답 받음:', response.data);
    
    // v3.0.0: {success: true, posts: [...]} 형태
    // posts 배열을 반환해야 함
    if (response.data && response.data.posts) {
      console.log('[getPosts] posts 반환:', response.data.posts.length, '개');
      // 데이터 정규화 적용
      const normalizedPosts = response.data.posts.map(normalizePost);
      console.log('[getPosts] 정규화된 첫 번째 post:', normalizedPosts[0]);
      return normalizedPosts;
    }
    
    console.warn('[getPosts] posts 데이터 없음, 빈 배열 반환');
    // 레거시 형태 또는 에러 시 빈 배열 반환
    return [];
  } catch (error) {
    console.error('[getPosts] 에러 발생:', error);
    throw error;
  }
}

/**
 * 게시글 상세 조회
 */
export async function getPost(id: number): Promise<Post | null> {
  try {
    const response = await apiClient.get<PostDetailResponse>(`/api/posts/${id}`);
    
    if (!response.data.success || !response.data.post) {
      return null;
    }
    
    // 데이터 정규화 적용
    return normalizePost(response.data.post);
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    return null;
  }
}

/**
 * 게시글 작성 (multipart/form-data with images)
 * 
 * @param data - 게시글 데이터
 * @param images - 이미지 파일 배열 (최대 5개)
 */
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
  
  // 이미지 파일 추가 (최대 5개)
  images.slice(0, 5).forEach((image) => {
    formData.append('images', image);
  });
  
  const response = await apiClient.post<PostDetailResponse>('/api/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (!response.data.success || !response.data.post) {
    throw new Error('게시글 작성에 실패했습니다.');
  }
  
  return response.data.post;
}

/**
 * 게시글 수정
 */
export async function updatePost(
  id: number,
  data: UpdatePostRequest
): Promise<Post> {
  const response = await apiClient.put<PostDetailResponse>(`/api/posts/${id}`, data);
  
  if (!response.data.success || !response.data.post) {
    throw new Error('게시글 수정에 실패했습니다.');
  }
  
  return response.data.post;
}

/**
 * 게시글 삭제
 */
export async function deletePost(id: number, password: string): Promise<void> {
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

/**
 * 댓글 작성
 */
export async function createComment(
  postId: number,
  data: CreateCommentRequest
): Promise<Post> {
  const response = await apiClient.post<PostDetailResponse>(
    `/api/posts/${postId}/comments`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('댓글 작성에 실패했습니다.');
  }
  
  // 댓글이 추가된 전체 게시글 반환
  return response.data.post;
}

/**
 * 투표 (좋아요/싫어요)
 */
export async function votePost(postId: number, data: VoteRequest): Promise<Post> {
  const response = await apiClient.post<PostDetailResponse>(
    `/api/posts/${postId}/vote`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('투표에 실패했습니다.');
  }
  
  return response.data.post;
}

/**
 * 조회수 증가
 * 
 * v3.0.0: GET /api/posts/:id 호출 시 자동으로 조회수 증가
 */
export async function incrementViews(postId: number): Promise<void> {
  // 자동으로 처리되므로 별도 API 호출 불필요
  console.log(`[INFO] Views auto-incremented for post ${postId}`);
}

/**
 * 검색 (향후 구현)
 */
export async function searchPosts(query: string): Promise<Post[]> {
  const response = await apiClient.get<any>(`/api/posts/search?q=${encodeURIComponent(query)}`);
  
  // 백엔드 응답 형태에 따라 처리
  if (response.data && response.data.posts) {
    return response.data.posts;
  }
  
  return [];
}
