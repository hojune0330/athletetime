/**
 * WebSocket 유틸리티 (v4.0.0)
 * 
 * 실시간 채팅 및 알림 브로드캐스트
 */

let wss = null;

// 채팅방별 클라이언트 관리
const rooms = {
  main: new Set(),
  training: new Set(),
  race: new Set(),
  injury: new Set(),
};

// 채팅방별 고유 닉네임 관리 (중복 접속자 처리용)
const roomNicknames = {
  main: new Map(), // nickname -> Set of ws connections
  training: new Map(),
  race: new Map(),
  injury: new Map(),
};

// 채팅 히스토리 (메모리 - 서버 재시작 시 초기화)
const chatHistory = {
  main: [],
  training: [],
  race: [],
  injury: [],
};

const MAX_HISTORY = 50; // 방당 최대 메시지 수

/**
 * 방의 고유 유저 수 반환 (닉네임 기준)
 */
function getUniqueUserCount(room) {
  if (!roomNicknames[room]) return 0;
  return roomNicknames[room].size;
}

/**
 * WebSocket 서버 설정
 * 
 * @param {WebSocket.Server} websocketServer - WebSocket 서버 인스턴스
 */
function setupWebSocket(websocketServer) {
  wss = websocketServer;
  
  wss.on('connection', (ws) => {
    console.log('✅ WebSocket 클라이언트 연결');
    
    ws.currentRoom = null;
    ws.nickname = null;
    ws.userId = null;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleChatMessage(ws, message);
      } catch (error) {
        console.error('❌ 메시지 파싱 오류:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('❌ WebSocket 클라이언트 연결 해제');
      // 방에서 제거
      if (ws.currentRoom && rooms[ws.currentRoom]) {
        rooms[ws.currentRoom].delete(ws);
        
        // 닉네임 연결 제거
        let isLastConnection = false;
        if (ws.nickname && roomNicknames[ws.currentRoom]) {
          const connections = roomNicknames[ws.currentRoom].get(ws.nickname);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              roomNicknames[ws.currentRoom].delete(ws.nickname);
              isLastConnection = true;
            }
          }
        }
        
        // 유저 수 업데이트 (고유 닉네임 기준)
        broadcastToRoom(ws.currentRoom, {
          type: 'userCount',
          count: getUniqueUserCount(ws.currentRoom),
        });
        
        // 마지막 연결이 끊어졌을 때만 퇴장 알림
        if (isLastConnection && ws.nickname) {
          broadcastToRoom(ws.currentRoom, {
            type: 'system',
            text: `${ws.nickname}님이 퇴장했습니다.`,
          });
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket 에러:', error);
    });
  });
  
  console.log('🔌 WebSocket 서버 설정 완료');
}

/**
 * 채팅 메시지 처리
 */
function handleChatMessage(ws, message) {
  const { type, room, nickname, userId, text } = message;
  
  switch (type) {
    case 'join':
      // 이전 방에서 나가기
      if (ws.currentRoom && rooms[ws.currentRoom]) {
        rooms[ws.currentRoom].delete(ws);
        
        // 닉네임 연결 제거
        if (ws.nickname && roomNicknames[ws.currentRoom]) {
          const connections = roomNicknames[ws.currentRoom].get(ws.nickname);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              roomNicknames[ws.currentRoom].delete(ws.nickname);
              // 마지막 연결이 끊어졌을 때만 퇴장 알림 (이전 방에서)
            }
          }
        }
        
        broadcastToRoom(ws.currentRoom, {
          type: 'userCount',
          count: getUniqueUserCount(ws.currentRoom),
        });
      }
      
      // 새 방에 입장
      ws.currentRoom = room || 'main';
      ws.nickname = nickname;
      ws.userId = userId;
      
      if (!rooms[ws.currentRoom]) {
        rooms[ws.currentRoom] = new Set();
      }
      if (!roomNicknames[ws.currentRoom]) {
        roomNicknames[ws.currentRoom] = new Map();
      }
      
      rooms[ws.currentRoom].add(ws);
      
      // 닉네임별 연결 관리
      const isNewUser = !roomNicknames[ws.currentRoom].has(nickname);
      if (!roomNicknames[ws.currentRoom].has(nickname)) {
        roomNicknames[ws.currentRoom].set(nickname, new Set());
      }
      roomNicknames[ws.currentRoom].get(nickname).add(ws);
      
      // 새로운 유저일 때만 입장 알림
      if (isNewUser) {
        broadcastToRoom(ws.currentRoom, {
          type: 'system',
          text: `${nickname}님이 입장했습니다.`,
        });
      }
      
      // 유저 수 업데이트 (고유 닉네임 기준)
      broadcastToRoom(ws.currentRoom, {
        type: 'userCount',
        count: getUniqueUserCount(ws.currentRoom),
      });
      
      // 채팅 히스토리 전송
      if (chatHistory[ws.currentRoom]) {
        ws.send(JSON.stringify({
          type: 'history',
          messages: chatHistory[ws.currentRoom],
        }));
      }
      break;
      
    case 'message':
      if (!ws.currentRoom || !text) return;
      
      const chatMessage = {
        nickname: ws.nickname,
        message: text,
        user_id: ws.userId,
        created_at: new Date().toISOString(),
      };
      
      // 히스토리에 저장
      if (!chatHistory[ws.currentRoom]) {
        chatHistory[ws.currentRoom] = [];
      }
      chatHistory[ws.currentRoom].push(chatMessage);
      if (chatHistory[ws.currentRoom].length > MAX_HISTORY) {
        chatHistory[ws.currentRoom].shift();
      }
      
      // 방의 모든 클라이언트에게 전송
      broadcastToRoom(ws.currentRoom, {
        type: 'message',
        data: {
          nickname: ws.nickname,
          text: text,
          timestamp: chatMessage.created_at,
          userId: ws.userId,
        },
      });
      break;
  }
}

/**
 * 특정 방의 클라이언트에게 메시지 전송
 */
function broadcastToRoom(room, data) {
  if (!rooms[room]) return;
  
  const message = JSON.stringify(data);
  rooms[room].forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

/**
 * 모든 연결된 클라이언트에게 메시지 브로드캐스트
 * 
 * @param {Object} data - 전송할 데이터
 */
function broadcastToClients(data) {
  if (!wss) {
    console.warn('⚠️  WebSocket 서버가 설정되지 않았습니다.');
    return;
  }
  
  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  });
  
  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sentCount++;
    }
  });
  
  if (sentCount > 0) {
    console.log(`📢 WebSocket 브로드캐스트: ${data.type} → ${sentCount}명`);
  }
}

/**
 * 연결된 클라이언트 수 반환
 * 
 * @returns {number} - 연결된 클라이언트 수
 */
function getClientsCount() {
  return wss ? wss.clients.size : 0;
}

/**
 * 닉네임 사용 가능 여부 확인
 * @param {string} nickname - 확인할 닉네임
 * @returns {boolean} - 사용 가능하면 true
 */
function isNicknameAvailable(nickname) {
  if (!nickname) return false;
  
  // 모든 방에서 닉네임 사용 여부 확인
  for (const room of Object.keys(roomNicknames)) {
    if (roomNicknames[room].has(nickname)) {
      return false;
    }
  }
  return true;
}

/**
 * 현재 사용 중인 모든 닉네임 목록 반환
 * @returns {string[]} - 사용 중인 닉네임 목록
 */
function getActiveNicknames() {
  const nicknames = new Set();
  for (const room of Object.keys(roomNicknames)) {
    for (const nickname of roomNicknames[room].keys()) {
      nicknames.add(nickname);
    }
  }
  return Array.from(nicknames);
}

module.exports = {
  setupWebSocket,
  broadcastToClients,
  getClientsCount,
  isNicknameAvailable,
  getActiveNicknames
};
