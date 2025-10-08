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
app.use(cors({
  origin: ['https://athlete-time.netlify.app', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
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

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    wsClients: wss.clients.size,
    rooms: rooms.size
  });
});

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
let totalMessageCount = 0;

// 메인 채팅방 초기화
rooms.set('main', {
  users: new Set(),
  messages: [],
  lastActivity: Date.now(),
  name: '메인 채팅방',
  description: '모든 육상인들이 함께하는 공간',
  icon: '🏃',
  permanent: true // 영구 채팅방 표시
});

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userId = null;

  // 연결 시 즉시 전체 정보 전송
  const sendInitialData = () => {
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      name: room.name || `채팅방 ${id}`,
      description: room.description || '',
      userCount: room.users.size,
      icon: room.icon || '💬',
      permanent: room.permanent || false,
      lastActivity: room.lastActivity,
      active: room.users.size > 0
    }));

    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        rooms: roomList,
        stats: {
          onlineUsers: wss.clients.size,
          totalRooms: rooms.size,
          totalMessages: totalMessageCount
        }
      }
    }));
  };

  sendInitialData();

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message.type, message.data?.room || message.room);

      switch (message.type) {
        case 'join':
          currentRoom = message.data?.room || message.room || 'main';
          userId = message.data?.userId || message.userId;
          const nickname = message.data?.nickname || message.nickname || '익명';
          
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, {
              users: new Set(),
              messages: [],
              lastActivity: Date.now(),
              name: currentRoom === 'main' ? '메인 채팅방' : `채팅방 ${currentRoom}`
            });
          }
          
          const room = rooms.get(currentRoom);
          room.users.add(ws);
          room.lastActivity = Date.now();
          
          // 입장 응답 전송
          ws.send(JSON.stringify({
            type: 'room_joined',
            data: {
              roomId: currentRoom,
              roomName: room.name,
              messages: room.messages.slice(-50),
              userCount: room.users.size
            }
          }));
          
          // 다른 사용자들에게 입장 알림
          broadcastToOthers(currentRoom, ws, {
            type: 'user_joined',
            data: {
              userId: userId,
              nickname: nickname,
              userCount: room.users.size
            }
          });
          
          // 방 정보 및 통계 업데이트
          broadcastRoomUpdate(currentRoom);
          broadcastStats();
          break;

        case 'message':
          if (currentRoom && rooms.has(currentRoom)) {
            const msgData = message.data || message;
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const messageData = {
              type: 'new_message',
              data: {
                messageId: messageId,
                userId: msgData.userId,
                nickname: msgData.nickname || '익명',
                text: msgData.text || msgData.message || '',
                avatar: msgData.avatar || msgData.nickname?.substring(0, 1) || '?',
                timestamp: new Date().toISOString(),
                room: currentRoom,
                image: msgData.image,  // 이미지 데이터
                replyTo: msgData.replyTo  // 답장 정보
              }
            };
            
            // 메시지 저장
            const room = rooms.get(currentRoom);
            room.messages.push(messageData.data);
            room.lastActivity = Date.now();
            
            // DB에도 저장 (이미지는 별도 처리 필요)
            if (pool) {
              const messageText = msgData.text || msgData.message || '';
              const messageContent = msgData.image ? `[이미지] ${messageText}` : messageText;
              await pool.query(
                'INSERT INTO chat_messages (room_id, user_id, nickname, message) VALUES ($1, $2, $3, $4)',
                [currentRoom, msgData.userId, msgData.nickname, messageContent]
              );
            }
            
            // 브로드캐스트
            broadcast(currentRoom, messageData);
            
            // 전체 메시지 카운트 증가 및 통계 업데이트
            totalMessageCount++;
            if (totalMessageCount % 10 === 0) { // 10개마다 한 번 업데이트
              broadcastStats();
            }
          }
          break;
          
        case 'reaction':
          if (currentRoom && rooms.has(currentRoom)) {
            const reactionData = {
              type: 'reaction_added',
              data: {
                messageId: message.data.messageId,
                emoji: message.data.emoji,
                userId: message.data.userId,
                room: currentRoom
              }
            };
            
            // 브로드캐스트
            broadcast(currentRoom, reactionData);
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
      
      broadcastToOthers(currentRoom, ws, {
        type: 'user_left',
        data: {
          userId: userId,
          userCount: room.users.size
        }
      });
      
      // 방 정보 및 통계 업데이트
      broadcastRoomUpdate(currentRoom);
      broadcastStats();
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

function broadcastToOthers(roomName, excludeWs, message) {
  const room = rooms.get(roomName);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  room.users.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
}

// 전체 클라이언트에게 통계 업데이트 브로드캐스트
function broadcastStats() {
  const stats = {
    type: 'stats_update',
    data: {
      onlineUsers: wss.clients.size,
      totalRooms: rooms.size,
      totalMessages: totalMessageCount
    }
  };
  
  const statsStr = JSON.stringify(stats);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(statsStr);
    }
  });
}

// 방 정보 업데이트 브로드캐스트
function broadcastRoomUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const update = {
    type: 'room_update',
    data: {
      roomId,
      userCount: room.users.size,
      name: room.name || `채팅방 ${roomId}`,
      active: room.users.size > 0
    }
  };
  
  const updateStr = JSON.stringify(update);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(updateStr);
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
    
    // 정기적으로 통계 업데이트 (30초마다)
    setInterval(() => {
      broadcastStats();
      
      // 비활성 방 정리
      const now = Date.now();
      rooms.forEach((room, roomId) => {
        if (!room.permanent && room.users.size === 0) {
          const inactiveTime = now - room.lastActivity;
          if (inactiveTime > ROOM_INACTIVE_TIMEOUT) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted due to inactivity`);
            broadcastStats();
          }
        }
      });
    }, 30000);
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