/**
 * WebSocket 매니저
 *
 * 실시간 이벤트를 대시보드 클라이언트에 전달합니다.
 *
 * 메시지 형식:
 *   { type: 'log' | 'newResult' | 'statusChange' | 'pipelineLog' | 'pipelineStatus', payload: {...} }
 */

const WebSocket = require('ws');

class WSManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  /**
   * HTTP 서버에 WebSocket 서버를 연결합니다.
   * @param {http.Server} server
   */
  attach(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`🔌 WebSocket 클라이언트 연결 (총: ${this.clients.size})`);

      // 연결 확인 메시지
      ws.send(JSON.stringify({
        type: 'connected',
        payload: {
          message: '대시보드 WebSocket 연결 성공',
          timestamp: new Date().toISOString(),
          clients: this.clients.size,
        },
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`🔌 WebSocket 클라이언트 해제 (총: ${this.clients.size})`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket 오류: ${error.message}`);
        this.clients.delete(ws);
      });
    });

    console.log('🔌 WebSocket 서버 초기화 완료 (경로: /ws)');
  }

  /**
   * 모든 연결된 클라이언트에 메시지를 브로드캐스트합니다.
   *
   * @param {string} type - 메시지 타입
   * @param {Object} payload - 전달할 데이터
   */
  broadcast(type, payload) {
    if (!this.wss) return;

    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error(`WebSocket 전송 실패: ${error.message}`);
          this.clients.delete(client);
        }
      }
    }
  }

  /**
   * 연결된 클라이언트 수
   */
  getClientCount() {
    return this.clients.size;
  }
}

module.exports = new WSManager();
