/**
 * 게시글 관련 타입 정의 (PostgreSQL v3.0.0)
 * 
 * 백엔드 server.js v3.0.0의 PostgreSQL 스키마와 완전히 일치하도록 재작성
 */

/**
 * 카테고리 타입
 */
export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * 이미지 타입 (Cloudinary)
 */
export interface PostImage {
  id: number;
  cloudinary_id: string;
  cloudinary_url: string;
  thumbnail_url: string;
  original_filename: string;
  file_size: number;
  width: number;
  height: number;
  format: string;
  sort_order: number;
}

/**
 * 댓글 타입
 */
export interface PostComment {
  id: number;
  post_id: number;
  user_id: string;
  author: string;
  content: string;
  instagram?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * 게시글 타입 (PostgreSQL)
 */
export interface Post {
  // 기본 정보
  id: string; // PostgreSQL BIGINT가 문자열로 반환됨
  user_id: string;
  title: string;
  content: string;
  author: string; // username from users table
  
  // 카테고리 정보 (조인된 데이터)
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  
  // Instagram (optional)
  instagram?: string;
  
  // 이미지 (Cloudinary)
  images: PostImage[] | null;
  images_count: number | string;
  
  // 카운터
  views_count: number;
  comments_count: number;
  likes_count: number;
  dislikes_count: number;
  
  // 댓글 목록 (상세 조회 시)
  comments?: PostComment[];
  
  // 상태
  is_notice: boolean;
  is_admin: boolean;
  is_pinned: boolean;
  is_blinded: boolean;
  
  // 타임스탬프
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * 게시글 작성 요청 (multipart/form-data)
 */
export interface CreatePostRequest {
  title: string;
  content: string;
  author: string;
  password: string;
  category: string; // category name or ID
  instagram?: string;
  anonymousId: string; // localStorage에서 가져온 익명 ID
  // images: File[] - FormData로 별도 전송
}

/**
 * 게시글 수정 요청
 */
export interface UpdatePostRequest {
  title?: string;
  content?: string;
  category?: string;
  instagram?: string;
  password: string;
}

/**
 * 게시글 삭제 요청
 */
export interface DeletePostRequest {
  password: string;
}

/**
 * 댓글 작성 요청
 */
export interface CreateCommentRequest {
  author: string;
  content: string;
  instagram?: string;
  anonymousId: string;
}

/**
 * 투표 요청
 */
export interface VoteRequest {
  type: 'like' | 'dislike';
  anonymousId: string;
}

/**
 * API 응답 타입 (일관된 형식)
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 게시글 목록 응답 (v3.0.0 - 배열 직접 반환)
 */
export type PostsResponse = Post[];

/**
 * 게시글 상세 응답
 */
export interface PostDetailResponse {
  success: boolean;
  post: Post;
}

/**
 * 카테고리 목록 응답
 */
export type CategoriesResponse = Category[];

/**
 * Health Check 응답
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  database: 'connected' | 'disconnected' | 'error';
  cloudinary: 'configured' | 'not_configured';
  websocket: 'active' | 'inactive';
  timestamp: string;
}

/**
 * WebSocket 메시지 타입
 */
export interface WebSocketMessage {
  type: 'new_post' | 'new_comment' | 'new_vote' | 'post_deleted' | 'comment_deleted';
  data: any;
  timestamp: string;
}

/**
 * 익명 사용자 타입
 */
export interface AnonymousUser {
  anonymousId: string;
  username: string;
  createdAt: string;
  postIds: number[];
  commentIds: number[];
}

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  ANONYMOUS_ID: 'athletetime_anonymous_id',
  USERNAME: 'athletetime_username',
  THEME: 'athletetime_theme',
  VOTED_POSTS: 'athletetime_voted_posts', // {postId: 'like' | 'dislike'}
} as const;
