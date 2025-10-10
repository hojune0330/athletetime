const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3004');

ws.on('open', function open() {
  console.log('Connected to chat server');
  
  // Join main room
  ws.send(JSON.stringify({
    type: 'join',
    data: {
      room: 'main',
      nickname: '복원테스트',
      avatar: '🔄',
      userId: 'restore_test_' + Date.now()
    }
  }));
  
  setTimeout(() => {
    console.log('Closing connection after checking messages.');
    ws.close();
  }, 2000);
});

ws.on('message', function message(data) {
  const msg = JSON.parse(data);
  if (msg.type === 'room_joined') {
    console.log(`\n✅ 채팅방에 입장했습니다.`);
    console.log(`📂 복원된 메시지 수: ${msg.data.messages.length}개\n`);
    console.log('=== 이전 메시지 목록 ===');
    msg.data.messages.forEach((m, i) => {
      const time = new Date(m.timestamp).toLocaleTimeString('ko-KR');
      console.log(`${i + 1}. [${time}] ${m.nickname}: ${m.text}`);
    });
    console.log('========================\n');
  }
});

ws.on('error', (error) => {
  console.error('Error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from server');
  process.exit(0);
});