const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3003;

// 정적 파일 제공
app.use(express.static('.'));

// 데이터 구조
const clients = new Map(); // clientId -> {ws, user, currentRoom}
const rooms = new Map(); // roomId -> {id, name, users: Set, messages: [], created, private}
const userProfiles = new Map(); // userId -> profile data

// 기본 채팅방 초기화
const defaultRooms = [
  { id: 'general', name: '일반 대화방', desc: '모두 환영' },
  { id: 'beginner', name: '초보 러너', desc: '입문자 환영' },
  { id: 'marathon', name: '마라톤 대회', desc: '대회 정보' },
  { id: 'equipment', name: '장비 리뷰', desc: '러닝화 & 장비' }
];

defaultRooms.forEach(room => {
  rooms.set(room.id, {
    ...room,
    users: new Set(),
    messages: [],
    created: new Date().toISOString(),
    private: false
  });
});

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  console.log(`새 클라이언트 연결: ${clientId}`);
  
  // 클라이언트 초기화
  const client = {
    ws,
    user: null,
    currentRoom: null
  };
  
  clients.set(clientId, client);
  
  // 메시지 처리
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data);
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  });
  
  // 연결 종료 처리
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client && client.currentRoom) {
      leaveRoom(clientId, client.currentRoom);
    }
    clients.delete(clientId);
    console.log(`클라이언트 연결 종료: ${clientId}`);
  });
  
  // 에러 처리
  ws.on('error', (error) => {
    console.error(`WebSocket 에러 (${clientId}):`, error);
  });
  
  // 초기 상태 전송
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      clientId,
      rooms: Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        desc: room.desc,
        userCount: room.users.size,
        private: room.private
      }))
    }
  }));
});

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
      
    case 'get_room_info':
      sendRoomInfo(clientId, data.data.room);
      break;
      
    default:
      console.log('알 수 없는 메시지 타입:', data.type);
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
    nickname: nickname || '익명러너',
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
  client.currentRoom = roomId;
  
  console.log(`${client.user.nickname}님이 ${room.name} 방에 입장 (${room.users.size}명)`);
  
  // 입장 알림 브로드캐스트
  broadcastToRoom(roomId, {
    type: 'user_joined',
    data: {
      room: roomId,
      nickname: client.user.nickname,
      count: room.users.size
    }
  }, clientId);
  
  // 방 사용자 수 업데이트
  broadcastToAll({
    type: 'room_users',
    data: {
      room: roomId,
      count: room.users.size
    }
  });
  
  // 최근 메시지 전송
  const recentMessages = room.messages.slice(-30); // 최근 30개
  client.ws.send(JSON.stringify({
    type: 'room_history',
    data: {
      room: roomId,
      messages: recentMessages
    }
  }));
}

// 방 나가기
function leaveRoom(clientId, roomId) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.delete(clientId);
  
  // 퇴장 알림 브로드캐스트
  broadcastToRoom(roomId, {
    type: 'user_left',
    data: {
      room: roomId,
      nickname: client.user?.nickname || '익명',
      count: room.users.size
    }
  });
  
  // 방 사용자 수 업데이트
  broadcastToAll({
    type: 'room_users',
    data: {
      room: roomId,
      count: room.users.size
    }
  });
  
  client.currentRoom = null;
  
  console.log(`${client.user?.nickname}님이 ${room.name} 방에서 퇴장 (${room.users.size}명)`);
}

// 채팅 메시지 처리
function handleChatMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  const room = rooms.get(client.currentRoom);
  if (!room) return;
  
  const message = {
    ...data,
    id: 'msg_' + Date.now(),
    userId: client.user?.id || clientId,
    timestamp: new Date().toISOString()
  };
  
  // 메시지 저장 (최대 100개)
  room.messages.push(message);
  if (room.messages.length > 100) {
    room.messages.shift();
  }
  
  // 같은 방 사용자들에게 브로드캐스트
  broadcastToRoom(client.currentRoom, {
    type: 'message',
    data: message
  });
  
  console.log(`[${room.name}] ${message.nickname}: ${message.text}`);
}

// 방 생성
function createRoom(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const roomId = data.id || 'room_' + Date.now();
  
  // 중복 체크
  if (rooms.has(roomId)) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: '이미 존재하는 방입니다.' }
    }));
    return;
  }
  
  // 새 방 생성
  const newRoom = {
    id: roomId,
    name: data.name,
    desc: data.description || '',
    private: data.private || false,
    owner: client.user?.id || clientId,
    users: new Set(),
    messages: [],
    created: new Date().toISOString()
  };
  
  rooms.set(roomId, newRoom);
  
  // 모든 사용자에게 새 방 알림
  broadcastToAll({
    type: 'room_created',
    data: {
      id: roomId,
      name: newRoom.name,
      desc: newRoom.desc,
      private: newRoom.private,
      userCount: 0
    }
  });
  
  console.log(`새 채팅방 생성: ${newRoom.name} by ${client.user?.nickname}`);
}

// 프로필 업데이트
function updateProfile(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // 프로필 저장
  userProfiles.set(data.userId, data);
  
  // 클라이언트 정보 업데이트
  if (client.user) {
    client.user.nickname = data.nickname;
    client.user.anonymous = data.anonymous;
  }
  
  console.log(`프로필 업데이트: ${data.nickname}`);
}

// 방 정보 전송
function sendRoomInfo(clientId, roomId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const room = rooms.get(roomId);
  if (!room) return;
  
  client.ws.send(JSON.stringify({
    type: 'room_info',
    data: {
      id: room.id,
      name: room.name,
      desc: room.desc,
      userCount: room.users.size,
      messageCount: room.messages.length,
      created: room.created
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
  clients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// 서버 시작
server.listen(PORT, () => {
  console.log(`
========================================
🚀 다중 채팅방 서버 시작됨
========================================
포트: ${PORT}
URL: http://localhost:${PORT}
WebSocket: ws://localhost:${PORT}

기본 채팅방:
- 일반 대화방
- 초보 러너  
- 마라톤 대회
- 장비 리뷰

기능:
✅ 다중 채팅방 지원
✅ 닉네임 설정
✅ 익명 모드
✅ 방 생성/삭제
✅ 메시지 히스토리
========================================
  `);
});

// 정리 작업
process.on('SIGINT', () => {
  console.log('\n서버 종료 중...');
  
  // 모든 클라이언트에 종료 알림
  broadcastToAll({
    type: 'server_shutdown',
    data: { message: '서버가 종료됩니다.' }
  });
  
  // WebSocket 연결 종료
  wss.clients.forEach(ws => {
    ws.close();
  });
  
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});