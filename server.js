// 개선된 통합 백엔드 서버 (채팅방 분리, 봇 기능 포함)
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

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 채팅 서버 (WebSocket) - 개선된 버전
// ============================================

const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// 채팅 데이터 구조
const clients = new Map();
const rooms = new Map();

// 채팅방 초기화
async function initializeChatRooms() {
  // 3개의 독립적인 채팅방 생성
  const roomConfigs = [
    { id: 'main', name: '메인 채팅방', description: '모든 러너들의 소통 공간' },
    { id: 'running', name: '러닝 채팅방', description: '러닝 정보와 팁 공유' },
    { id: 'free', name: '자유 채팅방', description: '자유로운 대화' }
  ];
  
  roomConfigs.forEach(config => {
    rooms.set(config.id, {
      id: config.id,
      name: config.name,
      description: config.description,
      users: new Set(),
      messages: [],
      created: new Date().toISOString()
    });
  });
  
  await loadChatMessages();
  
  // 각 방에 환영 메시지 추가
  rooms.forEach(room => {
    if (room.messages.length === 0) {
      room.messages.push({
        id: 'welcome_' + room.id,
        text: `${room.name}에 오신 것을 환영합니다! 🎉`,
        nickname: '시스템',
        avatar: '🤖',
        timestamp: new Date().toISOString(),
        room: room.id,
        isBot: true
      });
    }
  });
}

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

// WebSocket 연결 처리
wss.on('connection', (ws) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  clients.set(clientId, { 
    ws, 
    currentRoom: null,
    nickname: '익명',
    joinedAt: new Date().toISOString()
  });
  
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
    handleDisconnect(clientId);
  });
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket 오류 (${clientId}):`, error);
  });
  
  // 초기 상태 전송
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      rooms: Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        userCount: room.users.size,
        lastMessage: room.messages[room.messages.length - 1]
      }))
    }
  }));
});

// 클라이언트 연결 종료 처리
function handleDisconnect(clientId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // 방에서 나가기
  if (client.currentRoom) {
    const room = rooms.get(client.currentRoom);
    if (room) {
      room.users.delete(clientId);
      
      // 퇴장 알림 전송
      broadcastToRoom(client.currentRoom, {
        type: 'user_left',
        data: {
          nickname: client.nickname,
          room: client.currentRoom
        }
      }, clientId);
      
      // 접속자 수 업데이트
      broadcastUserCount(client.currentRoom);
    }
  }
  
  clients.delete(clientId);
  console.log(`👋 채팅 클라이언트 연결 종료: ${clientId}`);
}

// 채팅 메시지 처리
function handleChatMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch(data.type) {
    case 'join':
      joinRoom(clientId, data.data);
      break;
    case 'leave':
      leaveRoom(clientId, data.data);
      break;
    case 'message':
      broadcastMessage(clientId, data.data);
      break;
    case 'command':
      handleCommand(clientId, data.data);
      break;
  }
}

// 방 입장
function joinRoom(clientId, data) {
  const { room: roomId, nickname } = data;
  const room = rooms.get(roomId);
  if (!room) {
    console.error(`❌ 존재하지 않는 방: ${roomId}`);
    return;
  }
  
  const client = clients.get(clientId);
  
  // 이전 방에서 나가기
  if (client.currentRoom && client.currentRoom !== roomId) {
    leaveRoom(clientId, { room: client.currentRoom });
  }
  
  // 새 방 입장
  client.currentRoom = roomId;
  client.nickname = nickname || '익명';
  room.users.add(clientId);
  
  console.log(`📥 [${room.name}] ${client.nickname} 입장 (현재 ${room.users.size}명)`);
  
  // 해당 방의 모든 메시지 전송 (방별로 독립적)
  client.ws.send(JSON.stringify({
    type: 'room_joined',
    data: {
      room: room.id,
      roomName: room.name,
      messages: room.messages, // 해당 방의 메시지만 전송
      userCount: room.users.size
    }
  }));
  
  // 입장 알림 전송 (봇 메시지)
  const joinMessage = {
    id: 'bot_' + Date.now(),
    type: 'user_joined',
    data: {
      nickname: client.nickname,
      room: roomId
    }
  };
  
  broadcastToRoom(roomId, joinMessage, clientId);
  
  // 접속자 수 업데이트
  broadcastUserCount(roomId);
}

// 방 나가기
function leaveRoom(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(client.currentRoom);
  if (!room) return;
  
  room.users.delete(clientId);
  
  console.log(`📤 [${room.name}] ${client.nickname} 퇴장 (현재 ${room.users.size}명)`);
  
  // 퇴장 알림
  broadcastToRoom(client.currentRoom, {
    type: 'user_left',
    data: {
      nickname: client.nickname,
      room: client.currentRoom
    }
  }, clientId);
  
  // 접속자 수 업데이트
  broadcastUserCount(client.currentRoom);
  
  client.currentRoom = null;
}

// 메시지 브로드캐스트
function broadcastMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(client.currentRoom);
  if (!room) return;
  
  const message = {
    id: 'msg_' + Date.now(),
    text: messageData.text,
    nickname: messageData.nickname || client.nickname || '익명',
    avatar: messageData.avatar || '?',
    timestamp: new Date().toISOString(),
    room: client.currentRoom // 중요: 메시지가 속한 방 ID 포함
  };
  
  // 해당 방의 메시지 배열에만 저장
  room.messages.push(message);
  
  // 메시지 개수 제한 (방별로 최대 500개)
  if (room.messages.length > 500) {
    room.messages = room.messages.slice(-500);
  }
  
  saveChatMessages(); // 비동기 저장
  
  console.log(`💬 [${room.name}] ${message.nickname}: ${message.text.substring(0, 50)}`);
  
  // 같은 방의 사용자들에게만 전송
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

// 특정 방에 메시지 전송
function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.forEach(id => {
    if (id === excludeClientId) return;
    
    const client = clients.get(id);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// 접속자 수 업데이트
function broadcastUserCount(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const message = {
    type: 'user_count',
    data: {
      room: roomId,
      count: room.users.size
    }
  };
  
  broadcastToRoom(roomId, message);
}

// 명령어 처리 (챗봇 기능)
function handleCommand(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const { command, args } = data;
  const room = rooms.get(client.currentRoom);
  
  let response = '';
  
  switch(command) {
    case 'help':
      response = `
📌 사용 가능한 명령어:
/help - 도움말 표시
/users - 현재 방 접속자 수
/rooms - 채팅방 목록
/time - 현재 시간
/info - 방 정보
      `;
      break;
    case 'users':
      response = `현재 ${room.name}에 ${room.users.size}명이 접속 중입니다.`;
      break;
    case 'rooms':
      response = Array.from(rooms.values())
        .map(r => `${r.name}: ${r.users.size}명`)
        .join('\n');
      break;
    case 'time':
      response = `현재 시간: ${new Date().toLocaleString('ko-KR')}`;
      break;
    case 'info':
      response = `
📍 ${room.name}
${room.description}
접속자: ${room.users.size}명
메시지: ${room.messages.length}개
      `;
      break;
    default:
      response = `알 수 없는 명령어입니다. /help를 입력해보세요.`;
  }
  
  // 봇 응답 전송
  const botMessage = {
    id: 'bot_' + Date.now(),
    text: response,
    nickname: '채팅봇',
    avatar: '🤖',
    timestamp: new Date().toISOString(),
    room: client.currentRoom,
    isBot: true
  };
  
  // 명령어를 입력한 사용자에게만 전송
  client.ws.send(JSON.stringify({
    type: 'message',
    data: botMessage
  }));
}

// ============================================
// 게시판 API (REST) - 기존과 동일
// ============================================

let posts = [];

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
        password: 'admin',
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

// 게시판 엔드포인트들
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
  const { password } = req.body;
  
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
  }
  
  const post = posts[postIndex];
  
  // 비밀번호 확인
  if (password !== post.password && password !== 'admin') {
    console.log(`❌ 삭제 실패 - 비밀번호 불일치: 입력=${password}, 저장=${post.password}`);
    return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다' });
  }
  
  console.log(`🗑️ 게시글 삭제: ID=${postId}, 제목="${post.title}"`);
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
  const roomStats = {};
  rooms.forEach((room, id) => {
    roomStats[id] = {
      name: room.name,
      users: room.users.size,
      messages: room.messages.length
    };
  });
  
  res.json({
    status: 'running',
    service: 'Athlete Time Backend (Improved)',
    version: '2.0',
    endpoints: {
      websocket: '/ws',
      posts: '/api/posts',
      health: '/'
    },
    chatRooms: roomStats
  });
});

// 초기화 및 서버 시작
async function startServer() {
  await initializeChatRooms();
  await loadPosts();
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 Athlete Time 백엔드 서버 v2.0      ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  WebSocket: ws://localhost:${PORT}/ws       ║
║  게시판 API: http://localhost:${PORT}/api   ║
╠════════════════════════════════════════════╣
║  기능:                                      ║
║  ✅ 실시간 채팅 (방별 독립 메시지)         ║
║  ✅ 챗봇 명령어 지원                       ║
║  ✅ 자동 스크롤 옵션                       ║
║  ✅ 익명 게시판 (REST API)                 ║
║  ✅ 데이터 영구 저장                       ║
╚════════════════════════════════════════════╝
    `);
  });
}

// 정기적인 저장 (5분마다)
setInterval(() => {
  saveChatMessages();
  savePosts();
}, 5 * 60 * 1000);

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