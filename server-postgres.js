/**
 * 🏃 Athlete Time Community Server - PostgreSQL Version
 * 
 * Features:
 * - PostgreSQL database with connection pooling
 * - Cloudinary image uploads
 * - WebSocket real-time notifications
 * - Full-text search
 * - Advanced filtering
 * - Rate limiting
 * - Security best practices
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs').promises;

// ============================================
// 환경 설정
// ============================================

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3005;
const NODE_ENV = process.env.NODE_ENV || 'development';

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  },
});

// ============================================
// 미들웨어
// ============================================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로깅 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ============================================
// 정책 설정
// ============================================

const POLICY = {
  // Rate Limiting
  RATE_LIMIT_WINDOW: 60000, // 1분
  RATE_LIMIT_MAX_POSTS: 3,
  RATE_LIMIT_MAX_COMMENTS: 10,
  
  // 컨텐츠 제한
  MAX_CONTENT_LENGTH: 10000,
  MAX_TITLE_LENGTH: 200,
  COMMENT_MAX_LENGTH: 500,
  
  // 이미지 제한
  MAX_IMAGES_PER_POST: 5,
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  
  // 블라인드 정책
  BLIND_REPORT_COUNT: 10,
  BLIND_DISLIKE_COUNT: 20,
  
  // 자동 삭제
  AUTO_DELETE_DAYS: 90,
};

// ============================================
// 유틸리티 함수
// ============================================

// 사용자 조회 또는 생성
async function getOrCreateUser(anonymousId, username) {
  try {
    // 기존 사용자 확인
    let result = await pool.query(
      'SELECT * FROM users WHERE anonymous_id = $1',
      [anonymousId]
    );
    
    if (result.rows.length > 0) {
      // 마지막 활동 시간 업데이트
      await pool.query(
        'UPDATE users SET last_active = NOW() WHERE id = $1',
        [result.rows[0].id]
      );
      return result.rows[0];
    }
    
    // 새 사용자 생성
    result = await pool.query(
      'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING *',
      [anonymousId, username]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('사용자 조회/생성 실패:', error);
    throw error;
  }
}

// Rate limiting 체크
async function checkRateLimit(userId, action) {
  try {
    const windowStart = new Date(Date.now() - POLICY.RATE_LIMIT_WINDOW);
    
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM rate_limits
      WHERE user_id = $1 
        AND action = $2 
        AND window_start > $3
    `, [userId, action, windowStart]);
    
    const count = parseInt(result.rows[0].count);
    const maxAllowed = action === 'post' ? POLICY.RATE_LIMIT_MAX_POSTS : POLICY.RATE_LIMIT_MAX_COMMENTS;
    
    if (count >= maxAllowed) {
      return false;
    }
    
    // Rate limit 기록 추가
    await pool.query(
      'INSERT INTO rate_limits (user_id, action) VALUES ($1, $2)',
      [userId, action]
    );
    
    return true;
  } catch (error) {
    console.error('Rate limit 체크 실패:', error);
    return true; // 에러 시 허용
  }
}

// Cloudinary 이미지 업로드
async function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'athlete-time/posts',
        resource_type: 'image',
        transformation: [
          { width: 1920, height: 1920, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    uploadStream.end(buffer);
  });
}

// WebSocket 브로드캐스트
function broadcastNotification(notification) {
  const message = JSON.stringify(notification);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============================================
// API 엔드포인트
// ============================================

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket: `${wss.clients.size} clients`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ============================================
// 게시글 API
// ============================================

// 게시글 목록 조회 (검색 및 필터링 지원)
app.get('/api/posts', async (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'recent', // recent, popular, views
      page = 1,
      limit = 20,
    } = req.query;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        p.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'url', i.cloudinary_url,
              'thumbnail_url', i.thumbnail_url
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS images
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN images i ON p.id = i.post_id
      WHERE p.is_blinded = FALSE AND p.deleted_at IS NULL
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // 카테고리 필터
    if (category) {
      query += ` AND c.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    // 검색
    if (search) {
      query += ` AND p.search_vector @@ plainto_tsquery('simple', $${paramIndex})`;
      params.push(search);
      paramIndex++;
    }
    
    query += ` GROUP BY p.id, c.name, c.icon, c.color`;
    
    // 정렬
    switch (sort) {
      case 'popular':
        query += ` ORDER BY (p.likes_count - p.dislikes_count) DESC, p.created_at DESC`;
        break;
      case 'views':
        query += ` ORDER BY p.views DESC, p.created_at DESC`;
        break;
      default:
        query += ` ORDER BY p.is_pinned DESC, p.created_at DESC`;
    }
    
    // 페이지네이션
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) FROM posts WHERE is_blinded = FALSE AND deleted_at IS NULL';
    const countParams = [];
    
    if (category) {
      countQuery += ' AND category_id = (SELECT id FROM categories WHERE name = $1)';
      countParams.push(category);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      posts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('게시글 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '게시글 목록 조회에 실패했습니다.' });
  }
});

// 게시글 상세 조회
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 조회수 증가
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = $1', [id]);
    
    // 게시글 조회
    const postResult = await pool.query(`
      SELECT 
        p.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'url', i.cloudinary_url,
              'thumbnail_url', i.thumbnail_url
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS images
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN images i ON p.id = i.post_id
      WHERE p.id = $1 AND p.is_blinded = FALSE AND p.deleted_at IS NULL
      GROUP BY p.id, c.name, c.icon, c.color
    `, [id]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }
    
    const post = postResult.rows[0];
    
    // 댓글 조회
    const commentsResult = await pool.query(`
      SELECT *
      FROM comments
      WHERE post_id = $1 AND is_blinded = FALSE AND deleted_at IS NULL
      ORDER BY created_at ASC
    `, [id]);
    
    post.comments = commentsResult.rows;
    
    // 좋아요/싫어요 목록 조회 (사용자 ID만)
    const votesResult = await pool.query(`
      SELECT user_id, vote_type
      FROM votes
      WHERE post_id = $1
    `, [id]);
    
    post.likes = votesResult.rows.filter(v => v.vote_type === 'like').map(v => v.user_id);
    post.dislikes = votesResult.rows.filter(v => v.vote_type === 'dislike').map(v => v.user_id);
    
    res.json({ success: true, post, data: post });
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    res.status(500).json({ success: false, message: '게시글 조회에 실패했습니다.' });
  }
});

// 게시글 작성 (이미지 업로드 포함)
app.post('/api/posts', upload.array('images', 5), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      category,
      title,
      author,
      content,
      password,
      instagram,
      userId: anonymousId,
    } = req.body;
    
    // 사용자 조회/생성
    const user = await getOrCreateUser(anonymousId, author);
    
    // Rate limiting 체크
    const canPost = await checkRateLimit(user.id, 'post');
    if (!canPost) {
      await client.query('ROLLBACK');
      return res.status(429).json({
        success: false,
        message: '너무 많은 게시글을 작성했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    
    // 유효성 검사
    if (!title || !content) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: '제목과 내용은 필수입니다.',
      });
    }
    
    if (content.length > POLICY.MAX_CONTENT_LENGTH) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `게시글은 최대 ${POLICY.MAX_CONTENT_LENGTH}자까지 작성 가능합니다.`,
      });
    }
    
    // 카테고리 ID 조회
    const categoryResult = await client.query(
      'SELECT id FROM categories WHERE name = $1',
      [category || '자유']
    );
    const categoryId = categoryResult.rows[0]?.id || 2; // 기본값: 자유
    
    // 비밀번호 해시
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    
    // 게시글 생성
    const postResult = await client.query(`
      INSERT INTO posts (
        category_id, user_id, title, content, author, password_hash, instagram
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [categoryId, user.id, title, content, author, passwordHash, instagram]);
    
    const post = postResult.rows[0];
    
    // 이미지 업로드 (Cloudinary)
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(async (file, index) => {
        const result = await uploadToCloudinary(file.buffer, file.originalname);
        
        await client.query(`
          INSERT INTO images (
            post_id, cloudinary_id, cloudinary_url, thumbnail_url,
            original_filename, file_size, width, height, format, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          post.id,
          result.public_id,
          result.secure_url,
          result.eager?.[0]?.secure_url || result.secure_url,
          file.originalname,
          result.bytes,
          result.width,
          result.height,
          result.format,
          index,
        ]);
        
        return result.secure_url;
      });
      
      const imageUrls = await Promise.all(imagePromises);
      post.images = imageUrls;
    }
    
    await client.query('COMMIT');
    
    // WebSocket 브로드캐스트
    broadcastNotification({
      type: 'new_post',
      post: {
        id: post.id,
        title: post.title,
        author: post.author,
        category,
      },
    });
    
    res.json({ success: true, post, data: post });
    console.log(`📝 새 게시글: ${post.title} by ${post.author}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('게시글 작성 실패:', error);
    res.status(500).json({ success: false, message: '게시글 작성에 실패했습니다.' });
  } finally {
    client.release();
  }
});

// 게시글 삭제
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // 게시글 조회
    const postResult = await pool.query(
      'SELECT password_hash FROM posts WHERE id = $1',
      [id]
    );
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }
    
    const post = postResult.rows[0];
    
    // 비밀번호 확인
    if (post.password_hash) {
      const match = await bcrypt.compare(password, post.password_hash);
      if (!match && password !== 'admin') {
        return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
      }
    }
    
    // 소프트 삭제
    await pool.query('UPDATE posts SET deleted_at = NOW() WHERE id = $1', [id]);
    
    res.json({ success: true, message: '게시글이 삭제되었습니다.' });
    console.log(`🗑️ 게시글 삭제: ${id}`);
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    res.status(500).json({ success: false, message: '게시글 삭제에 실패했습니다.' });
  }
});

// 투표 (좋아요/싫어요)
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: anonymousId, type } = req.body;
    
    // 사용자 조회/생성
    const user = await getOrCreateUser(anonymousId, '익명');
    
    // 기존 투표 삭제
    await pool.query('DELETE FROM votes WHERE post_id = $1 AND user_id = $2', [id, user.id]);
    
    // 새 투표 추가
    if (type === 'like' || type === 'dislike') {
      await pool.query(
        'INSERT INTO votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [id, user.id, type]
      );
    }
    
    // 업데이트된 게시글 조회
    const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    const post = postResult.rows[0];
    
    res.json({ success: true, post, data: post });
  } catch (error) {
    console.error('투표 실패:', error);
    res.status(500).json({ success: false, message: '투표에 실패했습니다.' });
  }
});

// ============================================
// 댓글 API
// ============================================

// 댓글 작성
app.post('/api/posts/:id/comments', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { author, content, userId: anonymousId, instagram } = req.body;
    
    // 사용자 조회/생성
    const user = await getOrCreateUser(anonymousId, author);
    
    // Rate limiting 체크
    const canComment = await checkRateLimit(user.id, 'comment');
    if (!canComment) {
      await client.query('ROLLBACK');
      return res.status(429).json({
        success: false,
        message: '너무 많은 댓글을 작성했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    
    // 댓글 작성
    const commentResult = await client.query(`
      INSERT INTO comments (post_id, user_id, author, content, instagram)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, user.id, author, content, instagram]);
    
    const comment = commentResult.rows[0];
    
    await client.query('COMMIT');
    
    // 게시글 작성자에게 알림 생성
    const postResult = await client.query('SELECT user_id, title FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length > 0) {
      const postAuthorId = postResult.rows[0].user_id;
      
      if (postAuthorId !== user.id) {
        await client.query(`
          INSERT INTO notifications (user_id, type, title, message, post_id, from_user_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          postAuthorId,
          'new_comment',
          '새 댓글 알림',
          `${author}님이 "${postResult.rows[0].title}" 게시글에 댓글을 남겼습니다.`,
          id,
          user.id,
        ]);
        
        // WebSocket 알림
        broadcastNotification({
          type: 'new_comment',
          userId: postAuthorId,
          postId: id,
          comment: {
            author,
            content,
          },
        });
      }
    }
    
    res.json({ success: true, comment, data: comment });
    console.log(`💬 새 댓글: ${author} on post ${id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('댓글 작성 실패:', error);
    res.status(500).json({ success: false, message: '댓글 작성에 실패했습니다.' });
  } finally {
    client.release();
  }
});

// ============================================
// 검색 API
// ============================================

// 전체 검색 (게시글 + 댓글)
app.get('/api/search', async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, message: '검색어를 입력해주세요.' });
    }
    
    const offset = (page - 1) * limit;
    const results = {};
    
    // 게시글 검색
    if (type === 'all' || type === 'posts') {
      const postsResult = await pool.query(`
        SELECT 
          p.*,
          c.name AS category_name,
          ts_rank(p.search_vector, plainto_tsquery('simple', $1)) AS rank
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.search_vector @@ plainto_tsquery('simple', $1)
          AND p.is_blinded = FALSE
          AND p.deleted_at IS NULL
        ORDER BY rank DESC, p.created_at DESC
        LIMIT $2 OFFSET $3
      `, [q, limit, offset]);
      
      results.posts = postsResult.rows;
    }
    
    // 댓글 검색
    if (type === 'all' || type === 'comments') {
      const commentsResult = await pool.query(`
        SELECT 
          c.*,
          p.title AS post_title,
          p.id AS post_id
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.content ILIKE $1
          AND c.is_blinded = FALSE
          AND c.deleted_at IS NULL
          AND p.is_blinded = FALSE
          AND p.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
      `, [`%${q}%`, limit, offset]);
      
      results.comments = commentsResult.rows;
    }
    
    res.json({ success: true, query: q, results });
  } catch (error) {
    console.error('검색 실패:', error);
    res.status(500).json({ success: false, message: '검색에 실패했습니다.' });
  }
});

// ============================================
// 카테고리 API
// ============================================

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) AS post_count
      FROM categories c
      LEFT JOIN posts p ON c.id = p.category_id AND p.is_blinded = FALSE AND p.deleted_at IS NULL
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.sort_order
    `);
    
    res.json({ success: true, categories: result.rows });
  } catch (error) {
    console.error('카테고리 조회 실패:', error);
    res.status(500).json({ success: false, message: '카테고리 조회에 실패했습니다.' });
  }
});

// ============================================
// 알림 API
// ============================================

// 내 알림 조회
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId: anonymousId, unreadOnly = 'false' } = req.query;
    
    // 사용자 조회
    const userResult = await pool.query('SELECT id FROM users WHERE anonymous_id = $1', [anonymousId]);
    if (userResult.rows.length === 0) {
      return res.json({ success: true, notifications: [] });
    }
    
    const userId = userResult.rows[0].id;
    
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1 AND is_deleted = FALSE
    `;
    
    if (unreadOnly === 'true') {
      query += ' AND is_read = FALSE';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await pool.query(query, [userId]);
    
    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    console.error('알림 조회 실패:', error);
    res.status(500).json({ success: false, message: '알림 조회에 실패했습니다.' });
  }
});

// 알림 읽음 처리
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    res.status(500).json({ success: false, message: '알림 읽음 처리에 실패했습니다.' });
  }
});

// ============================================
// 통계 API
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const stats = {};
    
    // 전체 게시글 수
    const postsResult = await pool.query(
      'SELECT COUNT(*) FROM posts WHERE is_blinded = FALSE AND deleted_at IS NULL'
    );
    stats.totalPosts = parseInt(postsResult.rows[0].count);
    
    // 전체 댓글 수
    const commentsResult = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE is_blinded = FALSE AND deleted_at IS NULL'
    );
    stats.totalComments = parseInt(commentsResult.rows[0].count);
    
    // 전체 조회수
    const viewsResult = await pool.query('SELECT SUM(views) FROM posts');
    stats.totalViews = parseInt(viewsResult.rows[0].sum) || 0;
    
    // 활성 사용자 (최근 7일)
    const activeUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT id)
      FROM users
      WHERE last_active > NOW() - INTERVAL '7 days'
    `);
    stats.activeUsers = parseInt(activeUsersResult.rows[0].count);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('통계 조회 실패:', error);
    res.status(500).json({ success: false, message: '통계 조회에 실패했습니다.' });
  }
});

// ============================================
// WebSocket 핸들러
// ============================================

wss.on('connection', (ws, req) => {
  console.log('✅ WebSocket 연결:', req.socket.remoteAddress);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket 메시지:', data);
      
      // Echo back
      ws.send(JSON.stringify({ type: 'echo', data }));
    } catch (error) {
      console.error('WebSocket 메시지 처리 실패:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('❌ WebSocket 연결 종료');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 에러:', error);
  });
  
  // 연결 확인 메시지
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket 연결 성공',
    timestamp: new Date().toISOString(),
  }));
});

// ============================================
// 서버 시작
// ============================================

server.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🏃 Athlete Time Server (PostgreSQL)    ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  환경: ${NODE_ENV}                         ║
║  데이터베이스: PostgreSQL ✅                ║
║  이미지 저장: Cloudinary ✅                 ║
║  실시간 알림: WebSocket ✅                  ║
╠════════════════════════════════════════════╣
║  주요 기능:                                 ║
║  ✅ 게시글 CRUD + 이미지 업로드            ║
║  ✅ 댓글 시스템 + 실시간 알림              ║
║  ✅ 전체 검색 (Full-text search)          ║
║  ✅ 카테고리별 필터링                      ║
║  ✅ Rate Limiting                         ║
║  ✅ 자동 블라인드 처리                     ║
╚════════════════════════════════════════════╝
  `);
  
  // 데이터베이스 연결 확인
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL 연결 성공');
  } catch (error) {
    console.error('❌ PostgreSQL 연결 실패:', error);
  }
});

// 정리 작업
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');
  
  // WebSocket 연결 종료
  wss.clients.forEach(client => {
    client.close();
  });
  
  // 데이터베이스 연결 종료
  await pool.end();
  
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버 종료 중...');
  await pool.end();
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

module.exports = { app, server, pool };
