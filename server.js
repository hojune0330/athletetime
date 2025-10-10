// 통합 백엔드 서버 (Render.com 배포용)
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

// Express 앱 설정
const app = express();
const server = http.createServer(app);

// 환경 변수
const PORT = process.env.PORT || 3000;
const CHAT_DATA_FILE = path.join(__dirname, 'chat-messages.json');
const COMMUNITY_DATA_FILE = path.join(__dirname, 'community-posts.json');

// CORS 설정 - 모든 도메인 허용
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 채팅 서버 (WebSocket)
// ============================================

const wss = new WebSocket.Server({ 
  server,
  path: '/ws' // WebSocket 경로 지정
});

// 채팅 데이터 구조
const clients = new Map();
const rooms = new Map();
const roomTimers = new Map();
const ROOM_INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30분

// 채팅 메시지 저장/로드
async function saveChatMessages() {
  try {
    const messageData = {};
    rooms.forEach((room, roomId) => {
      messageData[roomId] = room.messages;
    });
    await fs.writeFile(CHAT_DATA_FILE, JSON.stringify(messageData, null, 2));
    console.log(`💾 채팅 메시지 저장 완료`);
  } catch (error) {
    console.error('❌ 채팅 메시지 저장 실패:', error);
  }
}

async function loadChatMessages() {
  try {
    const data = await fs.readFile(CHAT_DATA_FILE, 'utf-8');
    const messageData = JSON.parse(data);
    
    Object.keys(messageData).forEach(roomId => {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.messages = messageData[roomId] || [];
      }
    });
    console.log(`✅ 채팅 메시지 복원 완료`);
  } catch (error) {
    console.log('📝 저장된 채팅 메시지 없음');
  }
}

// 기본 채팅방 초기화
async function initializeChatRooms() {
  rooms.set('main', {
    id: 'main',
    name: '메인 채팅방',
    users: new Set(),
    messages: [],
    created: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    permanent: true
  });
  
  await loadChatMessages();
}

// WebSocket 연결 처리
wss.on('connection', (ws) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  clients.set(clientId, { ws, currentRoom: null });
  console.log(`👤 채팅 클라이언트 연결: ${clientId}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleChatMessage(clientId, data);
    } catch (error) {
      console.error('❌ 메시지 파싱 오류:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`👋 채팅 클라이언트 연결 종료: ${clientId}`);
  });
  
  // 초기 상태 전송
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      rooms: Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        userCount: room.users.size
      }))
    }
  }));
});

function handleChatMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch(data.type) {
    case 'join':
      joinRoom(clientId, data.data.room);
      break;
    case 'message':
      broadcastMessage(clientId, data.data);
      break;
  }
}

function joinRoom(clientId, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const client = clients.get(clientId);
  client.currentRoom = roomId;
  room.users.add(clientId);
  
  // 모든 메시지 전송
  client.ws.send(JSON.stringify({
    type: 'room_joined',
    data: {
      room: room.id,
      roomName: room.name,
      messages: room.messages
    }
  }));
}

function broadcastMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(client.currentRoom);
  if (!room) return;
  
  const message = {
    id: 'msg_' + Date.now(),
    text: messageData.text,
    nickname: messageData.nickname || '익명',
    avatar: messageData.avatar || '?',
    timestamp: new Date().toISOString(),
    room: client.currentRoom
  };
  
  room.messages.push(message);
  saveChatMessages(); // 메시지 저장
  
  // 같은 방 사용자들에게 브로드캐스트
  room.users.forEach(id => {
    const c = clients.get(id);
    if (c && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify({
        type: 'message',
        data: message
      }));
    }
  });
}

// ============================================
// 게시판 API (REST)
// ============================================

let posts = [];

// 게시판 데이터 저장/로드
async function savePosts() {
  try {
    await fs.writeFile(COMMUNITY_DATA_FILE, JSON.stringify(posts, null, 2));
    console.log(`💾 게시글 저장 완료: ${posts.length}개`);
  } catch (error) {
    console.error('❌ 게시글 저장 실패:', error);
  }
}

async function loadPosts() {
  try {
    const data = await fs.readFile(COMMUNITY_DATA_FILE, 'utf-8');
    posts = JSON.parse(data);
    console.log(`📂 게시글 로드 완료: ${posts.length}개`);
  } catch (error) {
    console.log('📝 저장된 게시글 없음 - 기본 게시글로 시작');
    posts = [
      {
        id: Date.now(),
        category: '공지',
        title: '🎉 애슬리트 타임 커뮤니티 오픈!',
        author: '관리자',
        content: '안녕하세요! 애슬리트 타임이 오픈했습니다.',
        date: new Date().toISOString(),
        views: 0,
        likes: [],
        dislikes: [],
        comments: [],
        reports: [],
        isNotice: true,
        isAdmin: true,
        isBlinded: false
      }
    ];
    await savePosts();
  }
}

// 게시판 API 엔드포인트
app.get('/api/posts', (req, res) => {
  res.json({
    success: true,
    posts: posts,
    stats: {
      totalPosts: posts.length,
      totalViews: posts.reduce((sum, p) => sum + p.views, 0),
      totalComments: posts.reduce((sum, p) => sum + p.comments.length, 0)
    }
  });
});

app.post('/api/posts', async (req, res) => {
  const newPost = {
    id: Date.now(),
    ...req.body,
    date: new Date().toISOString(),
    views: 0,
    likes: [],
    dislikes: [],
    comments: [],
    reports: [],
    isBlinded: false
  };
  
  posts.unshift(newPost);
  await savePosts();
  
  res.json({ success: true, post: newPost });
});

app.put('/api/posts/:id', async (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
  }
  
  posts[postIndex] = { ...posts[postIndex], ...req.body };
  await savePosts();
  
  res.json({ success: true, post: posts[postIndex] });
});

app.delete('/api/posts/:id', async (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
  }
  
  posts.splice(postIndex, 1);
  await savePosts();
  
  res.json({ success: true, message: '게시글이 삭제되었습니다' });
});

// 댓글 추가
app.post('/api/posts/:id/comments', async (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
  }
  
  const newComment = {
    id: Date.now(),
    ...req.body,
    date: new Date().toISOString()
  };
  
  post.comments.push(newComment);
  await savePosts();
  
  res.json({ success: true, comment: newComment, post });
});

// 좋아요/싫어요
app.post('/api/posts/:id/vote', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { userId, type } = req.body;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
  }
  
  // 기존 투표 제거
  post.likes = post.likes.filter(id => id !== userId);
  post.dislikes = post.dislikes.filter(id => id !== userId);
  
  // 새 투표 추가
  if (type === 'like') {
    post.likes.push(userId);
  } else if (type === 'dislike') {
    post.dislikes.push(userId);
  }
  
  await savePosts();
  res.json({ success: true, post });
});

// ============================================
// 서버 시작
// ============================================

// 헬스체크 엔드포인트
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Athletic Time Backend',
    endpoints: {
      websocket: '/ws',
      posts: '/api/posts',
      health: '/'
    }
  });
});

// 초기화 및 서버 시작
async function startServer() {
  await initializeChatRooms();
  await loadPosts();
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 Athletic Time 백엔드 서버           ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  WebSocket: ws://localhost:${PORT}/ws       ║
║  게시판 API: http://localhost:${PORT}/api   ║
╠════════════════════════════════════════════╣
║  기능:                                      ║
║  ✅ 실시간 채팅 (WebSocket)                ║
║  ✅ 익명 게시판 (REST API)                 ║
║  ✅ 데이터 영구 저장                       ║
╚════════════════════════════════════════════╝
    `);
  });
}

// 정기적인 저장
setInterval(() => {
  saveChatMessages();
  savePosts();
}, 5 * 60 * 1000); // 5분마다

// 종료 처리
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');
  await saveChatMessages();
  await savePosts();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버 종료 중...');
  await saveChatMessages();
  await savePosts();
  process.exit(0);
});

// 서버 시작
startServer();