const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3004;

// 정적 파일 제공
app.use(express.static('.'));

// CORS 헤더 추가
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 데이터 구조
const clients = new Map(); // clientId -> {ws, user, currentRoom}
const rooms = new Map(); // roomId -> {id, name, users, messages, created, lastActivity, permanent}
const roomTimers = new Map(); // roomId -> timeout
const activeUsers = new Map(); // userId -> {nickname, lastSeen, rooms}

// 상수
const ROOM_INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30분
const MESSAGE_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24시간 (사용 안 함)
const PERMANENT_ROOMS = ['main'];
const MESSAGE_SAVE_FILE = path.join(__dirname, 'chat-messages.json');

// 메시지 저장 함수
async function saveMessages() {
  try {
    const messageData = {};
    rooms.forEach((room, roomId) => {
      messageData[roomId] = room.messages;
    });
    
    await fs.writeFile(MESSAGE_SAVE_FILE, JSON.stringify(messageData, null, 2));
    console.log(`💾 메시지 저장 완료: ${Object.keys(messageData).reduce((sum, key) => sum + messageData[key].length, 0)}개`);
  } catch (error) {
    console.error('❌ 메시지 저장 실패:', error);
  }
}

// 메시지 복원 함수
async function loadMessages() {
  try {
    const data = await fs.readFile(MESSAGE_SAVE_FILE, 'utf-8');
    const messageData = JSON.parse(data);
    
    let totalLoaded = 0;
    Object.keys(messageData).forEach(roomId => {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.messages = messageData[roomId] || [];
        totalLoaded += room.messages.length;
        console.log(`📂 [${room.name}] ${room.messages.length}개 메시지 복원`);
      }
    });
    
    console.log(`✅ 총 ${totalLoaded}개 메시지 복원 완료`);
    return messageData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 저장된 메시지 파일 없음 - 새로 시작');
    } else {
      console.error('❌ 메시지 복원 실패:', error);
    }
    return {};
  }
}

// 기본 채팅방 초기화 - 메인 채팅방 1개만
const defaultRooms = [
  { id: 'main', name: '메인 채팅방', desc: '모든 러너 환영', icon: '💬' }
];

// 방 초기화 함수
async function initializeRooms() {
  // 기본 방 생성
  defaultRooms.forEach(room => {
    rooms.set(room.id, {
      ...room,
      users: new Set(),
      messages: [], // 빈 배열로 시작 (나중에 복원)
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      permanent: PERMANENT_ROOMS.includes(room.id)
    });
  });
  
  // 저장된 메시지 복원
  const savedMessages = await loadMessages();
  
  // 복원된 메시지가 없는 경우에만 테스트 메시지 추가
  const mainRoom = rooms.get('main');
  if (mainRoom && (!mainRoom.messages || mainRoom.messages.length === 0)) {
    mainRoom.messages = [
      // 초기 환영 메시지만 추가
      {
        id: 'welcome_msg',
        text: '🎉 채팅방에 오신 것을 환영합니다! 모든 메시지는 영구 보존됩니다.',
        nickname: '시스템',
        avatar: '📢',
        userId: 'system',
        timestamp: new Date().toISOString(),
        room: 'main'
      }
    ];
  }
}

// 서버 시작 시 방 초기화
initializeRooms();

// 통계 데이터
let stats = {
  totalMessages: 0,
  totalUsers: 0,
  peakUsers: 0,
  roomsCreated: 1
};

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  console.log(`✅ 새 클라이언트 연결: ${clientId}`);
  
  // 클라이언트 초기화
  const client = {
    ws,
    user: null,
    currentRoom: null,
    connectedAt: new Date()
  };
  
  clients.set(clientId, client);
  stats.totalUsers = clients.size;
  if (clients.size > stats.peakUsers) {
    stats.peakUsers = clients.size;
  }
  
  // 메시지 처리
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data);
    } catch (error) {
      console.error('❌ 메시지 파싱 오류:', error);
    }
  });
  
  // 연결 종료 처리
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client && client.currentRoom) {
      leaveRoom(clientId, client.currentRoom);
    }
    clients.delete(clientId);
    stats.totalUsers = clients.size;
    console.log(`👋 클라이언트 연결 종료: ${clientId} (남은 연결: ${clients.size})`);
  });
  
  // 에러 처리
  ws.on('error', (error) => {
    console.error(`❌ WebSocket 에러 (${clientId}):`, error.message);
  });
  
  // Ping-Pong으로 연결 유지
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // 초기 상태 전송
  sendInitialState(ws);
});

// 초기 상태 전송
function sendInitialState(ws) {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    desc: room.desc,
    icon: room.icon || '💬',
    userCount: room.users.size,
    permanent: room.permanent,
    private: room.private,
    lastActivity: room.lastActivity
  }));
  
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      rooms: roomList,
      stats: {
        onlineUsers: clients.size,
        totalRooms: rooms.size,
        totalMessages: stats.totalMessages
      }
    }
  }));
}

// 메시지 핸들러
function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch(data.type) {
    case 'join':
      joinRoom(clientId, data.data);
      break;
      
    case 'leave':
      leaveRoom(clientId, data.data.room);
      break;
      
    case 'message':
      handleChatMessage(clientId, data.data);
      break;
      
    case 'create_room':
      createRoom(clientId, data.data);
      break;
      
    case 'profile_update':
      updateProfile(clientId, data.data);
      break;
      
    case 'typing':
      handleTyping(clientId, data.data);
      break;
      
    case 'get_stats':
      sendStats(clientId);
      break;
      
    default:
      console.log('❓ 알 수 없는 메시지 타입:', data.type);
  }
}

// 방 입장
function joinRoom(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { room: roomId, nickname, userId } = data;
  
  // 이전 방에서 나가기
  if (client.currentRoom && client.currentRoom !== roomId) {
    leaveRoom(clientId, client.currentRoom);
  }
  
  // 사용자 정보 설정
  client.user = {
    id: userId || clientId,
    nickname: nickname || `러너${Math.floor(Math.random() * 10000)}`,
    joinedAt: new Date()
  };
  
  // 방 확인
  let room = rooms.get(roomId);
  if (!room) {
    // 방이 없으면 일반 대화방으로
    room = rooms.get('general');
  }
  
  // 방 입장
  room.users.add(clientId);
  client.currentRoom = room.id;
  
  // 활동 시간 업데이트
  updateRoomActivity(room.id);
  
  console.log(`📥 ${client.user.nickname}님이 [${room.name}] 입장 (${room.users.size}명)`);
  
  // 입장 알림 브로드캐스트
  broadcastToRoom(room.id, {
    type: 'user_joined',
    data: {
      room: room.id,
      nickname: client.user.nickname,
      userId: client.user.id,
      count: room.users.size,
      timestamp: new Date().toISOString()
    }
  }, clientId);
  
  // 방 정보 업데이트 브로드캐스트
  broadcastRoomUpdate(room.id);
  
  // 모든 메시지 전송 (전체 누적 메시지)
  const recentMessages = room.messages;
  
  // 디버깅: 메시지 개수 로그
  console.log(`📨 [${room.name}] 전체 메시지 ${recentMessages.length}개 전송`);
  
  client.ws.send(JSON.stringify({
    type: 'room_joined',
    data: {
      room: room.id,
      roomName: room.name,
      messages: recentMessages,
      userCount: room.users.size
    }
  }));
  
  // 전체 통계 업데이트
  broadcastStats();
}

// 방 나가기
function leaveRoom(clientId, roomId) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.delete(clientId);
  
  console.log(`📤 ${client.user?.nickname}님이 [${room.name}] 퇴장 (${room.users.size}명)`);
  
  // 퇴장 알림
  broadcastToRoom(roomId, {
    type: 'user_left',
    data: {
      room: roomId,
      nickname: client.user?.nickname || '익명',
      userId: client.user?.id,
      count: room.users.size,
      timestamp: new Date().toISOString()
    }
  });
  
  // 방 정보 업데이트
  broadcastRoomUpdate(roomId);
  
  client.currentRoom = null;
  
  // 빈 사용자 정의 방 체크
  if (room.users.size === 0 && !room.permanent) {
    startRoomInactivityTimer(roomId);
  }
  
  // 통계 업데이트
  broadcastStats();
}

// 채팅 메시지 처리
function handleChatMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(client.currentRoom);
  if (!room) return;
  
  // 메시지 생성
  const message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    text: data.text.substring(0, 500), // 최대 500자
    nickname: data.nickname || client.user?.nickname || '익명',
    avatar: data.avatar || data.nickname?.substring(0, 1) || '?',
    userId: client.user?.id || clientId,
    timestamp: new Date().toISOString(),
    room: client.currentRoom
  };
  
  // 메시지 저장 (누적 저장)
  room.messages.push(message);
  
  // 디버깅: 메시지 저장 확인
  console.log(`💾 [${room.name}] 메시지 저장됨. 총 메시지: ${room.messages.length}개`);
  
  // 파일에 저장 (비동기)
  saveMessages().catch(err => console.error('메시지 저장 실패:', err));
  
  // 활동 시간 업데이트
  updateRoomActivity(client.currentRoom);
  
  // 통계 업데이트
  stats.totalMessages++;
  
  // 같은 방 사용자들에게 브로드캐스트
  broadcastToRoom(client.currentRoom, {
    type: 'message',
    data: message
  });
  
  console.log(`💬 [${room.name}] ${message.nickname}: ${message.text.substring(0, 50)}...`);
  
  // 통계 브로드캐스트
  if (stats.totalMessages % 10 === 0) {
    broadcastStats();
  }
}

// 방 생성
function createRoom(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.user) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: '먼저 로그인이 필요합니다.' }
    }));
    return;
  }
  
  // 방 이름 검증
  const roomName = (data.name || '').trim().substring(0, 30);
  if (!roomName) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: '방 이름을 입력하세요.' }
    }));
    return;
  }
  
  // 중복 이름 체크
  const existingRoom = Array.from(rooms.values()).find(r => r.name === roomName);
  if (existingRoom) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: '이미 같은 이름의 방이 존재합니다.' }
    }));
    return;
  }
  
  const roomId = 'room_' + Date.now();
  
  // 새 방 생성
  const newRoom = {
    id: roomId,
    name: roomName,
    desc: (data.description || '').substring(0, 100),
    icon: data.icon || '💬',
    private: data.private || false,
    permanent: false,
    owner: client.user.id,
    ownerName: client.user.nickname,
    users: new Set(),
    messages: [],
    created: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  
  rooms.set(roomId, newRoom);
  stats.roomsCreated++;
  
  // 모든 사용자에게 새 방 알림
  broadcastToAll({
    type: 'room_created',
    data: {
      id: roomId,
      name: newRoom.name,
      desc: newRoom.desc,
      icon: newRoom.icon,
      owner: newRoom.ownerName,
      private: newRoom.private,
      userCount: 0
    }
  });
  
  console.log(`🏠 새 채팅방 생성: [${newRoom.name}] by ${client.user.nickname}`);
  
  // 생성자를 방에 입장시킴
  setTimeout(() => {
    joinRoom(clientId, { room: roomId, nickname: client.user.nickname, userId: client.user.id });
  }, 100);
}

// 방 활동 시간 업데이트
function updateRoomActivity(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.lastActivity = new Date().toISOString();
  
  // 타이머 리셋
  if (!room.permanent && roomTimers.has(roomId)) {
    clearTimeout(roomTimers.get(roomId));
    roomTimers.delete(roomId);
  }
  
  // 사용자가 있으면 타이머 시작하지 않음
  if (room.users.size === 0 && !room.permanent) {
    startRoomInactivityTimer(roomId);
  }
}

// 방 비활성 타이머 시작
function startRoomInactivityTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.permanent) return;
  
  // 기존 타이머 제거
  if (roomTimers.has(roomId)) {
    clearTimeout(roomTimers.get(roomId));
  }
  
  // 새 타이머 설정
  const timer = setTimeout(() => {
    deleteInactiveRoom(roomId);
  }, ROOM_INACTIVE_TIMEOUT);
  
  roomTimers.set(roomId, timer);
  
  console.log(`⏱️ [${room.name}] 방 30분 타이머 시작`);
}

// 비활성 방 삭제
function deleteInactiveRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.permanent || room.users.size > 0) return;
  
  console.log(`🗑️ 비활성 방 삭제: [${room.name}]`);
  
  // 방 삭제
  rooms.delete(roomId);
  roomTimers.delete(roomId);
  
  // 모든 사용자에게 방 삭제 알림
  broadcastToAll({
    type: 'room_deleted',
    data: {
      roomId,
      reason: '30분간 활동 없음'
    }
  });
}

// 프로필 업데이트
function updateProfile(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // 클라이언트 정보 업데이트
  if (client.user) {
    client.user.nickname = data.nickname || client.user.nickname;
    client.user.anonymous = data.anonymous;
  }
  
  // 활성 사용자 목록 업데이트
  activeUsers.set(data.userId, {
    nickname: data.nickname,
    lastSeen: new Date(),
    anonymous: data.anonymous
  });
  
  console.log(`👤 프로필 업데이트: ${data.nickname}`);
}

// 타이핑 상태 처리
function handleTyping(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  broadcastToRoom(client.currentRoom, {
    type: 'user_typing',
    data: {
      nickname: client.user?.nickname || '익명',
      isTyping: data.isTyping
    }
  }, clientId);
}

// 통계 전송
function sendStats(clientId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  client.ws.send(JSON.stringify({
    type: 'stats',
    data: {
      onlineUsers: clients.size,
      totalRooms: rooms.size,
      totalMessages: stats.totalMessages,
      peakUsers: stats.peakUsers,
      roomsCreated: stats.roomsCreated
    }
  }));
}

// 특정 방에 브로드캐스트
function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.forEach(clientId => {
    if (excludeClientId && clientId === excludeClientId) return;
    
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// 모든 클라이언트에 브로드캐스트
function broadcastToAll(message) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// 방 정보 업데이트 브로드캐스트
function broadcastRoomUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  broadcastToAll({
    type: 'room_update',
    data: {
      id: room.id,
      userCount: room.users.size,
      lastActivity: room.lastActivity
    }
  });
}

// 통계 브로드캐스트
function broadcastStats() {
  broadcastToAll({
    type: 'stats_update',
    data: {
      onlineUsers: clients.size,
      totalRooms: rooms.size,
      totalMessages: stats.totalMessages
    }
  });
}

// 메시지 정리 함수 - 비활성화됨 (모든 메시지 영구 보존)
function cleanupOldMessages() {
  // 메시지 삭제 비활성화 - 모든 메시지를 영구적으로 보존
  console.log('✨ 메시지 영구 보존 모드 - 삭제하지 않음');
  
  // 통계 정보만 출력
  let totalMessages = 0;
  rooms.forEach((room) => {
    totalMessages += room.messages.length;
    console.log(`📊 [${room.name}] 보존된 메시지: ${room.messages.length}개`);
  });
  
  console.log(`💾 전체 보존된 메시지: ${totalMessages}개`);
}

// 연결 상태 체크 (30초마다)
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    
    ws.isAlive = false;
    ws.ping();
  });
  
  // 통계 로그
  console.log(`📊 현재 상태: ${clients.size}명 접속, ${rooms.size}개 방, ${stats.totalMessages}개 메시지`);
}, 30000);

// 메시지 통계 확인 및 저장 (1시간마다)
setInterval(() => {
  cleanupOldMessages(); // 통계만 출력, 삭제하지 않음
  saveMessages().catch(err => console.error('주기적 저장 실패:', err)); // 메시지 백업
}, 60 * 60 * 1000); // 1시간마다

// 5분마다 메시지 자동 저장 (더 자주 저장)
setInterval(() => {
  saveMessages().catch(err => console.error('자동 저장 실패:', err));
}, 5 * 60 * 1000); // 5분마다

// 서버 시작 시 메시지 통계 확인
cleanupOldMessages();

// 서버 종료 시 정리
wss.on('close', () => {
  clearInterval(interval);
});

// HTTP 엔드포인트 - 통계 API
app.get('/api/stats', (req, res) => {
  res.json({
    onlineUsers: clients.size,
    totalRooms: rooms.size,
    totalMessages: stats.totalMessages,
    peakUsers: stats.peakUsers,
    roomsCreated: stats.roomsCreated,
    rooms: Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      userCount: r.users.size,
      permanent: r.permanent
    }))
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🚀 채팅 서버 시작됨                  ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  URL: http://localhost:${PORT}              ║
║  WebSocket: ws://localhost:${PORT}          ║
╠════════════════════════════════════════════╣
║  기능:                                      ║
║  ✅ 메인 채팅방 + 사용자 채팅방          ║
║  ✅ 30분 무응답 시 방 자동 삭제           ║
║  ✅ 실시간 통계                            ║
║  ✅ 메시지 영구 보존 (파일 저장)         ║
║  ✅ 타이핑 표시                            ║
║  ✅ 연결 상태 체크                         ║
╠════════════════════════════════════════════╣
║  기본 채팅방:                               ║
║  • 메인 채팅방 (영구)                     ║
╚════════════════════════════════════════════╝
  `);
});

// 프로세스 종료 시 메시지 저장
process.on('SIGINT', async () => {
  console.log('\n🔴 서버 종료 중...');
  await saveMessages();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔴 서버 종료 중...');
  await saveMessages();
  process.exit(0);
});

// 정리 작업
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  
  // 모든 타이머 정리
  roomTimers.forEach(timer => clearTimeout(timer));
  
  // 모든 클라이언트에 종료 알림
  broadcastToAll({
    type: 'server_shutdown',
    data: { message: '서버가 재시작됩니다. 잠시 후 다시 연결됩니다.' }
  });
  
  // WebSocket 연결 종료
  wss.clients.forEach(ws => {
    ws.close();
  });
  
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});