import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

type Bindings = {
  DB: D1Database;
}

export const communityRoutes = new Hono<{ Bindings: Bindings }>()

// Helper function to generate session token
const generateSessionToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Helper function to hash IP
const hashIP = (ip: string) => {
  return btoa(ip).slice(0, 10) // Simple hash for demo
}

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  category_id: z.number().int().positive(),
  author_name: z.string().optional(),
  is_anonymous: z.boolean().default(true)
})

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parent_id: z.number().int().positive().optional(),
  author_name: z.string().optional(),
  is_anonymous: z.boolean().default(true)
})

// Get categories
communityRoutes.get('/categories', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM categories 
      WHERE active = true 
      ORDER BY sort_order, id
    `).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500)
  }
})

// Get posts with pagination and filtering
communityRoutes.get('/posts', async (c) => {
  const category = c.req.query('category')
  const sort = c.req.query('sort') || 'latest' // latest, hot, popular
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  try {
    let query = `
      SELECT 
        p.id, p.title, p.content, p.is_anonymous, p.author_name,
        p.view_count, p.like_count, p.comment_count, p.is_hot, p.is_pinned,
        p.created_at, p.updated_at,
        c.label as category_label, c.key as category_key
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `
    
    const params: any[] = []
    
    if (category) {
      query += ` AND c.key = ?`
      params.push(category)
    }
    
    // Sorting
    switch (sort) {
      case 'hot':
        query += ` ORDER BY p.is_pinned DESC, p.is_hot DESC, p.like_count DESC, p.created_at DESC`
        break
      case 'popular':
        query += ` ORDER BY p.is_pinned DESC, (p.like_count * 2 + p.comment_count) DESC, p.created_at DESC`
        break
      default: // latest
        query += ` ORDER BY p.is_pinned DESC, p.created_at DESC`
    }
    
    query += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'`
    const countParams: any[] = []
    
    if (category) {
      countQuery += ` AND c.key = ?`
      countParams.push(category)
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0
    
    return c.json({
      success: true,
      data: result.results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return c.json({ success: false, error: 'Failed to fetch posts' }, 500)
  }
})

// Get single post with comments
communityRoutes.get('/posts/:id', async (c) => {
  const postId = c.req.param('id')
  
  try {
    // Get post
    const post = await c.env.DB.prepare(`
      SELECT 
        p.id, p.title, p.content, p.is_anonymous, p.author_name,
        p.view_count, p.like_count, p.comment_count, p.is_hot, p.is_pinned,
        p.created_at, p.updated_at,
        c.label as category_label, c.key as category_key
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.status = 'active'
    `).bind(postId).first()
    
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    
    // Increment view count
    await c.env.DB.prepare(`
      UPDATE posts SET view_count = view_count + 1 WHERE id = ?
    `).bind(postId).run()
    
    // Get comments
    const comments = await c.env.DB.prepare(`
      SELECT 
        id, content, parent_id, is_anonymous, author_name,
        like_count, is_best, created_at, updated_at
      FROM comments
      WHERE post_id = ? AND status = 'active'
      ORDER BY is_best DESC, created_at ASC
    `).bind(postId).all()
    
    return c.json({
      success: true,
      data: {
        post: { ...post, view_count: (post.view_count || 0) + 1 },
        comments: comments.results
      }
    })
  } catch (error) {
    console.error('Failed to fetch post:', error)
    return c.json({ success: false, error: 'Failed to fetch post' }, 500)
  }
})

// Create new post
communityRoutes.post('/posts', zValidator('json', createPostSchema), async (c) => {
  const data = c.req.valid('json')
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const sessionToken = generateSessionToken()
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO posts (
        title, content, category_id, author_name, is_anonymous,
        author_ip, session_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.title,
      data.content,
      data.category_id,
      data.author_name || null,
      data.is_anonymous,
      hashIP(clientIP),
      sessionToken
    ).run()
    
    // Update category post count if needed
    await c.env.DB.prepare(`
      UPDATE posts SET comment_count = 0 WHERE id = ?
    `).bind(result.meta.last_row_id).run()
    
    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        session_token: sessionToken // Return for future edits
      }
    })
  } catch (error) {
    console.error('Failed to create post:', error)
    return c.json({ success: false, error: 'Failed to create post' }, 500)
  }
})

// Create comment
communityRoutes.post('/posts/:postId/comments', zValidator('json', createCommentSchema), async (c) => {
  const postId = c.req.param('postId')
  const data = c.req.valid('json')
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const sessionToken = generateSessionToken()
  
  try {
    // Check if post exists
    const post = await c.env.DB.prepare(`
      SELECT id FROM posts WHERE id = ? AND status = 'active'
    `).bind(postId).first()
    
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO comments (
        post_id, content, parent_id, author_name, is_anonymous,
        author_ip, session_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      data.content,
      data.parent_id || null,
      data.author_name || null,
      data.is_anonymous,
      hashIP(clientIP),
      sessionToken
    ).run()
    
    // Update post comment count
    await c.env.DB.prepare(`
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?
    `).bind(postId).run()
    
    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        session_token: sessionToken
      }
    })
  } catch (error) {
    console.error('Failed to create comment:', error)
    return c.json({ success: false, error: 'Failed to create comment' }, 500)
  }
})

// Like post or comment
communityRoutes.post('/like', async (c) => {
  const { target_type, target_id } = await c.req.json()
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const userIdentifier = hashIP(clientIP)
  
  if (!['post', 'comment'].includes(target_type)) {
    return c.json({ success: false, error: 'Invalid target type' }, 400)
  }
  
  try {
    // Check if already liked
    const existing = await c.env.DB.prepare(`
      SELECT id FROM likes 
      WHERE target_type = ? AND target_id = ? AND user_identifier = ?
    `).bind(target_type, target_id, userIdentifier).first()
    
    if (existing) {
      // Unlike
      await c.env.DB.prepare(`
        DELETE FROM likes 
        WHERE target_type = ? AND target_id = ? AND user_identifier = ?
      `).bind(target_type, target_id, userIdentifier).run()
      
      // Update count
      const table = target_type === 'post' ? 'posts' : 'comments'
      await c.env.DB.prepare(`
        UPDATE ${table} SET like_count = like_count - 1 WHERE id = ?
      `).bind(target_id).run()
      
      return c.json({ success: true, action: 'unliked' })
    } else {
      // Like
      await c.env.DB.prepare(`
        INSERT INTO likes (target_type, target_id, user_identifier)
        VALUES (?, ?, ?)
      `).bind(target_type, target_id, userIdentifier).run()
      
      // Update count
      const table = target_type === 'post' ? 'posts' : 'comments'
      await c.env.DB.prepare(`
        UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?
      `).bind(target_id).run()
      
      return c.json({ success: true, action: 'liked' })
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
    return c.json({ success: false, error: 'Failed to toggle like' }, 500)
  }
})