/**
 * 게시글 관련 타입 정의
 */

/**
 * 게시글 타입
 */
export type Post = {
  id: number;
  category: string;
  title: string;
  author: string;
  content: string;
  password?: string;
  date: string;
  views: number;
  likes: string[];
  dislikes: string[];
  comments: PostComment[];
  reports: Report[];
  isNotice?: boolean;
  isBlinded?: boolean;
  imageUrl?: string;
}

/**
 * 댓글 타입
 */
export interface PostComment {
  id: number;
  author: string;
  content: string;
  password: string;
  date: string;
}

/**
 * 신고 타입
 */
export interface Report {
  userId: string;
  reason: string;
  date: string;
}

/**
 * 게시글 작성 요청 타입
 */
export interface CreatePostRequest {
  category: string;
  title: string;
  author: string;
  content: string;
  password: string;
  isNotice?: boolean;
  imageUrl?: string;
}

/**
 * 게시글 수정 요청 타입
 */
export interface UpdatePostRequest {
  category?: string;
  title?: string;
  content?: string;
  password: string;
  imageUrl?: string;
}

/**
 * 게시글 삭제 요청 타입
 */
export interface DeletePostRequest {
  password: string;
}

/**
 * 댓글 작성 요청 타입
 */
export interface CreateCommentRequest {
  author: string;
  content: string;
  userId: string;
  instagram?: string;
}

/**
 * 투표 요청 타입
 */
export interface VoteRequest {
  userId: string;
  type: 'like' | 'dislike';
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 게시글 목록 응답 타입
 */
export interface PostsResponse {
  success: boolean;
  posts: Post[];
  count: number;
}
