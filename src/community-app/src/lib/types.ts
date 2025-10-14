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
  createdAt: string
  updatedAt?: string
  views: number
  likeCount: number
  dislikeCount: number
  commentCount: number
  tags: string[]
  isNotice: boolean
  isHot: boolean
  hasPoll: boolean
  thumbnailUrl?: string
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

export interface CompetitionTimetableDocument {
  id: string
  title?: string
  url: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  uploadedAt?: string
  description?: string
}

export interface CompetitionTimetableSession {
  id: string
  date: string
  startTime?: string
  endTime?: string
  discipline: string
  gender?: string
  round?: string
  note?: string
  laneInfo?: string
}

export interface CompetitionTimetable {
  id: string
  title: string
  competitionName: string
  startDate: string
  endDate: string
  publishedAt: string
  updatedAt?: string
  hostOrganization?: string
  venue?: string
  status?: 'scheduled' | 'ongoing' | 'completed'
  highlightText?: string
  summary?: string
  notice?: string
  primaryDocument?: CompetitionTimetableDocument | null
  attachments?: CompetitionTimetableDocument[]
  sessions?: CompetitionTimetableSession[]
}
