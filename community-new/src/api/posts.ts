/**
 * 게시글 API 서비스 (v3.0.0 PostgreSQL)
 * 
 * 백엔드 server.js v3.0.0과 완전히 호환되는 API 클라이언트
 */

import { apiClient } from './client';
import type {
  Post,
  PostsResponse,
  PostComment,
  PostImage,
  Category,
  CategoriesResponse,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  VoteRequest,
  PostDetailResponse,
  HealthResponse,
  RawPost,
  RawComment,
  RawPostImage,
} from '../types';

/**
 * 백엔드 원시 댓글을 프론트엔드 타입으로 변환 (snake_case → camelCase)
 */
function transformComment(rawComment: RawComment): PostComment {
  return {
    id: rawComment.id,
    postId: 0, // 댓글 응답에는 post_id가 없으므로 기본값
    userId: '', // 댓글 응답에는 user_id가 없으므로 기본값
    author: rawComment.author,
    content: rawComment.content,
    instagram: rawComment.instagram,
    date: rawComment.created_at, // 표시용
    createdAt: rawComment.created_at,
    updatedAt: rawComment.created_at, // updated_at이 없으면 created_at 사용
    deletedAt: undefined,
    isBlinded: rawComment.is_blinded,
  };
}

/**
 * 백엔드 원시 이미지를 프론트엔드 타입으로 변환 (snake_case → camelCase)
 */
function transformImage(rawImage: RawPostImage): PostImage {
  return {
    id: rawImage.id,
    cloudinaryId: rawImage.cloudinary_id || '',
    cloudinaryUrl: rawImage.cloudinary_url,
    thumbnailUrl: rawImage.thumbnail_url,
    originalFilename: rawImage.original_filename || '',
    fileSize: rawImage.file_size || 0,
    width: rawImage.width,
    height: rawImage.height,
    format: rawImage.format || '',
    sortOrder: rawImage.sort_order || 0,
  };
}

/**
 * 백엔드 원시 게시글을 프론트엔드 타입으로 변환
 * RawPost (snake_case) → Post (camelCase)
 */
function transformPost(rawPost: RawPost): Post {
  return {
    // 기본 정보
    id: rawPost.id,
    userId: rawPost.user_id,
    title: rawPost.title,
    content: rawPost.content,
    author: rawPost.username || rawPost.author,
    
    // 카테고리 정보
    categoryId: rawPost.category_id,
    category: rawPost.category_name, // 표시용
    categoryIcon: rawPost.category_icon,
    categoryColor: rawPost.category_color,
    
    // Instagram
    instagram: rawPost.instagram,
    
    // 이미지
    images: rawPost.images ? rawPost.images.map(transformImage) : null,
    imagesCount: typeof rawPost.images_count === 'string' 
      ? parseInt(rawPost.images_count, 10) 
      : rawPost.images_count,
    
    // 카운터
    views: rawPost.views_count || rawPost.views || 0, // 표시용
    likesCount: rawPost.likes_count || 0,
    dislikesCount: rawPost.dislikes_count || 0,
    commentsCount: rawPost.comments_count || 0,
    
    // 댓글 목록
    comments: rawPost.comments ? rawPost.comments.map(transformComment) : undefined,
    
    // 상태
    isNotice: rawPost.is_notice,
    isAdmin: rawPost.is_admin,
    isPinned: rawPost.is_pinned,
    isBlinded: rawPost.is_blinded,
    
    // 타임스탬프
    date: rawPost.created_at, // 표시용
    createdAt: rawPost.created_at,
    updatedAt: rawPost.updated_at,
    deletedAt: rawPost.deleted_at || undefined,
  };
}

/**
 * 레거시 지원: 기존 normalizePost 함수 유지 (하위 호환성)
 * @deprecated transformPost 사용 권장
 */
function normalizePost(rawPost: any): Post {
  // RawPost 타입으로 캐스팅 후 transformPost 사용
  return transformPost(rawPost as RawPost);
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
 * 게시글 목록 파라미터
 */
export interface ListPostsParams {
  category?: string;
  limit?: number;
  offset?: number;
  page?: number; // page 번호 (1부터 시작)
}

/**
 * 게시글 목록 응답 (count 포함)
 */
export interface ListPostsResponse {
  posts: Post[];
  count: number; // 전체 게시글 수
}

/**
 * 게시글 목록 조회
 */
export async function getPosts(params?: ListPostsParams): Promise<ListPostsResponse> {
  try {
    const limit = params?.limit || 20;
    const page = params?.page || 1;
    const offset = (page - 1) * limit;
    
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    console.log('[getPosts] 요청 시작:', `/api/posts?${queryParams.toString()}`);
    
    const response = await apiClient.get<{success: boolean; posts: RawPost[]; count: number}>(`/api/posts?${queryParams.toString()}`);
    
    console.log('[getPosts] 응답 받음:', response.data);
    
    if (response.data && response.data.posts) {
      console.log('[getPosts] posts 반환:', response.data.posts.length, '개, 총:', response.data.count);
      // RawPost[] → Post[] 변환
      const transformedPosts = response.data.posts.map(transformPost);
      return {
        posts: transformedPosts,
        count: response.data.count || transformedPosts.length
      };
    }
    
    console.warn('[getPosts] posts 데이터 없음');
    return { posts: [], count: 0 };
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
    console.log(`[getPost] 요청 시작: /api/posts/${id}`);
    const response = await apiClient.get<{success: boolean; post: RawPost}>(`/api/posts/${id}`);
    
    console.log('[getPost] 응답 받음:', {
      success: response.data.success,
      hasPost: !!response.data.post,
      postId: response.data.post?.id
    });
    
    if (!response.data.success || !response.data.post) {
      console.warn('[getPost] 유효하지 않은 응답:', response.data);
      return null;
    }
    
    // RawPost → Post 변환
    const transformedPost = transformPost(response.data.post);
    console.log('[getPost] 변환 완료:', {
      id: transformedPost.id,
      title: transformedPost.title,
      hasImages: !!transformedPost.images,
      hasComments: !!transformedPost.comments
    });
    return transformedPost;
  } catch (error: any) {
    console.error('[getPost] 에러 발생:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
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
  
  const response = await apiClient.post<{success: boolean; post: RawPost}>('/api/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (!response.data.success || !response.data.post) {
    throw new Error('게시글 작성에 실패했습니다.');
  }
  
  // RawPost → Post 변환
  return transformPost(response.data.post);
}

/**
 * 게시글 수정
 */
export async function updatePost(
  id: number,
  data: UpdatePostRequest
): Promise<Post> {
  const response = await apiClient.put<{success: boolean; post: RawPost}>(`/api/posts/${id}`, data);
  
  if (!response.data.success || !response.data.post) {
    throw new Error('게시글 수정에 실패했습니다.');
  }
  
  // RawPost → Post 변환
  return transformPost(response.data.post);
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
  const response = await apiClient.post<{success: boolean; post: RawPost}>(
    `/api/posts/${postId}/comments`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('댓글 작성에 실패했습니다.');
  }
  
  // RawPost → Post 변환
  return transformPost(response.data.post);
}

/**
 * 투표 (좋아요/싫어요)
 */
export async function votePost(postId: number, data: VoteRequest): Promise<Post> {
  const response = await apiClient.post<{success: boolean; post: RawPost}>(
    `/api/posts/${postId}/vote`,
    data
  );
  
  if (!response.data.success || !response.data.post) {
    throw new Error('투표에 실패했습니다.');
  }
  
  // RawPost → Post 변환
  return transformPost(response.data.post);
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
  const response = await apiClient.get<{success: boolean; posts: RawPost[]}>(`/api/posts/search?q=${encodeURIComponent(query)}`);
  
  // 백엔드 응답 형태에 따라 처리
  if (response.data && response.data.posts) {
    // RawPost[] → Post[] 변환
    return response.data.posts.map(transformPost);
  }
  
  return [];
}
