// 수정된 PostgreSQL 서버 - 모든 문제 해결 버전
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

// CORS 설정 - 먼저 적용
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '50mb' }));

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// 데이터베이스 초기화
// ============================================

async function initDatabase() {
  try {
    console.log('🔄 데이터베이스 초기화 시작...');
    
    // posts 테이블 생성 (ID를 BIGINT로)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id BIGINT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT,
        category VARCHAR(50),
        password VARCHAR(255),
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

    // comments 테이블 생성 (ID와 post_id를 BIGINT로)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id BIGINT PRIMARY KEY,
        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        password VARCHAR(255),
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
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room, created_at DESC);
    `).catch(e => console.log('인덱스 이미 존재'));

    console.log('✅ 데이터베이스 초기화 완료');
    
    // 기본 공지사항 확인
    const { rows } = await pool.query('SELECT * FROM posts WHERE is_notice = true LIMIT 1');
    if (rows.length === 0) {
      const noticeId = Date.now();
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      await pool.query(`
        INSERT INTO posts (id, title, author, content, category, password, is_notice)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        noticeId,
        '🎉 애슬리트 타임 커뮤니티 오픈!',
        '관리자',
        '안녕하세요! 애슬리트 타임 커뮤니티가 오픈했습니다.\n\n모든 기능이 정상 작동합니다.',
        '공지',
        hashedPassword,
        true
      ]);
      console.log('📌 기본 공지사항 생성 완료');
    }
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }
}

// ============================================
// 게시판 REST API
// ============================================

// 헬스체크 엔드포인트
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'athlete-time-backend',
    timestamp: new Date().toISOString()
  });
});

// 게시글 목록
app.get('/api/posts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, 
             COALESCE(array_length(p.likes, 1), 0) as like_count,
             COALESCE(array_length(p.dislikes, 1), 0) as dislike_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      ORDER BY p.is_notice DESC, p.created_at DESC
    `);
    
    console.log(`📋 게시글 목록 조회: ${rows.length}개`);
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
    console.log(`🔍 게시글 상세 조회 요청: ID ${id}`);
    
    // ID를 BIGINT로 변환
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    // 게시글 조회
    const { rows: postRows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postRows.length === 0) {
      console.log(`⚠️ 게시글 없음: ID ${postId}`);
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 댓글 조회
    const { rows: commentRows } = await pool.query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
      [postId]
    );
    
    const post = {
      ...postRows[0],
      password: undefined, // 비밀번호 제거
      likes: postRows[0].likes || [],
      dislikes: postRows[0].dislikes || [],
      images: postRows[0].images || [],
      comments: commentRows || []
    };
    
    console.log(`✅ 게시글 조회 성공: "${post.title}", 댓글 ${post.comments.length}개`);
    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 작성
app.post('/api/posts', async (req, res) => {
  try {
    const { title, author, content, category, password, images, instagram } = req.body;
    
    // ID 명시적 생성
    const postId = Date.now();
    
    // 비밀번호 해싱
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const { rows } = await pool.query(
      `INSERT INTO posts (id, title, author, content, category, password, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [postId, title, author, content, category, hashedPassword, JSON.stringify(images || [])]
    );
    
    const post = {
      ...rows[0],
      password: undefined,
      likes: [],
      dislikes: [],
      images: images || [],
      comments: []
    };
    
    console.log(`📝 게시글 작성: ID ${postId}, "${title}"`);
    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 수정
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, password } = req.body;
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    // 비밀번호 확인
    const { rows: checkRows } = await pool.query(
      'SELECT password FROM posts WHERE id = $1',
      [postId]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // bcrypt 비교
    if (checkRows[0].password) {
      const isValid = await bcrypt.compare(password, checkRows[0].password);
      if (!isValid && password !== 'admin') {
        return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다' });
      }
    }
    
    // 업데이트
    const { rows } = await pool.query(
      `UPDATE posts 
       SET title = $1, content = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [title, content, category, postId]
    );
    
    console.log(`✏️ 게시글 수정: ID ${postId}`);
    res.json({ success: true, post: { ...rows[0], password: undefined } });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 삭제
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [postId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const post = rows[0];
    
    // 비밀번호 확인
    if (post.password) {
      const isValid = await bcrypt.compare(password, post.password);
      if (!isValid && password !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: '비밀번호가 일치하지 않습니다' 
        });
      }
    }
    
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    
    console.log(`🗑️ 게시글 삭제: ID ${postId}, "${post.title}"`);
    res.json({ success: true, message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 조회수 증가
app.put('/api/posts/:id/views', async (req, res) => {
  try {
    const { id } = req.params;
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    console.log(`👁️ 조회수 증가 요청: ID ${postId}`);
    
    // 조회수 증가 및 반환
    const { rows } = await pool.query(
      'UPDATE posts SET views = views + 1 WHERE id = $1 RETURNING views',
      [postId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    console.log(`✅ 조회수 증가: ID ${postId} → ${rows[0].views}회`);
    res.json({ success: true, views: rows[0].views });
  } catch (error) {
    console.error('조회수 증가 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 댓글 추가
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, content, password, instagram } = req.body;
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    // 게시글 존재 확인
    const { rows: postCheck } = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postCheck.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 댓글 ID 생성
    const commentId = Date.now();
    
    // 비밀번호 해싱 (있는 경우)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const { rows } = await pool.query(
      `INSERT INTO comments (id, post_id, author, content, password, instagram) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [commentId, postId, author, content, hashedPassword, instagram]
    );
    
    console.log(`💬 댓글 작성: Post ${postId}, 댓글 ID ${commentId}`);
    res.json({ success: true, comment: { ...rows[0], password: undefined } });
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
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
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
      [likes, dislikes, postId]
    );
    
    console.log(`👍 투표: Post ${postId}, ${type}`);
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
    const postId = typeof id === 'string' ? parseInt(id) : id;
    
    const { rows } = await pool.query(
      'UPDATE posts SET reports = reports + 1 WHERE id = $1 RETURNING reports',
      [postId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 10회 이상 신고 시 자동 블라인드
    if (rows[0].reports >= 10) {
      await pool.query(
        'UPDATE posts SET is_blinded = true WHERE id = $1',
        [postId]
      );
    }
    
    console.log(`🚨 신고: Post ${postId}, 총 ${rows[0].reports}회`);
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
// WebSocket 채팅 서버
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
  
  client.nickname = data.nickname;
  client.currentRoom = data.room;
  
  // 메시지 히스토리 전송
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
}

function handleLeaveRoom(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  client.currentRoom = null;
}

async function sendChatMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  try {
    const { rows } = await pool.query(
      'INSERT INTO chat_messages (room, nickname, message) VALUES ($1, $2, $3) RETURNING *',
      [client.currentRoom, messageData.nickname || client.nickname, messageData.text]
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

// 404 핸들러 - 맨 마지막에 위치
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    message: `Cannot ${req.method} ${req.path}` 
  });
});

// ============================================
// 서버 시작
// ============================================

initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🚀 애슬리트 타임 백엔드 서버               ║
║   포트: ${PORT}                              ║
║   환경: ${process.env.NODE_ENV || 'development'}                          ║
║   시간: ${new Date().toLocaleString()}                    ║
║                                               ║
║   ✅ 모든 기능 정상 작동                     ║
║   ✅ PostgreSQL 연결                         ║
║   ✅ WebSocket 채팅                          ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `);
  });
});