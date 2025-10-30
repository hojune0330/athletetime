/**
 * 🏃 Athlete Time Community - 통합 서버
 * Version: 3.0.0
 * 
 * 핵심 기능:
 * 1. PostgreSQL (회원 시스템 기반)
 * 2. Cloudinary (이미지 CDN)
 * 3. WebSocket (실시간 알림)
 * 4. 익명 → 닉네임 → 회원 마이그레이션 지원
 * 5. 사용자 히스토리 & 프로필
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// 인증 라우터
const authRoutes = require('./auth/routes');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3005;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://athlete-time.netlify.app';

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer (이미지 업로드)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }
});

// ============================================
// 인증 API 라우터 등록
// ============================================
app.use('/api/auth', authRoutes);

// ============================================
// 헬스체크
// ============================================
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      cloudinary: cloudinary.config().cloud_name ? 'configured' : 'not configured',
      websocket: wss.clients.size + ' clients',
      version: '3.0.0'
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ============================================
// 게시글 목록 조회 (PostgreSQL 기반)
// ============================================
app.get('/api/posts', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        p.*,
        p.views as views_count,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        u.username,
        (SELECT COUNT(*) FROM images WHERE post_id = p.id) as images_count,
        (SELECT json_agg(json_build_object(
          'id', i.id,
          'cloudinary_url', i.cloudinary_url,
          'thumbnail_url', i.thumbnail_url
        )) FROM images i WHERE i.post_id = p.id) as images
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL AND p.is_blinded = FALSE
    `;
    
    const params = [];
    if (category) {
      params.push(category);
      query += ` AND c.name = $${params.length}`;
    }
    
    query += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      posts: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('게시글 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 게시글 상세 조회
// ============================================
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 조회수 증가
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = $1', [id]);
    
    // 게시글 상세 조회
    const result = await pool.query(`
      SELECT 
        p.*,
        p.views as views_count,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        u.username,
        (SELECT json_agg(json_build_object(
          'id', i.id,
          'cloudinary_url', i.cloudinary_url,
          'thumbnail_url', i.thumbnail_url,
          'width', i.width,
          'height', i.height
        ) ORDER BY i.sort_order) FROM images i WHERE i.post_id = p.id) as images,
        (SELECT json_agg(json_build_object(
          'id', cm.id,
          'content', cm.content,
          'author', cm.author,
          'instagram', cm.instagram,
          'created_at', cm.created_at,
          'is_blinded', cm.is_blinded
        ) ORDER BY cm.created_at ASC) FROM comments cm WHERE cm.post_id = p.id AND cm.deleted_at IS NULL) as comments
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }
    
    res.json({
      success: true,
      post: result.rows[0]
    });
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 게시글 작성 (Cloudinary 이미지 업로드)
// ============================================
app.post('/api/posts', upload.array('images', 5), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { title, content, author, password, category, instagram } = req.body;
    const anonymousId = req.body.anonymousId || `anon_${Date.now()}`;
    
    // 사용자 확인 또는 생성
    let userResult = await client.query(
      'SELECT * FROM users WHERE anonymous_id = $1',
      [anonymousId]
    );
    
    if (userResult.rows.length === 0) {
      userResult = await client.query(
        'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING *',
        [anonymousId, author]
      );
    }
    
    const userId = userResult.rows[0].id;
    
    // 비밀번호 해시
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    
    // 카테고리 ID 조회
    const categoryResult = await client.query(
      'SELECT id FROM categories WHERE name = $1',
      [category || '자유']
    );
    
    const categoryId = categoryResult.rows[0]?.id || 2;
    
    // 게시글 생성
    const postResult = await client.query(`
      INSERT INTO posts (
        category_id, user_id, title, content, author, password_hash, instagram
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [categoryId, userId, title, content, author, passwordHash, instagram]);
    
    const post = postResult.rows[0];
    
    // 이미지 업로드 (Cloudinary)
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({
            folder: 'athlete-time/posts',
            transformation: [
              { width: 1920, height: 1920, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
          
          uploadStream.end(file.buffer);
        });
        
        await client.query(`
          INSERT INTO images (
            post_id, cloudinary_id, cloudinary_url, thumbnail_url,
            original_filename, file_size, width, height, format, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          post.id,
          uploadResult.public_id,
          uploadResult.secure_url,
          uploadResult.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
          file.originalname,
          uploadResult.bytes,
          uploadResult.width,
          uploadResult.height,
          uploadResult.format,
          i
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    // WebSocket 알림
    broadcastToClients({
      type: 'new_post',
      post: { ...post, author }
    });
    
    res.json({
      success: true,
      post,
      message: '게시글이 작성되었습니다'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('게시글 작성 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// 댓글 작성
// ============================================
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, author, instagram, anonymousId } = req.body;
    
    // 사용자 확인
    let userResult = await pool.query(
      'SELECT id FROM users WHERE anonymous_id = $1',
      [anonymousId || `anon_${Date.now()}`]
    );
    
    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING id',
        [anonymousId || `anon_${Date.now()}`, author]
      );
    }
    
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO comments (post_id, user_id, content, author, instagram)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, userId, content, author, instagram]);
    
    // WebSocket 알림
    broadcastToClients({
      type: 'new_comment',
      postId: id,
      comment: result.rows[0]
    });
    
    res.json({
      success: true,
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 투표 (좋아요/싫어요)
// ============================================
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, anonymousId } = req.body; // type: 'like' or 'dislike'
    
    // 사용자 확인
    let userResult = await pool.query(
      'SELECT id FROM users WHERE anonymous_id = $1',
      [anonymousId || `anon_${Date.now()}`]
    );
    
    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING id',
        [anonymousId || `anon_${Date.now()}`, 'Anonymous']
      );
    }
    
    const userId = userResult.rows[0].id;
    
    // 기존 투표 확인
    const existingVote = await pool.query(
      'SELECT * FROM votes WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (existingVote.rows.length > 0) {
      // 투표 변경
      await pool.query(
        'UPDATE votes SET vote_type = $1 WHERE post_id = $2 AND user_id = $3',
        [type, id, userId]
      );
    } else {
      // 새 투표
      await pool.query(
        'INSERT INTO votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [id, userId, type]
      );
    }
    
    // 최신 카운트 조회
    const countResult = await pool.query(
      'SELECT likes_count, dislikes_count FROM posts WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      likes: countResult.rows[0].likes_count,
      dislikes: countResult.rows[0].dislikes_count
    });
  } catch (error) {
    console.error('투표 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WebSocket 브로드캐스트
// ============================================
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket 연결
wss.on('connection', (ws) => {
  console.log('✅ WebSocket 클라이언트 연결됨');
  
  ws.on('message', (message) => {
    console.log('📨 수신:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('❌ WebSocket 클라이언트 연결 종료');
  });
});

// ============================================
// 서버 시작
// ============================================
server.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🏃 Athlete Time Community Server v3.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 
 🚀 서버: http://localhost:${PORT}
 📊 PostgreSQL: ${pool.options.connectionString ? '연결됨' : '미연결'}
 🌥️  Cloudinary: ${cloudinary.config().cloud_name || '미설정'}
 📡 WebSocket: 활성화
 
 환경: ${NODE_ENV}
 프론트엔드: ${FRONTEND_URL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM 수신, 서버 종료 중...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

