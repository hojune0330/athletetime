/**
 * 타입 정의 (v4.0.0 - Clean Architecture)
 * 
 * 백엔드 API 응답과 완벽하게 일치하는 타입 정의
 */

// ============================================
// 카테고리
// ============================================

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

// ============================================
// 이미지
// ============================================

export interface PostImage {
  id: number;
  cloudinary_id?: string;
  cloudinary_url: string;
  thumbnail_url: string;
  original_filename?: string;
  file_size?: number;
  width: number;
  height: number;
  format?: string;
  sort_order?: number;
}

// ============================================
// 댓글
// ============================================

export interface Comment {
  id: number;
  content: string;
  author: string;
  instagram?: string;
  created_at: string;
  is_blinded?: boolean;
}

// ============================================
// 게시글
// ============================================

export interface Post {
  // 기본 정보
  id: string;
  title: string;
  content: string;
  author: string;
  instagram?: string;
  
  // 카테고리
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  
  // 카운터
  views: number;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  
  // 이미지 및 댓글
  images: PostImage[];
  comments?: Comment[];
  
  // 상태
  is_notice: boolean;
  is_pinned: boolean;
  is_blinded: boolean;
  
  // 타임스탬프
  created_at: string;
  updated_at: string;
  
  // 사용자 정보
  user_id: string;
  username?: string;
  
  // 현재 사용자의 투표 상태
  myVote?: 'like' | 'dislike' | null;
}

// ============================================
// API 요청
// ============================================

export interface CreatePostRequest {
  title: string;
  content: string;
  author: string;
  password: string;
  category: string;
  instagram?: string;
  anonymousId: string;
}

export interface CreateCommentRequest {
  content: string;
  author: string;
  instagram?: string;
  anonymousId: string;
}

export interface VoteRequest {
  type: 'like' | 'dislike';
  anonymousId: string;
}

export interface DeletePostRequest {
  password: string;
}

// ============================================
// API 응답
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PostsResponse {
  success: boolean;
  posts: Post[];
  count: number;
  page?: number;
  limit?: number;
}

export interface PostDetailResponse {
  success: boolean;
  post: Post;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  database: 'connected' | 'disconnected';
  cloudinary: 'configured' | 'not_configured';
  websocket: string;
  timestamp: string;
}

// ============================================
// WebSocket
// ============================================

export interface WebSocketMessage {
  type: 'new_post' | 'new_comment' | 'vote' | 'post_deleted' | 'comment_deleted';
  data?: any;
  postId?: string;
  timestamp: string;
}

// ============================================
// 로컬 스토리지
// ============================================

export const STORAGE_KEYS = {
  ANONYMOUS_ID: 'athletetime_anonymous_id',
  USERNAME: 'athletetime_username',
  THEME: 'athletetime_theme',
  VOTED_POSTS: 'athletetime_voted_posts',
} as const;

// ============================================
// 유틸리티 타입
// ============================================

export type VoteType = 'like' | 'dislike';

export interface VotedPosts {
  [postId: string]: VoteType;
}
