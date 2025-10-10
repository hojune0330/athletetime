// 단순화된 백엔드 서버 - Render Starter용
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// ============================================
// 데이터 저장 - 메모리에 저장 (Render는 재배포 시 파일 초기화됨)
// Render Starter에서도 디스크는 임시 저장소입니다
// 영구 저장을 원한다면 PostgreSQL이나 Redis를 사용해야 합니다
// ============================================

// 메모리 저장소
let posts = [];
let chatRooms = {
  main: { messages: [], users: new Set() },
  running: { messages: [], users: new Set() },
  free: { messages: [], users: new Set() }
};

// 파일 저장/로드 (백업용, 서버 실행 중에만 유지)
const DATA_FILE = 'data-backup.json';

async function saveData() {
  try {
    const data = {
      posts,
      chatMessages: {
        main: chatRooms.main.messages,
        running: chatRooms.running.messages,
        free: chatRooms.free.messages
      },
      savedAt: new Date().toISOString()
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 데이터 백업 완료 (${posts.length}개 게시글)`);
  } catch (error) {
    console.error('백업 실패:', error.message);
  }
}

async function loadData() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    
    posts = data.posts || [];
    
    if (data.chatMessages) {
      chatRooms.main.messages = data.chatMessages.main || [];
      chatRooms.running.messages = data.chatMessages.running || [];
      chatRooms.free.messages = data.chatMessages.free || [];
    }
    
    console.log(`✅ 데이터 복원 완료 (${posts.length}개 게시글)`);
    console.log(`📅 저장 시간: ${data.savedAt}`);
  } catch (error) {
    console.log('💡 백업 파일 없음 - 새로 시작');
    initializeDefaultData();
  }
}

function initializeDefaultData() {
  // 기본 공지사항만 추가
  posts = [
    {
      id: Date.now(),
      category: '공지',
      title: '🎉 애슬리트 타임 커뮤니티 오픈!',
      author: '관리자',
      content: `안녕하세요! 애슬리트 타임 커뮤니티가 오픈했습니다.

⚠️ 현재 베타 서비스 중입니다
- 서버 재시작 시 데이터가 초기화될 수 있습니다
- 중요한 내용은 별도로 백업해주세요
- 문제 발생 시 @athlete_time으로 DM 부탁드립니다

감사합니다!`,
      date: new Date().toISOString(),
      password: 'admin2024',
      views: 0,
      likes: [],
      dislikes: [],
      comments: [],
      reports: [],
      isNotice: true,
      isBlinded: false
    }
  ];
  
  // 채팅방 초기 메시지
  Object.keys(chatRooms).forEach(roomId => {
    chatRooms[roomId].messages = [{
      id: 'welcome_' + roomId,
      text: '채팅방에 오신 것을 환영합니다! 🎉',
      nickname: '시스템',
      timestamp: new Date().toISOString(),
      room: roomId
    }];
  });
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
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(clientId, data);
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  });
  
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client && client.currentRoom) {
      const room = chatRooms[client.currentRoom];
      if (room) {
        room.users.delete(clientId);
      }
    }
    clients.delete(clientId);
    console.log(`👋 연결 종료: ${clientId}`);
  });
});

function handleWebSocketMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch(data.type) {
    case 'join':
      joinChatRoom(clientId, data.data);
      break;
    case 'message':
      sendChatMessage(clientId, data.data);
      break;
  }
}

function joinChatRoom(clientId, data) {
  const { room: roomId, nickname } = data;
  const room = chatRooms[roomId];
  
  if (!room) {
    console.error(`방 없음: ${roomId}`);
    return;
  }
  
  const client = clients.get(clientId);
  client.currentRoom = roomId;
  client.nickname = nickname || '익명';
  room.users.add(clientId);
  
  // 해당 방의 메시지 전송
  client.ws.send(JSON.stringify({
    type: 'room_joined',
    data: {
      room: roomId,
      messages: room.messages,
      userCount: room.users.size
    }
  }));
  
  console.log(`📥 [${roomId}] ${client.nickname} 입장`);
}

function sendChatMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = chatRooms[client.currentRoom];
  if (!room) return;
  
  const message = {
    id: 'msg_' + Date.now(),
    text: messageData.text,
    nickname: messageData.nickname || client.nickname,
    timestamp: new Date().toISOString(),
    room: client.currentRoom
  };
  
  // 메시지 저장 (최대 100개)
  room.messages.push(message);
  if (room.messages.length > 100) {
    room.messages = room.messages.slice(-100);
  }
  
  // 같은 방 사용자에게 전송
  room.users.forEach(id => {
    const c = clients.get(id);
    if (c && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify({
        type: 'message',
        data: message
      }));
    }
  });
  
  // 주기적 백업
  saveData();
}

// ============================================
// 게시판 REST API
// ============================================

// 게시글 목록
app.get('/api/posts', (req, res) => {
  res.json({
    success: true,
    posts: posts,
    count: posts.length
  });
});

// 게시글 작성
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
  await saveData();
  
  console.log(`📝 새 게시글: "${newPost.title}"`);
  res.json({ success: true, post: newPost });
});

// 게시글 삭제
app.delete('/api/posts/:id', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { password } = req.body;
  
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: '게시글을 찾을 수 없습니다' 
    });
  }
  
  const post = posts[postIndex];
  
  // 비밀번호 확인
  if (password !== post.password && password !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: '비밀번호가 일치하지 않습니다' 
    });
  }
  
  posts.splice(postIndex, 1);
  await saveData();
  
  console.log(`🗑️ 게시글 삭제: "${post.title}"`);
  res.json({ success: true, message: '게시글이 삭제되었습니다' });
});

// 게시글 수정
app.put('/api/posts/:id', async (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: '게시글을 찾을 수 없습니다' 
    });
  }
  
  posts[postIndex] = { ...posts[postIndex], ...req.body };
  await saveData();
  
  res.json({ success: true, post: posts[postIndex] });
});

// 댓글 추가
app.post('/api/posts/:id/comments', async (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ 
      success: false, 
      message: '게시글을 찾을 수 없습니다' 
    });
  }
  
  const newComment = {
    id: Date.now(),
    ...req.body,
    date: new Date().toISOString()
  };
  
  post.comments.push(newComment);
  await saveData();
  
  res.json({ success: true, comment: newComment, post });
});

// 투표
app.post('/api/posts/:id/vote', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { userId, type } = req.body;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ 
      success: false, 
      message: '게시글을 찾을 수 없습니다' 
    });
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
  
  await saveData();
  res.json({ success: true, post });
});

// 헬스체크
app.get('/', (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  res.json({
    status: 'running',
    service: 'Athlete Time Backend (Simple)',
    version: '3.0',
    uptime: `${hours}h ${minutes}m`,
    posts: posts.length,
    chatRooms: {
      main: chatRooms.main.messages.length,
      running: chatRooms.running.messages.length,
      free: chatRooms.free.messages.length
    }
  });
});

// ============================================
// 서버 시작
// ============================================

async function startServer() {
  await loadData();
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 Athlete Time 백엔드 (Simple v3.0)   ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  환경: ${process.env.RENDER ? 'Render Starter' : 'Local'}              ║
║  게시글: ${posts.length}개                           ║
╠════════════════════════════════════════════╣
║  ⚠️  주의사항:                              ║
║  - 서버 재시작 시 데이터 초기화            ║
║  - 영구 저장은 DB 연동 필요                ║
╚════════════════════════════════════════════╝
    `);
  });
}

// 5분마다 백업
setInterval(saveData, 5 * 60 * 1000);

// 종료 시 저장
process.on('SIGTERM', async () => {
  await saveData();
  process.exit(0);
});

startServer();