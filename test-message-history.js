// 메시지 히스토리 테스트
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3006';
const TEST_ROOM = 'main';

async function testMessageHistory() {
  console.log('🧪 메시지 히스토리 테스트 시작\n');
  
  // 1. 메시지 전송
  console.log('1️⃣ 테스트 메시지 전송 중...');
  const testMessages = [
    'History Test Message 1',
    'History Test Message 2',
    'History Test Message 3'
  ];
  
  const ws1 = new WebSocket(WS_URL);
  
  await new Promise((resolve) => {
    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: 'HistoryTester'
      }));
    });
    
    ws1.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined') {
        console.log('✅ 방 입장 성공');
        
        // 메시지 전송
        for (const msg of testMessages) {
          await new Promise(r => setTimeout(r, 200));
          ws1.send(JSON.stringify({
            type: 'message',
            text: msg,
            nickname: 'HistoryTester'
          }));
          console.log(`   📤 전송: ${msg}`);
        }
        
        setTimeout(() => {
          ws1.close();
          resolve();
        }, 1000);
      }
    });
  });
  
  console.log('✅ 메시지 전송 완료\n');
  
  // 2. 서버 재시작 없이 새 연결로 히스토리 확인
  console.log('2️⃣ 히스토리 로드 테스트...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const ws2 = new WebSocket(WS_URL);
  let historyMessages = [];
  
  await new Promise((resolve) => {
    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: 'HistoryReader'
      }));
    });
    
    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'history') {
        historyMessages = message.messages;
        console.log(`✅ 히스토리 수신: ${historyMessages.length}개 메시지`);
        
        // 테스트 메시지 확인
        const foundMessages = historyMessages.filter(msg => 
          testMessages.includes(msg.message)
        );
        
        console.log(`   📥 테스트 메시지 발견: ${foundMessages.length}/${testMessages.length}개`);
        
        foundMessages.forEach(msg => {
          console.log(`   - ${msg.nickname}: ${msg.message}`);
        });
        
        if (foundMessages.length === testMessages.length) {
          console.log('✅ 모든 테스트 메시지가 히스토리에 포함됨');
        } else {
          console.log('⚠️ 일부 메시지가 히스토리에 없음');
        }
        
        ws2.close();
        resolve();
      }
    });
  });
  
  console.log('\n🎉 메시지 히스토리 테스트 완료!');
  process.exit(0);
}

testMessageHistory().catch(err => {
  console.error('❌ 테스트 실패:', err);
  process.exit(1);
});
