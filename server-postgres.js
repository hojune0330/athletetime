// PostgreSQL 연동 서버
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// ============================================
// 데이터베이스 초기화
// ============================================

async function initDatabase() {
  try {
    // posts 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT,
        category VARCHAR(50),
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        views INTEGER DEFAULT 0,
        likes TEXT[] DEFAULT '{}',
        dislikes TEXT[] DEFAULT '{}',
        images JSONB DEFAULT '[]',
        is_notice BOOLEAN DEFAULT false,
        is_blinded BOOLEAN DEFAULT false
      )
    `);

    // comments 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        password VARCHAR(100),
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

    // 인덱스 생성 (성능 최적화)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
    `);

    console.log('✅ 데이터베이스 테이블 초기화 완료');

    // 기본 공지사항 확인 및 생성
    const { rows } = await pool.query('SELECT * FROM posts WHERE is_notice = true LIMIT 1');
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO posts (title, author, content, category, password, is_notice)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        '🎉 애슬리트 타임 커뮤니티 오픈!',
        '관리자',
        `안녕하세요! 애슬리트 타임 커뮤니티가 오픈했습니다.

✨ PostgreSQL 연동 완료!
- 모든 데이터가 영구 저장됩니다
- 서버 재시작/재배포해도 데이터 유지
- 안정적인 서비스 제공

감사합니다! 🏃‍♂️`,
        '공지',
        'admin2024',
        true
      ]);
      console.log('📢 기본 공지사항 생성 완료');
    }

  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    // 에러가 발생해도 서버는 계속 실행
  }
}

// ============================================
// WebSocket 채팅 서버
// ============================================

const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  clients.set(clientId, { ws, currentRoom: null, nickname: '익명' });
  
  console.log(`👤 연결: ${clientId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleWebSocketMessage(clientId, data);
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`👋 연결 종료: ${clientId}`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket 오류: ${error.message}`);
  });
});

async function handleWebSocketMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch(data.type) {
    case 'join':
      await joinChatRoom(clientId, data.data);
      break;
    case 'message':
      await sendChatMessage(clientId, data.data);
      break;
  }
}

async function joinChatRoom(clientId, data) {
  const { room: roomId, nickname } = data;
  const client = clients.get(clientId);
  
  if (!client) return;
  
  client.currentRoom = roomId;
  client.nickname = nickname || '익명';
  
  try {
    // 최근 메시지 로드 (최근 50개)
    const { rows } = await pool.query(
      'SELECT * FROM chat_messages WHERE room = $1 ORDER BY created_at DESC LIMIT 50',
      [roomId]
    );
    
    // 클라이언트에 전송
    client.ws.send(JSON.stringify({
      type: 'room_joined',
      data: {
        room: roomId,
        messages: rows.reverse().map(row => ({
          id: row.id,
          text: row.message,
          nickname: row.nickname,
          timestamp: row.created_at,
          room: row.room
        }))
      }
    }));
    
    console.log(`📥 [${roomId}] ${client.nickname} 입장`);
  } catch (error) {
    console.error('채팅방 입장 오류:', error);
  }
}

async function sendChatMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  try {
    // DB에 저장
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

// ============================================
// 게시판 REST API
// ============================================

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
    
    // PostgreSQL 배열을 JavaScript 배열로 변환
    const posts = rows.map(post => ({
      ...post,
      likes: post.likes || [],
      dislikes: post.dislikes || [],
      images: post.images || [],
      comments: [] // 댓글은 별도 API로 로드
    }));
    
    res.json({
      success: true,
      posts: posts,
      count: posts.length
    });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 상세
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 게시글 조회
    const { rows: postRows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (postRows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 댓글 조회
    const { rows: commentRows } = await pool.query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    const post = {
      ...postRows[0],
      likes: postRows[0].likes || [],
      dislikes: postRows[0].dislikes || [],
      images: postRows[0].images || [],
      comments: commentRows
    };
    
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
    
    const { rows } = await pool.query(
      `INSERT INTO posts (title, author, content, category, password, images)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, author, content, category, password, JSON.stringify(images || [])]
    );
    
    const post = {
      ...rows[0],
      likes: [],
      dislikes: [],
      images: images || [],
      comments: []
    };
    
    console.log(`📝 새 게시글: "${title}" by ${author}`);
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
    
    // 비밀번호 확인
    const { rows: checkRows } = await pool.query(
      'SELECT password FROM posts WHERE id = $1',
      [id]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    if (password !== checkRows[0].password && password !== 'admin') {
      return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다' });
    }
    
    // 업데이트
    const { rows } = await pool.query(
      `UPDATE posts 
       SET title = $1, content = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [title, content, category, id]
    );
    
    res.json({ success: true, post: rows[0] });
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
    
    // 비밀번호 확인
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다' 
      });
    }
    
    const post = rows[0];
    if (password !== post.password && password !== 'admin') {
      console.log(`❌ 삭제 실패 - 비밀번호 불일치: 입력=${password}, 저장=${post.password}`);
      return res.status(403).json({ 
        success: false, 
        message: '비밀번호가 일치하지 않습니다' 
      });
    }
    
    // 삭제 실행 (CASCADE로 댓글도 자동 삭제)
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    
    console.log(`🗑️ 게시글 삭제: "${post.title}"`);
    res.json({ success: true, message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 댓글 추가
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, content, password, instagram } = req.body;
    
    // 게시글 존재 확인
    const { rows: postCheck } = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );
    
    if (postCheck.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, author, content, password, instagram) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, author, content, password, instagram]
    );
    
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
    likes = likes.filter(uid => uid !== userId);
    dislikes = dislikes.filter(uid => uid !== userId);
    
    // 새 투표 추가
    if (type === 'like') {
      likes.push(userId);
    } else if (type === 'dislike') {
      dislikes.push(userId);
      
      // 신고 10개 이상시 블라인드
      if (dislikes.length >= 10) {
        await pool.query('UPDATE posts SET is_blinded = true WHERE id = $1', [id]);
      }
    }
    
    // 업데이트
    const { rows: updated } = await pool.query(
      'UPDATE posts SET likes = $1, dislikes = $2 WHERE id = $3 RETURNING *',
      [likes, dislikes, id]
    );
    
    const updatedPost = {
      ...updated[0],
      likes: updated[0].likes || [],
      dislikes: updated[0].dislikes || []
    };
    
    res.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('투표 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 헬스체크
app.get('/', async (req, res) => {
  try {
    // 연결 테스트
    await pool.query('SELECT 1');
    
    const { rows: postCount } = await pool.query('SELECT COUNT(*) FROM posts');
    const { rows: chatCount } = await pool.query('SELECT COUNT(*) FROM chat_messages');
    const { rows: commentCount } = await pool.query('SELECT COUNT(*) FROM comments');
    
    res.json({
      status: 'running',
      service: 'Athlete Time Backend',
      version: '4.0-PostgreSQL',
      database: '✅ PostgreSQL Connected',
      stats: {
        posts: parseInt(postCount[0].count),
        messages: parseInt(chatCount[0].count),
        comments: parseInt(commentCount[0].count)
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('헬스체크 오류:', error);
    res.json({
      status: 'running',
      service: 'Athlete Time Backend',
      database: '❌ Database Error',
      error: error.message
    });
  }
});

// ============================================
// 서버 시작
// ============================================

async function startServer() {
  try {
    await initDatabase();
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error);
  }
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 Athlete Time 백엔드 서버            ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  환경: ${process.env.NODE_ENV || 'development'}                  ║
║  DB: PostgreSQL                            ║
╠════════════════════════════════════════════╣
║  ✅ 데이터 영구 저장 활성화                ║
║  ✅ 재배포해도 데이터 유지                 ║
║  ✅ 안정적인 서비스 제공                   ║
╚════════════════════════════════════════════╝
    `);
  });
}

// 에러 처리
process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
});

process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  process.exit(1);
});

startServer();