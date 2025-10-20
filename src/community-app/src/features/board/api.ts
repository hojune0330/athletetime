import { apiRequest } from '../../lib/api/client'
import type {
  BoardSummary,
  CreateCommentPayload,
  CreatePostPayload,
  ListResponse,
  PostDetail,
  PostSummary,
  VoteRequest,
} from '../../lib/types'

const DEFAULT_BOARDS: BoardSummary[] = [
  {
    id: 'anonymous',
    name: '익명 게시판',
    slug: 'anonymous',
    description: '로그인 없이 이용 가능한 기본 게시판',
    icon: '💬',
    order: 1,
    isActive: true,
    createdAt: '2025-10-13T00:00:00+09:00',
    todayPostCount: 0,
    todayCommentCount: 0,
  },
]

type FetchPostsParams = {
  boardSlug?: string
  page?: number
  pageSize?: number
  sort?: 'latest' | 'popular' | 'comments' | 'views'
  query?: string
}

const toQueryString = (params: FetchPostsParams) => {
  const usp = new URLSearchParams()
  if (params.boardSlug) usp.set('board', params.boardSlug)
  if (params.page) usp.set('page', String(params.page))
  if (params.pageSize) usp.set('pageSize', String(params.pageSize))
  if (params.sort) usp.set('sort', params.sort)
  if (params.query) usp.set('q', params.query)
  return usp.toString()
}

export async function fetchBoards(): Promise<BoardSummary[]> {
  try {
    const response = await apiRequest<ListResponse<BoardSummary>>('/boards')
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data
    }
    return DEFAULT_BOARDS
  } catch (error) {
    console.warn('Falling back to default board configuration:', error)
    return DEFAULT_BOARDS
  }
}

export async function fetchPosts(params: FetchPostsParams = {}): Promise<ListResponse<PostSummary>> {
  const query = toQueryString(params)
  return apiRequest<ListResponse<PostSummary>>(query ? `/posts?${query}` : '/posts')
}

export async function fetchPopularPosts(): Promise<PostSummary[]> {
  try {
    return await apiRequest<PostSummary[]>('/posts/popular')
  } catch (error) {
    console.warn('Popular posts endpoint unavailable:', error)
    return []
  }
}

export async function fetchPostDetail(postId: string): Promise<PostDetail> {
  return apiRequest<PostDetail>(`/posts/${postId}`)
}

export async function createPost(payload: CreatePostPayload) {
  const formData = new FormData()
  formData.set('boardId', payload.boardId)
  formData.set('title', payload.title)
  formData.set('content', payload.content)
  formData.set('authorNick', payload.authorNick)
  formData.set('password', payload.password)
  payload.tags?.forEach((tag) => formData.append('tags[]', tag))
  payload.attachments?.forEach((file) => formData.append('attachments', file))

  return apiRequest<PostDetail>('/posts', {
    method: 'POST',
    body: formData,
  })
}

export async function submitVote(payload: VoteRequest) {
  const body: Record<string, unknown> = { type: payload.type }
  if (payload.userId) {
    body.userId = payload.userId
  }

  return apiRequest(`/posts/${payload.postId}/vote`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function submitComment(payload: CreateCommentPayload) {
  return apiRequest(`/posts/${payload.postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
