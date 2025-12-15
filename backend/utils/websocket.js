/**
 * WebSocket 유틸리티 (v4.0.0)
 * 
 * 실시간 알림 브로드캐스트
 */

let wss = null;

/**
 * WebSocket 서버 설정
 * 
 * @param {WebSocket.Server} websocketServer - WebSocket 서버 인스턴스
 */
function setupWebSocket(websocketServer) {
  wss = websocketServer;
  
  wss.on('connection', (ws) => {
    console.log('✅ WebSocket 클라이언트 연결');
    
    ws.on('close', () => {
      console.log('❌ WebSocket 클라이언트 연결 해제');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket 에러:', error);
    });
  });
  
  console.log('🔌 WebSocket 서버 설정 완료');
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
