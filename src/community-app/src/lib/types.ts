export interface Board {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  order: number
  isActive: boolean
  createdAt: string
}

export interface BoardSummary extends Board {
  todayPostCount: number
  todayCommentCount: number
  postCount?: number
  isNew?: boolean
}

export interface Attachment {
  id: string
  fileName: string
  fileSize: number
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
}

export interface PostSummary {
  id: string
  boardId: string
  boardSlug: string
  boardName: string
  title: string
  excerpt: string
  authorNick: string
  author?: string // For display
  createdAt: string
  createdAtRelative?: string // For display (e.g., "2시간 전")
  updatedAt?: string
  views: number
  viewCount?: number // Alias for views
  likeCount: number
  dislikeCount: number
  commentCount: number
  tags: string[]
  isNotice: boolean
  isHot: boolean
  hasPoll: boolean
  thumbnailUrl?: string
  imageCount?: number // Number of images in post
}

export interface PostDetail extends PostSummary {
  content: string
  attachments: Attachment[]
  comments: CommentThread[]
  reportCount: number
  isBookmarked?: boolean
}

export interface CommentThread {
  id: string
  postId: string
  parentId: string | null
  authorNick: string
  authorBadge?: string
  content: string
  createdAt: string
  likeCount: number
  dislikeCount: number
  reportCount: number
  children: CommentThread[]
  isHidden?: boolean
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ListResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiError {
  status: number
  message: string
  details?: Record<string, unknown>
}

export interface VoteRequest {
  postId: string
  type: 'like' | 'dislike'
}

export interface CreatePostPayload {
  boardId: string
  title: string
  content: string
  authorNick: string
  password: string
  tags?: string[]
  attachments?: File[]
}

export interface CreateCommentPayload {
  postId: string
  parentId?: string
  authorNick: string
  content: string
  password: string
}
