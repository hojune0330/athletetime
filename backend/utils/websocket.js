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

// 채팅 히스토리 (메모리 - 서버 재시작 시 초기화)
const chatHistory = {
  main: [],
  training: [],
  race: [],
  injury: [],
};

const MAX_HISTORY = 50; // 방당 최대 메시지 수

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
        broadcastToRoom(ws.currentRoom, {
          type: 'userCount',
          count: rooms[ws.currentRoom].size,
        });
        if (ws.nickname) {
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
        broadcastToRoom(ws.currentRoom, {
          type: 'userCount',
          count: rooms[ws.currentRoom].size,
        });
      }
      
      // 새 방에 입장
      ws.currentRoom = room || 'main';
      ws.nickname = nickname;
      ws.userId = userId;
      
      if (!rooms[ws.currentRoom]) {
        rooms[ws.currentRoom] = new Set();
      }
      rooms[ws.currentRoom].add(ws);
      
      // 입장 알림
      broadcastToRoom(ws.currentRoom, {
        type: 'system',
        text: `${nickname}님이 입장했습니다.`,
      });
      
      // 유저 수 업데이트
      broadcastToRoom(ws.currentRoom, {
        type: 'userCount',
        count: rooms[ws.currentRoom].size,
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

module.exports = {
  setupWebSocket,
  broadcastToClients,
  getClientsCount
};
