// 애슬리트 타임 - 실시간 채팅 WebSocket 서버 (치지직 스타일)
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3006;
const DATA_DIR = path.join(__dirname, 'chat-data');

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 데이터 디렉토리 생성
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 채팅방 데이터
const rooms = {
  'main': { name: '메인 채팅', icon: '🏠', users: new Set(), messages: [] },
  'sprint': { name: '단거리', icon: '⚡', users: new Set(), messages: [] },
  'middle': { name: '중거리', icon: '🏃', users: new Set(), messages: [] },
  'long': { name: '장거리', icon: '🏃‍♂️', users: new Set(), messages: [] },
  'field': { name: '필드', icon: '🥇', users: new Set(), messages: [] },
  'free': { name: '자유', icon: '💬', users: new Set(), messages: [] }
};

// 사용자 데이터
const users = new Map();

// 메시지 히스토리 로드
async function loadMessages(room) {
  try {
    const filePath = path.join(DATA_DIR, `${room}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    rooms[room].messages = JSON.parse(data);
    console.log(`📂 ${room} 방 메시지 로드: ${rooms[room].messages.length}개`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`메시지 로드 실패 (${room}):`, error);
    }
  }
}

// 메시지 히스토리 저장
async function saveMessages(room) {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${room}.json`);
    // 최근 100개 메시지만 유지
    const recentMessages = rooms[room].messages.slice(-100);
    await fs.writeFile(filePath, JSON.stringify(recentMessages, null, 2));
  } catch (error) {
    console.error(`메시지 저장 실패 (${room}):`, error);
  }
}

// 서버 시작 시 모든 방의 메시지 로드
async function loadAllMessages() {
  for (const room of Object.keys(rooms)) {
    await loadMessages(room);
  }
}

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// 클라이언트 연결 처리
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 새 연결: ${clientIp}`);
  
  let currentUser = null;
  let currentRoom = null;
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'join':
          await handleJoin(ws, message);
          break;
        case 'message':
          await handleMessage(ws, message);
          break;
        case 'leave':
          handleLeave(ws);
          break;
        default:
          console.warn('알 수 없는 메시지 타입:', message.type);
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '메시지 처리 중 오류가 발생했습니다.'
      }));
    }
  });
  
  // 방 입장 처리
  async function handleJoin(ws, message) {
    const { room, nickname } = message;
    
    if (!room || !nickname) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '방 이름과 닉네임이 필요합니다.'
      }));
      return;
    }
    
    if (!rooms[room]) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '존재하지 않는 방입니다.'
      }));
      return;
    }
    
    // 이전 방에서 나가기
    if (currentRoom) {
      rooms[currentRoom].users.delete(currentUser);
      broadcastToRoom(currentRoom, {
        type: 'system',
        text: `${currentUser.nickname}님이 나갔습니다.`,
        timestamp: new Date().toISOString()
      });
      broadcastUserCount(currentRoom);
    }
    
    // 사용자 정보 생성
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentUser = {
      id: userId,
      nickname: nickname,
      ws: ws,
      joinedAt: new Date()
    };
    
    currentRoom = room;
    rooms[room].users.add(currentUser);
    users.set(userId, currentUser);
    
    console.log(`👤 ${nickname}님이 ${rooms[room].name} 방에 입장`);
    
    // 입장 확인 메시지
    ws.send(JSON.stringify({
      type: 'joined',
      room: room,
      roomName: rooms[room].name,
      nickname: nickname,
      userId: userId
    }));
    
    // 메시지 히스토리 전송
    ws.send(JSON.stringify({
      type: 'history',
      messages: rooms[room].messages.slice(-50) // 최근 50개
    }));
    
    // 시스템 메시지 브로드캐스트
    broadcastToRoom(room, {
      type: 'system',
      text: `${nickname}님이 입장했습니다.`,
      timestamp: new Date().toISOString()
    }, userId);
    
    // 사용자 수 업데이트
    broadcastUserCount(room);
    
    // 모든 방의 사용자 수 전체 브로드캐스트
    broadcastAllRoomCounts();
  }
  
  // 메시지 처리
  async function handleMessage(ws, message) {
    if (!currentUser || !currentRoom) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '방에 입장하지 않았습니다.'
      }));
      return;
    }
    
    const { text } = message;
    
    if (!text || text.trim().length === 0) {
      return;
    }
    
    if (text.length > 500) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '메시지는 500자 이하로 작성해주세요.'
      }));
      return;
    }
    
    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      nickname: currentUser.nickname,
      message: text.trim(),
      room: currentRoom,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // 메시지 저장
    rooms[currentRoom].messages.push(chatMessage);
    
    // 비동기로 파일에 저장
    saveMessages(currentRoom).catch(err => 
      console.error('메시지 저장 오류:', err)
    );
    
    console.log(`💬 [${rooms[currentRoom].name}] ${currentUser.nickname}: ${text}`);
    
    // 모든 사용자에게 브로드캐스트
    broadcastToRoom(currentRoom, {
      type: 'message',
      data: {
        nickname: currentUser.nickname,
        text: text.trim(),
        timestamp: chatMessage.timestamp,
        userId: currentUser.id
      }
    });
  }
  
  // 방 나가기 처리
  function handleLeave(ws) {
    if (currentUser && currentRoom) {
      rooms[currentRoom].users.delete(currentUser);
      users.delete(currentUser.id);
      
      console.log(`👋 ${currentUser.nickname}님이 ${rooms[currentRoom].name} 방에서 나감`);
      
      broadcastToRoom(currentRoom, {
        type: 'system',
        text: `${currentUser.nickname}님이 나갔습니다.`,
        timestamp: new Date().toISOString()
      });
      
      broadcastUserCount(currentRoom);
      broadcastAllRoomCounts();
      
      currentUser = null;
      currentRoom = null;
    }
  }
  
  // 연결 종료 처리
  ws.on('close', () => {
    console.log(`🔌 연결 종료: ${clientIp}`);
    handleLeave(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 오류:', error);
  });
});

// 방의 모든 사용자에게 메시지 브로드캐스트
function broadcastToRoom(room, message, excludeUserId = null) {
  if (!rooms[room]) return;
  
  const messageStr = JSON.stringify(message);
  
  rooms[room].users.forEach(user => {
    if (user.id !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(messageStr);
    }
  });
}

// 특정 방의 사용자 수 브로드캐스트 (본인 포함)
function broadcastUserCount(room) {
  if (!rooms[room]) return;
  
  const message = JSON.stringify({
    type: 'userCount',
    room: room,
    count: rooms[room].users.size
  });
  
  // 모든 사용자에게 전송 (본인 포함)
  rooms[room].users.forEach(user => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  });
}

// 모든 방의 사용자 수 브로드캐스트
function broadcastAllRoomCounts() {
  const roomCounts = {};
  for (const [roomId, roomData] of Object.entries(rooms)) {
    roomCounts[roomId] = roomData.users.size;
  }
  
  const message = JSON.stringify({
    type: 'allRoomCounts',
    counts: roomCounts
  });
  
  // 모든 연결된 클라이언트에게 전송
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST API 엔드포인트
app.get('/api/rooms', (req, res) => {
  const roomList = Object.entries(rooms).map(([id, data]) => ({
    id,
    name: data.name,
    icon: data.icon,
    userCount: data.users.size,
    messageCount: data.messages.length
  }));
  
  res.json({
    success: true,
    rooms: roomList
  });
});

app.get('/api/stats', (req, res) => {
  const totalUsers = Array.from(users.values()).length;
  const totalMessages = Object.values(rooms).reduce((sum, room) => sum + room.messages.length, 0);
  
  res.json({
    success: true,
    stats: {
      totalUsers,
      totalMessages,
      roomCount: Object.keys(rooms).length,
      rooms: Object.entries(rooms).map(([id, data]) => ({
        id,
        name: data.name,
        icon: data.icon,
        users: data.users.size
      }))
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeConnections: wss.clients.size,
    rooms: Object.keys(rooms).length
  });
});

// 서버 시작
server.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   💬 애슬리트 타임 채팅 서버 (치지직 스타일)      ║
╠════════════════════════════════════════════════╣
║  포트: ${PORT}                                    ║
║  WebSocket: ws://localhost:${PORT}              ║
║  HTTP API: http://localhost:${PORT}/api         ║
╠════════════════════════════════════════════════╣
║  채팅방:                                         ║
║  🏠 메인 채팅                                    ║
║  ⚡ 단거리                                       ║
║  🏃 중거리                                       ║
║  🏃‍♂️ 장거리                                       ║
║  🥇 필드                                         ║
║  💬 자유                                         ║
╚════════════════════════════════════════════════╝
  `);
  
  // 메시지 히스토리 로드
  await loadAllMessages();
  console.log('📂 모든 방의 메시지 히스토리 로드 완료');
  console.log(`🔗 서버 접속: http://localhost:${PORT}`);
  console.log(`🔗 헬스 체크: http://localhost:${PORT}/api/health`);
  console.log(`🔗 통계: http://localhost:${PORT}/api/stats\n`);
});

// 주기적으로 모든 방의 메시지 저장 (5분마다)
setInterval(async () => {
  for (const room of Object.keys(rooms)) {
    if (rooms[room].messages.length > 0) {
      await saveMessages(room);
    }
  }
  console.log('💾 모든 방의 메시지 자동 저장 완료');
}, 5 * 60 * 1000);

// 서버 종료 시 저장
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');
  
  // 모든 방의 메시지 저장
  for (const room of Object.keys(rooms)) {
    await saveMessages(room);
  }
  
  // 모든 클라이언트 연결 종료
  wss.clients.forEach(client => {
    client.close();
  });
  
  server.close(() => {
    console.log('✅ 채팅 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버 종료 중...');
  
  for (const room of Object.keys(rooms)) {
    await saveMessages(room);
  }
  
  wss.clients.forEach(client => {
    client.close();
  });
  
  server.close(() => {
    console.log('✅ 채팅 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});
