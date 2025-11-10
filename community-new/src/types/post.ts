export interface PostComment {
  id: number | string
  author: string
  content: string
  instagram?: string | null
  date: string
  reports?: string[]
  isBlinded?: boolean
}

export interface PostPollOption {
  text: string
  votes: number
}

export interface PostPoll {
  question: string
  options: PostPollOption[]
  totalVotes: number
}

export interface Post {
  id: number | string
  category?: string
  title: string
  author: string
  content: string
  password?: string | null
  instagram?: string | null
  images?: string[]
  poll?: PostPoll | null
  date: string
  views?: number // 백엔드에서 optional로 변경됨
  likes?: string[] // 백엔드에서 optional로 변경됨
  dislikes?: string[] // 백엔드에서 optional로 변경됨
  comments?: PostComment[] // 백엔드에서 optional로 변경됨
  reports?: string[]
  isNotice?: boolean
  isAdmin?: boolean
  isBlinded?: boolean
  // 백엔드에서 추가된 필드들
  likes_count?: number
  dislikes_count?: number
  comments_count?: number
  is_notice?: boolean
  is_pinned?: boolean
  is_blinded?: boolean
  created_at?: string
  updated_at?: string
  category_id?: number
  category_name?: string
  category_icon?: string
  category_color?: string
  user_id?: string
  username?: string
}

export interface PostsResponse {
  success: boolean
  posts: Post[]
  count?: number
  stats?: {
    totalPosts?: number
    totalViews?: number
    totalComments?: number
    activePosts?: number
  }
}

export interface PostResponse {
  success: boolean
  post: Post
}
