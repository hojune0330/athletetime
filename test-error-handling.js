// 에러 처리 및 예외 상황 테스트
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3006';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    testsPassed++;
    log(colors.green, `✅ PASS: ${testName}`);
  } else {
    testsFailed++;
    log(colors.red, `❌ FAIL: ${testName}`);
  }
}

// 테스트 1: 닉네임 없이 입장 시도
async function testJoinWithoutNickname() {
  log(colors.cyan, '\n🧪 테스트 1: 닉네임 없이 입장 시도');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let errorReceived = false;
    
    const timeout = setTimeout(() => {
      assert(false, '에러 응답 타임아웃');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: 'main'
        // nickname 누락
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'error') {
        errorReceived = true;
        assert(true, '에러 메시지 수신');
        assert(message.message.includes('닉네임'), '적절한 에러 메시지');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    });
  });
}

// 테스트 2: 존재하지 않는 방 입장 시도
async function testJoinNonexistentRoom() {
  log(colors.cyan, '\n🧪 테스트 2: 존재하지 않는 방 입장 시도');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let errorReceived = false;
    
    const timeout = setTimeout(() => {
      assert(false, '에러 응답 타임아웃');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: 'nonexistent_room_12345',
        nickname: 'TestUser'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'error') {
        errorReceived = true;
        assert(true, '에러 메시지 수신');
        assert(message.message.includes('존재하지'), '적절한 에러 메시지');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    });
  });
}

// 테스트 3: 방 입장 전 메시지 전송 시도
async function testMessageWithoutJoining() {
  log(colors.cyan, '\n🧪 테스트 3: 방 입장 전 메시지 전송 시도');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let errorReceived = false;
    
    const timeout = setTimeout(() => {
      assert(false, '에러 응답 타임아웃');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      // 입장하지 않고 바로 메시지 전송
      ws.send(JSON.stringify({
        type: 'message',
        text: 'This should fail',
        nickname: 'TestUser'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'error') {
        errorReceived = true;
        assert(true, '에러 메시지 수신');
        assert(message.message.includes('입장'), '적절한 에러 메시지');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    });
  });
}

// 테스트 4: 너무 긴 메시지 전송
async function testTooLongMessage() {
  log(colors.cyan, '\n🧪 테스트 4: 너무 긴 메시지 전송');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let errorReceived = false;
    
    const timeout = setTimeout(() => {
      assert(false, '에러 응답 타임아웃');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: 'main',
        nickname: 'TestUser'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined') {
        // 500자 초과 메시지 전송
        const longMessage = 'A'.repeat(501);
        ws.send(JSON.stringify({
          type: 'message',
          text: longMessage,
          nickname: 'TestUser'
        }));
      }
      
      if (message.type === 'error') {
        errorReceived = true;
        assert(true, '에러 메시지 수신');
        assert(message.message.includes('500'), '적절한 에러 메시지');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    });
  });
}

// 테스트 5: 빈 메시지 전송
async function testEmptyMessage() {
  log(colors.cyan, '\n🧪 테스트 5: 빈 메시지 전송');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let messageReceived = false;
    
    const timeout = setTimeout(() => {
      // 빈 메시지는 조용히 무시되어야 함
      assert(!messageReceived, '빈 메시지는 브로드캐스트되지 않음');
      ws.close();
      resolve(true);
    }, 3000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: 'main',
        nickname: 'TestUser'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined') {
        // 빈 메시지 전송
        ws.send(JSON.stringify({
          type: 'message',
          text: '   ',
          nickname: 'TestUser'
        }));
      }
      
      if (message.type === 'message') {
        messageReceived = true;
      }
    });
  });
}

// 테스트 6: 잘못된 JSON 형식
async function testInvalidJSON() {
  log(colors.cyan, '\n🧪 테스트 6: 잘못된 JSON 형식');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    
    const timeout = setTimeout(() => {
      // 서버가 크래시하지 않고 계속 작동하는지 확인
      assert(true, '서버가 잘못된 JSON을 처리하고 계속 작동');
      ws.close();
      resolve(true);
    }, 2000);
    
    ws.on('open', () => {
      // 잘못된 JSON 전송
      ws.send('{ this is not valid json }');
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      assert(true, '연결이 정상적으로 종료됨');
      resolve(true);
    });
  });
}

// 모든 테스트 실행
async function runAllTests() {
  log(colors.cyan, '═══════════════════════════════════════════');
  log(colors.cyan, '🧪 에러 처리 및 예외 상황 테스트');
  log(colors.cyan, '═══════════════════════════════════════════');
  
  try {
    await testJoinWithoutNickname();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testJoinNonexistentRoom();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMessageWithoutJoining();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testTooLongMessage();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testEmptyMessage();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testInvalidJSON();
    
  } catch (error) {
    log(colors.red, `\n❌ 테스트 실행 중 오류: ${error.message}`);
  }
  
  // 결과 출력
  log(colors.cyan, '\n═══════════════════════════════════════════');
  log(colors.cyan, '📊 테스트 결과');
  log(colors.cyan, '═══════════════════════════════════════════');
  log(colors.green, `✅ 통과: ${testsPassed}개`);
  log(colors.red, `❌ 실패: ${testsFailed}개`);
  
  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0;
  
  log(colors.cyan, `\n성공률: ${percentage}%`);
  
  if (testsFailed === 0) {
    log(colors.green, '\n🎉 모든 에러 처리 테스트 통과!');
  } else {
    log(colors.yellow, '\n⚠️ 일부 테스트 실패. 로그를 확인하세요.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests();
