// WebSocket 채팅 서버 테스트 스크립트
const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:3006';
const TEST_ROOM = 'main';
const TEST_NICKNAME = 'TestUser';

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 테스트 카운터
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    testsPassed++;
    log(colors.green, `✅ PASS: ${testName}`);
    return true;
  } else {
    testsFailed++;
    log(colors.red, `❌ FAIL: ${testName}`);
    return false;
  }
}

// 테스트 1: WebSocket 연결
async function testConnection() {
  log(colors.cyan, '\n📡 테스트 1: WebSocket 연결');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    
    const timeout = setTimeout(() => {
      assert(false, '연결 타임아웃 (5초)');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      assert(true, 'WebSocket 연결 성공');
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      assert(false, `연결 실패: ${error.message}`);
      resolve(false);
    });
  });
}

// 테스트 2: 방 입장
async function testJoinRoom() {
  log(colors.cyan, '\n🚪 테스트 2: 방 입장');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let joinedReceived = false;
    let historyReceived = false;
    
    const timeout = setTimeout(() => {
      assert(false, '방 입장 응답 타임아웃 (5초)');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      log(colors.yellow, '연결 완료, 방 입장 요청 전송...');
      ws.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: TEST_NICKNAME
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(colors.blue, `수신: ${message.type}`);
        
        if (message.type === 'joined') {
          joinedReceived = true;
          assert(true, '방 입장 성공 응답 수신');
          assert(message.room === TEST_ROOM, `올바른 방 정보: ${message.room}`);
          assert(message.nickname === TEST_NICKNAME, `올바른 닉네임: ${message.nickname}`);
          assert(!!message.userId, `사용자 ID 발급: ${message.userId}`);
        }
        
        if (message.type === 'history') {
          historyReceived = true;
          assert(true, '메시지 히스토리 수신');
          assert(Array.isArray(message.messages), '히스토리가 배열 형태');
        }
        
        if (joinedReceived && historyReceived) {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch (error) {
        log(colors.red, `메시지 파싱 오류: ${error.message}`);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      assert(false, `연결 오류: ${error.message}`);
      resolve(false);
    });
  });
}

// 테스트 3: 메시지 전송 및 수신
async function testMessageSending() {
  log(colors.cyan, '\n💬 테스트 3: 메시지 전송 및 수신');
  
  return new Promise((resolve) => {
    const ws1 = new WebSocket(WS_URL);
    const ws2 = new WebSocket(WS_URL);
    
    let ws1Ready = false;
    let ws2Ready = false;
    let messageReceived = false;
    
    const testMessage = 'Hello, this is a test message!';
    
    const timeout = setTimeout(() => {
      assert(false, '메시지 테스트 타임아웃 (10초)');
      ws1.close();
      ws2.close();
      resolve(false);
    }, 10000);
    
    // 첫 번째 클라이언트 (발신자)
    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: 'Sender'
      }));
    });
    
    ws1.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined') {
        ws1Ready = true;
        log(colors.yellow, '발신자 준비 완료');
        
        if (ws2Ready) {
          // 메시지 전송
          setTimeout(() => {
            log(colors.yellow, '메시지 전송 중...');
            ws1.send(JSON.stringify({
              type: 'message',
              text: testMessage,
              nickname: 'Sender'
            }));
          }, 500);
        }
      }
    });
    
    // 두 번째 클라이언트 (수신자)
    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: 'Receiver'
      }));
    });
    
    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined') {
        ws2Ready = true;
        log(colors.yellow, '수신자 준비 완료');
        
        if (ws1Ready) {
          // 메시지 전송
          setTimeout(() => {
            log(colors.yellow, '메시지 전송 중...');
            ws1.send(JSON.stringify({
              type: 'message',
              text: testMessage,
              nickname: 'Sender'
            }));
          }, 500);
        }
      }
      
      if (message.type === 'message' && message.data) {
        if (message.data.text === testMessage) {
          messageReceived = true;
          assert(true, '메시지 수신 성공');
          assert(message.data.nickname === 'Sender', '올바른 발신자 정보');
          assert(!!message.data.timestamp, '타임스탬프 포함');
          
          clearTimeout(timeout);
          ws1.close();
          ws2.close();
          resolve(true);
        }
      }
    });
  });
}

// 테스트 4: 사용자 수 업데이트
async function testUserCount() {
  log(colors.cyan, '\n👥 테스트 4: 사용자 수 업데이트');
  
  return new Promise((resolve) => {
    const ws1 = new WebSocket(WS_URL);
    let ws1JoinedCount = 0;
    let ws2 = null;
    
    const timeout = setTimeout(() => {
      assert(false, '사용자 수 업데이트 타임아웃 (10초)');
      ws1.close();
      if (ws2) ws2.close();
      resolve(false);
    }, 10000);
    
    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: 'User1'
      }));
    });
    
    ws1.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'userCount') {
        log(colors.blue, `User1이 수신한 사용자 수: ${message.count}명`);
        
        if (message.count === 1 && ws1JoinedCount === 0) {
          ws1JoinedCount = 1;
          assert(true, '첫 번째 사용자 카운트 수신 (1명)');
          assert(typeof message.count === 'number', '사용자 수가 숫자');
          
          // 두 번째 사용자 생성 및 입장
          setTimeout(() => {
            ws2 = new WebSocket(WS_URL);
            
            ws2.on('open', () => {
              log(colors.yellow, 'User2 연결됨, 입장 중...');
              ws2.send(JSON.stringify({
                type: 'join',
                room: TEST_ROOM,
                nickname: 'User2'
              }));
            });
          }, 500);
        }
        
        if (message.count === 2) {
          assert(true, '두 번째 사용자 입장 후 첫 번째 사용자도 카운트 2 수신');
          clearTimeout(timeout);
          ws1.close();
          if (ws2) ws2.close();
          resolve(true);
        }
      }
    });
  });
}

// 테스트 5: 방 전환
async function testRoomSwitch() {
  log(colors.cyan, '\n🔄 테스트 5: 방 전환');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let firstRoomJoined = false;
    
    const timeout = setTimeout(() => {
      assert(false, '방 전환 타임아웃 (10초)');
      ws.close();
      resolve(false);
    }, 10000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: 'main',
        nickname: 'Switcher'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined' && message.room === 'main' && !firstRoomJoined) {
        firstRoomJoined = true;
        assert(true, '첫 번째 방(main) 입장 성공');
        
        // 다른 방으로 전환
        setTimeout(() => {
          log(colors.yellow, '방 전환 중... (sprint)');
          ws.send(JSON.stringify({
            type: 'join',
            room: 'sprint',
            nickname: 'Switcher'
          }));
        }, 1000);
      }
      
      if (message.type === 'joined' && message.room === 'sprint' && firstRoomJoined) {
        assert(true, '두 번째 방(sprint) 입장 성공');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    });
  });
}

// 테스트 6: 연결 종료 처리
async function testDisconnection() {
  log(colors.cyan, '\n🔌 테스트 6: 연결 종료 처리');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    
    const timeout = setTimeout(() => {
      assert(false, '연결 종료 테스트 타임아웃 (5초)');
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: TEST_ROOM,
        nickname: 'Disconnector'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined') {
        // 연결 종료
        setTimeout(() => {
          log(colors.yellow, '연결 종료 중...');
          ws.close();
        }, 500);
      }
    });
    
    ws.on('close', () => {
      assert(true, '연결이 정상적으로 종료됨');
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

// 모든 테스트 실행
async function runAllTests() {
  log(colors.cyan, '═══════════════════════════════════════════');
  log(colors.cyan, '🧪 애슬리트 타임 채팅 서버 테스트 시작');
  log(colors.cyan, '═══════════════════════════════════════════');
  
  try {
    await testConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testJoinRoom();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMessageSending();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testUserCount();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testRoomSwitch();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testDisconnection();
    
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
    log(colors.green, '\n🎉 모든 테스트 통과!');
  } else {
    log(colors.yellow, '\n⚠️ 일부 테스트 실패. 로그를 확인하세요.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// 테스트 실행
runAllTests();
