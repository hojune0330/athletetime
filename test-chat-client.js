const WebSocket = require('ws');

// 테스트용 WebSocket 클라이언트
class TestChatClient {
  constructor(name, wsUrl) {
    this.name = name;
    this.wsUrl = wsUrl;
    this.ws = null;
    this.userId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  connect() {
    console.log(`[${this.name}] 연결 시도: ${this.wsUrl}`);
    
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => {
      console.log(`[${this.name}] ✅ 연결 성공`);
      
      // 메인 채팅방 입장
      setTimeout(() => {
        this.joinRoom('main');
      }, 500);
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      switch(message.type) {
        case 'connected':
          console.log(`[${this.name}] 서버 정보:`, {
            rooms: message.data.rooms.length + '개',
            stats: message.data.stats
          });
          break;
        
        case 'room_joined':
          console.log(`[${this.name}] 방 입장 성공:`, message.data.room);
          // 테스트 메시지 전송
          setTimeout(() => {
            this.sendMessage(`안녕하세요! ${this.name}입니다.`);
          }, 1000);
          break;
        
        case 'message':
          if (message.data.userId !== this.userId) {
            console.log(`[${this.name}] 메시지 수신:`, 
              `${message.data.nickname}: ${message.data.text}`);
          }
          break;
        
        case 'user_joined':
          console.log(`[${this.name}] 사용자 입장:`, message.data.nickname);
          break;
        
        case 'user_left':
          console.log(`[${this.name}] 사용자 퇴장:`, message.data.nickname);
          break;
      }
    });

    this.ws.on('close', () => {
      console.log(`[${this.name}] ❌ 연결 종료`);
    });

    this.ws.on('error', (error) => {
      console.error(`[${this.name}] 오류:`, error.message);
    });
  }

  joinRoom(roomId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[${this.name}] 방 입장 요청:`, roomId);
      this.ws.send(JSON.stringify({
        type: 'join',
        data: {
          room: roomId,
          nickname: this.name,
          userId: this.userId
        }
      }));
    }
  }

  sendMessage(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[${this.name}] 메시지 전송:`, text);
      this.ws.send(JSON.stringify({
        type: 'message',
        data: {
          text,
          nickname: this.name,
          avatar: this.name[0],
          room: 'main',
          userId: this.userId
        }
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 테스트 실행
console.log('=== 채팅 서버 외부 클라이언트 시뮬레이션 테스트 ===\n');

// Sandbox 환경에서 테스트
const wsUrl = 'ws://localhost:3004';
console.log('테스트 서버:', wsUrl);

// 두 명의 사용자 시뮬레이션
const client1 = new TestChatClient('테스터1', wsUrl);
const client2 = new TestChatClient('테스터2', wsUrl);

// 클라이언트 1 연결
client1.connect();

// 2초 후 클라이언트 2 연결
setTimeout(() => {
  client2.connect();
}, 2000);

// 5초 후 클라이언트 2가 추가 메시지 전송
setTimeout(() => {
  client2.sendMessage('채팅 테스트 중입니다!');
}, 5000);

// 8초 후 클라이언트 1이 메시지 전송
setTimeout(() => {
  client1.sendMessage('네, 잘 작동하네요!');
}, 8000);

// 12초 후 테스트 종료
setTimeout(() => {
  console.log('\n=== 테스트 종료 ===');
  client1.disconnect();
  client2.disconnect();
  process.exit(0);
}, 12000);