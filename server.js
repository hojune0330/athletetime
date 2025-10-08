const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis 연결 (옵션)
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });
  redisClient.connect().catch(console.error);
}

// 미들웨어
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// 데이터베이스 초기화
async function initDB() {
  try {
    // 게시판 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(100),
        instagram VARCHAR(100),
        password VARCHAR(100),
        views INTEGER DEFAULT 0,
        likes TEXT[] DEFAULT '{}',
        dislikes TEXT[] DEFAULT '{}',
        reports TEXT[] DEFAULT '{}',
        images JSONB,
        poll JSONB,
        is_blinded BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 댓글 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(100),
        instagram VARCHAR(100),
        content TEXT NOT NULL,
        reports TEXT[] DEFAULT '{}',
        is_blinded BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 채팅 메시지 테이블 (24시간 후 자동 삭제용)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(100),
        user_id VARCHAR(100),
        nickname VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// ===== API 엔드포인트 =====

// 게시물 목록
app.get('/api/posts', async (req, res) => {
  try {
    const { category, sort = 'latest', search } = req.query;
    let query = 'SELECT * FROM posts WHERE is_blinded = false';
    const params = [];

    if (category && category !== '전체') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
    }

    // 정렬
    switch (sort) {
      case 'popular':
        query += ' ORDER BY array_length(likes, 1) DESC NULLS LAST';
        break;
      case 'views':
        query += ' ORDER BY views DESC';
        break;
      case 'comments':
        query += ' ORDER BY (SELECT COUNT(*) FROM comments WHERE post_id = posts.id) DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 게시물 작성
app.post('/api/posts', async (req, res) => {
  try {
    const { category, title, content, author, instagram, password, images, poll } = req.body;
    
    const result = await pool.query(
      `INSERT INTO posts (category, title, content, author, instagram, password, images, poll)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [category, title, content, author || '익명', instagram, password, images, poll]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 게시물 조회
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 조회수 증가
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = $1', [id]);
    
    // 게시물 + 댓글 조회
    const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    const commentsResult = await pool.query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      post: postResult.rows[0],
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 댓글 작성
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, instagram, content } = req.body;

    const result = await pool.query(
      `INSERT INTO comments (post_id, author, instagram, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, author || '익명', instagram, content]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 추천/비추천
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, userId } = req.body;

    const post = await pool.query('SELECT likes, dislikes FROM posts WHERE id = $1', [id]);
    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let likes = post.rows[0].likes || [];
    let dislikes = post.rows[0].dislikes || [];

    // 기존 투표 제거
    likes = likes.filter(u => u !== userId);
    dislikes = dislikes.filter(u => u !== userId);

    // 새 투표 추가
    if (type === 'like') {
      likes.push(userId);
    } else if (type === 'dislike') {
      dislikes.push(userId);
    }

    // 10개 이상 비추천시 블라인드
    const isBlinded = dislikes.length >= 10;

    await pool.query(
      'UPDATE posts SET likes = $1, dislikes = $2, is_blinded = $3 WHERE id = $4',
      [likes, dislikes, isBlinded, id]
    );

    res.json({ likes: likes.length, dislikes: dislikes.length, isBlinded });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== WebSocket 채팅 서버 =====
const rooms = new Map();
const ROOM_INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30분
const MESSAGE_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24시간

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userId = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'join':
          currentRoom = message.room || 'main';
          userId = message.userId;
          
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, {
              users: new Set(),
              messages: [],
              lastActivity: Date.now()
            });
          }
          
          const room = rooms.get(currentRoom);
          room.users.add(ws);
          
          // 입장 메시지
          broadcast(currentRoom, {
            type: 'user-joined',
            userId: userId,
            nickname: message.nickname,
            userCount: room.users.size
          });
          
          // 최근 메시지 전송
          ws.send(JSON.stringify({
            type: 'recent-messages',
            messages: room.messages.slice(-50)
          }));
          break;

        case 'message':
          if (currentRoom && rooms.has(currentRoom)) {
            const messageData = {
              type: 'message',
              userId: message.userId,
              nickname: message.nickname,
              message: message.message,
              timestamp: new Date().toISOString()
            };
            
            // 메시지 저장
            const room = rooms.get(currentRoom);
            room.messages.push(messageData);
            room.lastActivity = Date.now();
            
            // DB에도 저장 (24시간 후 삭제용)
            if (pool) {
              await pool.query(
                'INSERT INTO chat_messages (room_id, user_id, nickname, message) VALUES ($1, $2, $3, $4)',
                [currentRoom, message.userId, message.nickname, message.message]
              );
            }
            
            // 브로드캐스트
            broadcast(currentRoom, messageData);
          }
          break;

        case 'leave':
          if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            room.users.delete(ws);
            
            broadcast(currentRoom, {
              type: 'user-left',
              userId: userId,
              userCount: room.users.size
            });
            
            // 빈 방 삭제 (main 제외)
            if (room.users.size === 0 && currentRoom !== 'main') {
              setTimeout(() => {
                if (room.users.size === 0) {
                  rooms.delete(currentRoom);
                }
              }, ROOM_INACTIVE_TIMEOUT);
            }
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.users.delete(ws);
      
      broadcast(currentRoom, {
        type: 'user-left',
        userId: userId,
        userCount: room.users.size
      });
    }
  });
});

function broadcast(roomName, message) {
  const room = rooms.get(roomName);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  room.users.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
}

// 24시간 지난 메시지 삭제 (1시간마다)
setInterval(async () => {
  if (pool) {
    try {
      await pool.query(
        "DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '24 hours'"
      );
    } catch (error) {
      console.error('Error cleaning old messages:', error);
    }
  }
}, 60 * 60 * 1000);

// 서버 시작
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`💾 Redis: ${process.env.REDIS_URL ? 'Connected' : 'Not configured'}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    pool.end();
    if (redisClient) redisClient.quit();
    process.exit(0);
  });
});