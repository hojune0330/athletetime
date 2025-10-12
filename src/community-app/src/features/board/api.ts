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
import { mockBoards, mockPopularPosts, mockPostDetail, mockPosts } from './mocks'

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
    return response.data
  } catch (error) {
    console.warn('Falling back to mock board data:', error)
    return mockBoards
  }
}

export async function fetchPosts(params: FetchPostsParams = {}): Promise<ListResponse<PostSummary>> {
  try {
    const query = toQueryString(params)
    const response = await apiRequest<ListResponse<PostSummary>>(
      query ? `/posts?${query}` : '/posts',
    )
    return response
  } catch (error) {
    console.warn('Falling back to mock post data:', error)
    return {
      data: mockPosts,
      meta: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        totalItems: mockPosts.length,
        totalPages: 1,
      },
    }
  }
}

export async function fetchPopularPosts(): Promise<PostSummary[]> {
  try {
    const response = await apiRequest<PostSummary[]>('/posts/popular')
    return response
  } catch (error) {
    console.warn('Falling back to mock popular post data:', error)
    return mockPopularPosts
  }
}

export async function fetchPostDetail(postId: string): Promise<PostDetail> {
  try {
    const response = await apiRequest<PostDetail>(`/posts/${postId}`)
    return response
  } catch (error) {
    console.warn('Falling back to mock post detail data:', error)
    return mockPostDetail
  }
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
  return apiRequest(`/posts/${payload.postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ type: payload.type }),
  })
}

export async function submitComment(payload: CreateCommentPayload) {
  return apiRequest(`/posts/${payload.postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
