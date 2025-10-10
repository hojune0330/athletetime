const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3004');

ws.on('open', function open() {
  console.log('Connected to chat server');
  
  // Join main room
  ws.send(JSON.stringify({
    type: 'join',
    data: {
      room: 'main',
      nickname: '테스트유저',
      avatar: '🧪',
      userId: 'test_user_' + Date.now()
    }
  }));
  
  // Send test messages
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'message',
      data: {
        text: '안녕하세요! 메시지 영구 보존 테스트입니다.',
        nickname: '테스트유저',
        avatar: '🧪'
      }
    }));
  }, 1000);
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'message',
      data: {
        text: '이 메시지는 서버가 재시작되어도 사라지지 않습니다.',
        nickname: '테스트유저',
        avatar: '🧪'
      }
    }));
  }, 2000);
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'message',
      data: {
        text: '채팅방에 다시 들어와도 이전 메시지가 모두 보입니다! 👍',
        nickname: '테스트유저',
        avatar: '🧪'
      }
    }));
  }, 3000);
  
  setTimeout(() => {
    console.log('Test messages sent. Closing connection.');
    ws.close();
  }, 4000);
});

ws.on('message', function message(data) {
  const msg = JSON.parse(data);
  if (msg.type === 'message') {
    console.log(`📨 Message: ${msg.data.nickname}: ${msg.data.text}`);
  } else if (msg.type === 'room_joined') {
    console.log(`✅ Joined room with ${msg.data.messages.length} existing messages`);
  }
});

ws.on('error', (error) => {
  console.error('Error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from server');
  process.exit(0);
});