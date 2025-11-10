const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 정적 파일 제공
app.use(express.static('.'));

// 메모리에 저장할 데이터
const clients = new Map(); // 연결된 클라이언트
const messages = []; // 최근 메시지 (최대 100개)
const MAX_MESSAGES = 100;

// 사용자 정보 생성
function createUser(id) {
  const adjectives = ['빠른', '강한', '민첩한', '파워', '열정'];
  const nouns = ['러너', '스프린터', '선수', '챔피언', '마라토너'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  
  return {
    id: id,
    username: `${adj}${noun}${num}`,
    joinedAt: new Date(),
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };
}

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const user = createUser(clientId);
  
  // 클라이언트 저장
  clients.set(clientId, { ws, user });
  
  console.log(`새 클라이언트 연결: ${user.username} (총 ${clients.size}명)`);
  
  // 연결 확인 메시지
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      user: user,
      userCount: clients.size,
      recentMessages: messages.slice(-50) // 최근 50개 메시지 전송
    }
  }));
  
  // 다른 사용자들에게 입장 알림
  broadcast({
    type: 'userJoined',
    data: {
      username: user.username,
      userCount: clients.size,
      message: `${user.username}님이 입장했습니다.`
    }
  }, clientId);
  
  // 메시지 수신 처리
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'message':
          handleMessage(clientId, data.data);
          break;
        case 'typing':
          handleTyping(clientId, data.data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
    }
  });
  
  // 연결 종료 처리
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client) {
      console.log(`클라이언트 연결 종료: ${client.user.username}`);
      clients.delete(clientId);
      
      // 다른 사용자들에게 퇴장 알림
      broadcast({
        type: 'userLeft',
        data: {
          username: client.user.username,
          userCount: clients.size,
          message: `${client.user.username}님이 퇴장했습니다.`
        }
      });
    }
  });
  
  // 에러 처리
  ws.on('error', (error) => {
    console.error('WebSocket 에러:', error);
  });
  
  // 핑-퐁으로 연결 유지
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

// 메시지 처리
function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const message = {
    id: Date.now().toString(),
    userId: client.user.id,
    username: client.user.username,
    text: data.text,
    timestamp: new Date().toISOString(),
    color: client.user.color
  };
  
  // 메시지 저장
  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    messages.shift();
  }
  
  // 모든 클라이언트에게 전송
  broadcast({
    type: 'message',
    data: message
  });
  
  console.log(`메시지: [${client.user.username}] ${data.text}`);
}

// 타이핑 상태 처리
function handleTyping(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  broadcast({
    type: 'typing',
    data: {
      userId: client.user.id,
      username: client.user.username,
      isTyping: data.isTyping
    }
  }, clientId);
}

// 브로드캐스트
function broadcast(message, excludeClientId = null) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// 서버 상태 확인 API
app.get('/api/chat/status', (req, res) => {
  res.json({
    status: 'online',
    userCount: clients.size,
    messageCount: messages.length,
    uptime: process.uptime()
  });
});

// 포트 설정
const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`채팅 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`http://localhost:${PORT}`);
});