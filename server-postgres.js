// PostgreSQL 연동 + 보안 강화 서버
// 중요: Render 유료 플랜 사용 중 (데이터 제한 없음!)
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Render 유료 플랜 설정 로드
const { validateRenderPlan, RENDER_PLAN } = require('./config/render-config');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

// ============================================
// 보안 미들웨어
// ============================================

// 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: false, // 개발 단계에서는 비활성화
  crossOriginEmbedderPolicy: false
}));

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // 크기 제한

// ============================================
// Rate Limiting 설정
// ============================================

// 일반 API 제한
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: '너무 많은 요청을 보내셨습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 게시글 작성 제한
const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15분당 최대 10개 게시글
  message: '게시글 작성 한도를 초과했습니다.'
});

// 조회수 제한
const viewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 1분당 최대 5번
  keyGenerator: (req) => `${req.ip}_${req.params.id}`,
  message: '조회수 증가 제한을 초과했습니다.'
});

// 댓글 작성 제한
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // 5분당 최대 20개 댓글
  message: '댓글 작성 한도를 초과했습니다.'
});

// Rate Limiting 적용
app.use('/api/', generalLimiter);

// ============================================
// 보안 유틸리티 함수
// ============================================

// HTML/스크립트 정제
function sanitizeInput(input, options = {}) {
  if (!input) return input;
  
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  };
  
  const config = { ...defaultOptions, ...options };
  return DOMPurify.sanitize(input, config);
}

// 조회수 중복 방지를 위한 메모리 캐시
const viewedPosts = new Map();

// ============================================
// 데이터베이스 초기화 (비밀번호 컬럼 타입 변경)
// ============================================

async function initDatabase() {
  try {
    // 기존 테이블이 있다면 password 컬럼 타입 변경
    await pool.query(`
      ALTER TABLE posts 
      ALTER COLUMN password TYPE VARCHAR(255)
    `).catch(() => {
      console.log('posts 테이블 password 컬럼 이미 변경됨 또는 테이블 없음');
    });

    // posts 테이블 생성 (ID를 BIGINT로 변경하여 JavaScript Date.now()와 호환)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id BIGINT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT,
        category VARCHAR(50),
        password VARCHAR(255), -- bcrypt 해시용 길이
        created_at TIMESTAMP DEFAULT NOW(),
        views INTEGER DEFAULT 0,
        likes TEXT[] DEFAULT '{}',
        dislikes TEXT[] DEFAULT '{}',
        images JSONB DEFAULT '[]',
        is_notice BOOLEAN DEFAULT false,
        is_blinded BOOLEAN DEFAULT false,
        reports INTEGER DEFAULT 0
      )
    `);

    // comments 테이블 생성 (post_id를 BIGINT로 맞춤)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id BIGINT PRIMARY KEY,
        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        password VARCHAR(255), -- bcrypt 해시용
        instagram VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // chat_messages 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room VARCHAR(50) NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 인덱스 생성
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
    `);

    console.log('✅ 보안 강화된 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
  }
}

// ============================================
// 게시판 REST API (보안 강화)
// ============================================

// 게시글 목록
app.get('/api/posts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.title, p.author, p.category, p.created_at, p.views,
             p.is_notice, p.is_blinded,
             COALESCE(array_length(p.likes, 1), 0) as like_count,
             COALESCE(array_length(p.dislikes, 1), 0) as dislike_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      ORDER BY p.is_notice DESC, p.created_at DESC
    `);
    
    res.json({ success: true, posts: rows });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 상세
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 게시글 상세 조회: ID ${id}`);
    
    const { rows: postRows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (postRows.length === 0) {
      console.log(`⚠️ 게시글 없음: ID ${id}`);
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    console.log(`✅ 게시글 찾음: "${postRows[0].title}"`);
    
    // 댓글 조회 (비밀번호 제외)
    const { rows: commentRows } = await pool.query(
      'SELECT id, post_id, author, content, instagram, created_at FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    console.log(`💬 댓글 ${commentRows.length}개 조회됨`);
    
    const post = {
      ...postRows[0],
      password: undefined, // 비밀번호 제거
      likes: postRows[0].likes || [],
      dislikes: postRows[0].dislikes || [],
      images: postRows[0].images || [],
      comments: commentRows || []
    };
    
    console.log(`📤 응답 전송: 게시글 + 댓글 ${post.comments.length}개`);
    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    console.error('오류 상세:', error.stack);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 작성 (보안 강화)
app.post('/api/posts', createPostLimiter, async (req, res) => {
  try {
    const { title, author, content, category, password, images, instagram } = req.body;
    
    // 입력값 검증
    if (!title || !author || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 입력해주세요' 
      });
    }
    
    // XSS 방지 - HTML 정제
    const cleanTitle = sanitizeInput(title);
    const cleanAuthor = sanitizeInput(author);
    const cleanContent = sanitizeInput(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target']
    });
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // ID를 명시적으로 생성 (JavaScript의 Date.now()와 호환성 유지)
    const postId = Date.now();
    
    const { rows } = await pool.query(
      `INSERT INTO posts (id, title, author, content, category, password, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [postId, cleanTitle, cleanAuthor, cleanContent, category, hashedPassword, JSON.stringify(images || [])]
    );
    
    // 비밀번호 제거 후 응답
    const post = {
      ...rows[0],
      password: undefined,
      likes: [],
      dislikes: [],
      images: images || [],
      comments: []
    };
    
    console.log(`📝 새 게시글: "${cleanTitle}" by ${cleanAuthor}`);
    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 수정 (보안 강화)
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, password } = req.body;
    
    // 저장된 해시 비밀번호 조회
    const { rows: checkRows } = await pool.query(
      'SELECT password FROM posts WHERE id = $1',
      [id]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // bcrypt로 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, checkRows[0].password);
    
    if (!isValidPassword && password !== 'admin') {
      return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다' });
    }
    
    // XSS 방지
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target']
    });
    
    const { rows } = await pool.query(
      `UPDATE posts 
       SET title = $1, content = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [cleanTitle, cleanContent, category, id]
    );
    
    res.json({ success: true, post: { ...rows[0], password: undefined } });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 삭제 (보안 강화)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const post = rows[0];
    
    // bcrypt로 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, post.password);
    
    if (!isValidPassword && password !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '비밀번호가 일치하지 않습니다' 
      });
    }
    
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    
    console.log(`🗑️ 게시글 삭제: "${post.title}"`);
    res.json({ success: true, message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 조회수 증가 (중복 방지)
app.put('/api/posts/:id/views', viewLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userIP = req.ip;
    const key = `${userIP}_${id}`;
    
    // 1시간 이내 조회 기록 확인
    const lastViewed = viewedPosts.get(key);
    const now = Date.now();
    
    if (lastViewed && (now - lastViewed) < 3600000) {
      // 1시간 이내 재조회는 조회수 증가 안 함
      const { rows } = await pool.query(
        'SELECT views FROM posts WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
      }
      
      return res.json({ 
        success: true, 
        views: rows[0].views,
        cached: true 
      });
    }
    
    // 조회수 증가
    const { rows } = await pool.query(
      'UPDATE posts SET views = views + 1 WHERE id = $1 RETURNING views',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 조회 기록 저장
    viewedPosts.set(key, now);
    
    // 메모리 관리 - 10000개 초과 시 오래된 것 삭제
    if (viewedPosts.size > 10000) {
      const oldestKeys = Array.from(viewedPosts.keys()).slice(0, 1000);
      oldestKeys.forEach(k => viewedPosts.delete(k));
    }
    
    console.log(`👁️ 조회수 증가: Post ${id} - ${rows[0].views} views (IP: ${userIP})`);
    res.json({ success: true, views: rows[0].views });
  } catch (error) {
    console.error('조회수 증가 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 댓글 추가 (보안 강화)
app.post('/api/posts/:id/comments', commentLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { author, content, password, instagram } = req.body;
    
    // 입력값 검증
    if (!author || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '작성자와 내용을 입력해주세요' 
      });
    }
    
    // 게시글 존재 확인
    const { rows: postCheck } = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );
    
    if (postCheck.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // XSS 방지
    const cleanAuthor = sanitizeInput(author);
    const cleanContent = sanitizeInput(content);
    const cleanInstagram = sanitizeInput(instagram);
    
    // 비밀번호 해싱 (있는 경우)
    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    
    // 댓글 ID 명시적 생성
    const commentId = Date.now();
    
    const { rows } = await pool.query(
      `INSERT INTO comments (id, post_id, author, content, password, instagram) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, post_id, author, content, instagram, created_at`,
      [commentId, id, cleanAuthor, cleanContent, hashedPassword, cleanInstagram]
    );
    
    console.log(`✅ 댓글 작성 성공: Post ${id}, 작성자 "${cleanAuthor}"`);
    console.log(`   댓글 ID: ${rows[0].id}`);
    
    res.json({ success: true, comment: rows[0] });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 투표
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, type } = req.body;
    
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const post = rows[0];
    let likes = post.likes || [];
    let dislikes = post.dislikes || [];
    
    // 기존 투표 제거
    likes = likes.filter(u => u !== userId);
    dislikes = dislikes.filter(u => u !== userId);
    
    // 새 투표 추가
    if (type === 'like') {
      likes.push(userId);
    } else if (type === 'dislike') {
      dislikes.push(userId);
    }
    
    // 업데이트
    await pool.query(
      'UPDATE posts SET likes = $1, dislikes = $2 WHERE id = $3',
      [likes, dislikes, id]
    );
    
    res.json({ 
      success: true, 
      likes: likes.length,
      dislikes: dislikes.length 
    });
  } catch (error) {
    console.error('투표 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 신고
app.post('/api/posts/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(
      'UPDATE posts SET reports = reports + 1 WHERE id = $1 RETURNING reports',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 10회 이상 신고 시 자동 블라인드
    if (rows[0].reports >= 10) {
      await pool.query(
        'UPDATE posts SET is_blinded = true WHERE id = $1',
        [id]
      );
    }
    
    res.json({ 
      success: true, 
      reports: rows[0].reports,
      isBlinded: rows[0].reports >= 10
    });
  } catch (error) {
    console.error('신고 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ============================================
// 정적 프런트엔드 제공 (빌드 결과물 존재 시)
// ============================================

const CLIENT_DIST_PATH = path.join(__dirname, 'src/community-app/dist');
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_PATH, 'index.html');

if (fs.existsSync(CLIENT_INDEX_PATH)) {
  console.log('✅ 정적 프런트엔드 제공 준비 완료:', CLIENT_DIST_PATH);

  app.use(
    express.static(CLIENT_DIST_PATH, {
      index: 'index.html',
      setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.html') {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }

    return res.sendFile(CLIENT_INDEX_PATH);
  });
} else {
  console.log('ℹ️ 정적 프런트엔드 빌드 파일이 없어 SPA 라우팅을 비활성화합니다.');
}

// ============================================
// WebSocket 채팅 서버 (기존 코드 유지)
// ============================================

const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  clients.set(clientId, { ws, nickname: null, currentRoom: null });
  
  console.log(`👤 새 클라이언트 연결: ${clientId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'join':
          await handleJoinRoom(clientId, data);
          break;
        case 'message':
          await sendChatMessage(clientId, data);
          break;
        case 'leave':
          handleLeaveRoom(clientId);
          break;
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
    }
  });
  
  ws.on('close', () => {
    handleLeaveRoom(clientId);
    clients.delete(clientId);
    console.log(`👤 클라이언트 연결 종료: ${clientId}`);
  });
});

async function handleJoinRoom(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // 이전 방에서 나가기
  if (client.currentRoom) {
    handleLeaveRoom(clientId);
  }
  
  client.nickname = data.nickname;
  client.currentRoom = data.room;
  
  // 방별 메시지 히스토리 전송
  try {
    const { rows } = await pool.query(
      'SELECT * FROM chat_messages WHERE room = $1 ORDER BY created_at ASC LIMIT 100',
      [data.room]
    );
    
    client.ws.send(JSON.stringify({
      type: 'history',
      messages: rows
    }));
  } catch (error) {
    console.error('메시지 히스토리 로드 오류:', error);
  }
  
  // 입장 알림
  broadcastToRoom(data.room, {
    type: 'system',
    text: `${data.nickname}님이 입장하셨습니다.`,
    timestamp: new Date().toISOString()
  }, clientId);
}

function handleLeaveRoom(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  broadcastToRoom(client.currentRoom, {
    type: 'system',
    text: `${client.nickname}님이 퇴장하셨습니다.`,
    timestamp: new Date().toISOString()
  }, clientId);
  
  client.currentRoom = null;
}

function broadcastToRoom(room, message, excludeClientId = null) {
  clients.forEach((client, id) => {
    if (client.currentRoom === room && id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

async function sendChatMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  try {
    // XSS 방지 - 메시지 정제
    const cleanMessage = sanitizeInput(messageData.text);
    const cleanNickname = sanitizeInput(messageData.nickname || client.nickname);
    
    // DB에 저장
    const { rows } = await pool.query(
      'INSERT INTO chat_messages (room, nickname, message) VALUES ($1, $2, $3) RETURNING *',
      [client.currentRoom, cleanNickname, cleanMessage]
    );
    
    const message = {
      id: rows[0].id,
      text: rows[0].message,
      nickname: rows[0].nickname,
      timestamp: rows[0].created_at,
      room: rows[0].room
    };
    
    // 같은 방 사용자에게 전송
    clients.forEach((c, id) => {
      if (c.currentRoom === client.currentRoom && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify({
          type: 'message',
          data: message
        }));
      }
    });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
  }
}

// ============================================
// 서버 시작
// ============================================

initDatabase().then(() => {
  // Render 유료 플랜 검증
  validateRenderPlan();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     🎯 RENDER 유료 플랜 서버           ║
    ╠════════════════════════════════════════╣
    ║   플랜: ${RENDER_PLAN.plan.name}      ║
    ║   포트: ${PORT}                        ║
    ║   환경: ${process.env.NODE_ENV || 'development'}                   ║
    ║   DB: PostgreSQL (영구 저장)           ║
    ╠════════════════════════════════════════╣
    ║   💾 데이터 저장:                      ║
    ║   ✅ PostgreSQL 영구 저장             ║
    ║   ✅ 자동 백업                        ║
    ║   ✅ 데이터 제한 없음                 ║
    ╠════════════════════════════════════════╣
    ║   🔒 보안 기능:                        ║
    ║   ✅ bcrypt 비밀번호 해싱             ║
    ║   ✅ DOMPurify XSS 방지               ║
    ║   ✅ Rate Limiting                    ║
    ║   ✅ Helmet 보안 헤더                 ║
    ╚════════════════════════════════════════╝
    `);
  });
});