import axios from 'axios'
import { apiClient } from './client'
import type { Post, PostComment, PostResponse, PostsResponse } from '../types/post'

export interface ListPostsParams {
  limit?: number
  page?: number
}

export interface CreatePostPayload {
  title: string
  content: string
  author: string
  password: string
  category?: string
  instagram?: string | null
  images?: string[]
  poll?: Post['poll']
}

export interface DeletePostPayload {
  id: number | string
  password?: string
}

export interface VotePostPayload {
  id: number | string
  userId: string
  type: 'like' | 'dislike'
}

export interface CreateCommentPayload {
  postId: number | string
  content: string
  author?: string
  instagram?: string | null
}

const POSTS_ENDPOINT = '/api/posts'

export async function getPosts(params?: ListPostsParams): Promise<Post[]> {
  const { data } = await apiClient.get<PostsResponse>(POSTS_ENDPOINT, { params })
  if (!data?.success) {
    throw new Error('게시글 목록을 불러오지 못했습니다.')
  }
  return data.posts ?? []
}

export async function getPost(id: number | string): Promise<Post> {
  try {
    const { data } = await apiClient.get<PostResponse>(`${POSTS_ENDPOINT}/${id}`)
    if (data?.post) {
      return data.post
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const posts = await getPosts()
      const match = posts.find((post) => String(post.id) === String(id))
      if (match) {
        return match
      }
    }
    throw error
  }

  throw new Error('게시글을 찾을 수 없습니다.')
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const { data } = await apiClient.post<{ success: boolean; post: Post }>(POSTS_ENDPOINT, payload)
  if (!data?.success || !data.post) {
    throw new Error('게시글을 작성하지 못했습니다.')
  }
  return data.post
}

export async function deletePost({ id, password }: DeletePostPayload) {
  const { data } = await apiClient.delete<{ success: boolean; message?: string }>(
    `${POSTS_ENDPOINT}/${id}`,
    { data: { password } }
  )
  if (!data?.success) {
    throw new Error(data?.message ?? '게시글을 삭제하지 못했습니다.')
  }
  return data
}

export async function votePost({ id, userId, type }: VotePostPayload): Promise<Post> {
  const { data } = await apiClient.post<{ success: boolean; post: Post }>(
    `${POSTS_ENDPOINT}/${id}/vote`,
    { userId, type }
  )
  if (!data?.success || !data.post) {
    throw new Error('투표 처리에 실패했습니다.')
  }
  return data.post
}

export async function createComment({ postId, author, content, instagram }: CreateCommentPayload): Promise<PostComment> {
  const { data } = await apiClient.post<{ success: boolean; comment: PostComment }>(
    `${POSTS_ENDPOINT}/${postId}/comments`,
    {
      author,
      content,
      instagram,
    }
  )
  if (!data?.success || !data.comment) {
    throw new Error('댓글을 작성하지 못했습니다.')
  }
  return data.comment
}

export const postsApi = {
  getPosts,
  getPost,
  createPost,
  deletePost,
  votePost,
  createComment,
}
