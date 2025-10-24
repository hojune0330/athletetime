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
  views: number
  likes: string[]
  dislikes: string[]
  comments: PostComment[]
  reports?: string[]
  isNotice?: boolean
  isAdmin?: boolean
  isBlinded?: boolean
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
