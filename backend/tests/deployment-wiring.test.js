/**
 * 배포 배선 계약 테스트
 *
 * athletetime 프로덕션 이관(PR #9)을 위한 배포 필수 배선을 잠근다:
 *  1. 채팅 WebSocket이 통합 서버(src/server.js)에 배선되어 있는가 (/ws/chat)
 *  2. /api/chat/check-nickname 라우트가 존재하는가 (레거시 계약)
 *  3. 카드 스튜디오 WSS(/ws)와 채팅 WSS(/ws/chat)가 경로 충돌 없이 공존하는가
 *     (ws 라이브러리는 { server, path } 방식으로 WSS 2개를 붙이면 서로의
 *      업그레이드를 400으로 파괴한다 → noServer + 수동 upgrade 라우팅 필수)
 *  4. 프론트 채팅 훅이 같은 origin /ws/chat 기본값 + VITE_WS_URL 오버라이드를 갖는가
 *  5. netlify.toml이 신규 빌드 레이아웃(community publish)과 일치하는가
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('DEPLOY-WS-001: src/server.js wires chat WebSocket via noServer upgrade routing at /ws/chat', () => {
  const server = readSource('src/server.js');
  assert.ok(server.includes("require(path.join(ROOT, 'backend/utils/websocket'))"), 'chat websocket util must be required');
  assert.ok(server.includes('setupWebSocket(chatWss)'), 'setupWebSocket must be called with the chat WSS');
  assert.ok(server.includes("'/ws/chat'"), 'chat WSS must be scoped to /ws/chat');
  assert.ok(server.includes('noServer: true'), 'chat WSS must use noServer mode to avoid upgrade collisions');
});

test('DEPLOY-WS-002: card-studio wsManager must NOT use { server, path } (destroys other WSS upgrades)', () => {
  const wsManager = readSource('card-studio/websocket/wsManager.js');
  assert.ok(!wsManager.includes('WebSocket.Server({ server, path'), 'wsManager must not bind upgrade globally with path option');
  assert.ok(wsManager.includes('noServer: true'), 'wsManager must use noServer mode');
  assert.ok(wsManager.includes("!== '/ws'"), 'wsManager must pass through non-/ws upgrades');
});

test('DEPLOY-WS-003: /api/chat/check-nickname route exists with legacy contract (2-10 chars)', () => {
  const server = readSource('src/server.js');
  assert.ok(server.includes("app.get('/api/chat/check-nickname'"), 'check-nickname route must exist');
  assert.ok(server.includes('nickname.length < 2 || nickname.length > 10'), 'legacy 2-10 char validation must be preserved');
});

test('DEPLOY-WS-004: chat rooms preserved (main/training/race/injury) in backend/utils/websocket.js', () => {
  const wsUtil = readSource('backend/utils/websocket.js');
  for (const room of ['main', 'training', 'race', 'injury']) {
    assert.ok(new RegExp(`${room}: new Set\\(\\)`).test(wsUtil), `room "${room}" must exist`);
  }
});

test('DEPLOY-WS-005: frontend chat hook defaults to same-origin /ws/chat with VITE_WS_URL override', () => {
  const hook = readSource('frontend/src/pages/ChatPage/hooks/useWebSocket.ts');
  assert.ok(hook.includes('import.meta.env.VITE_WS_URL'), 'VITE_WS_URL override must be honored');
  assert.ok(hook.includes('/ws/chat'), 'default must target /ws/chat path');
  assert.ok(hook.includes('window.location.host'), 'default must be same-origin');
});

test('DEPLOY-NETLIFY-001: netlify.toml matches new build layout (publish=community, frontend build)', () => {
  const toml = readSource('netlify.toml');
  assert.ok(toml.includes('publish = "community"'), 'publish must be community (vite outDir ../community)');
  assert.ok(toml.includes('cd frontend && npm ci && npm run build'), 'build must run inside frontend/');
  assert.ok(!toml.includes('base = "frontend"'), 'legacy base=frontend layout must not be used (breaks publish path)');
  assert.ok(toml.includes('/api/*'), 'API proxy redirect must exist');
  assert.ok(toml.includes('VITE_WS_URL'), 'WS URL must be injected at build time (Netlify cannot proxy WebSocket)');
  assert.ok(toml.includes('wss://athletetime-backend.onrender.com/ws/chat'), 'WS must point at Render /ws/chat');
});

test('DEPLOY-RUNTIME-001: two path-scoped WSS coexist on one HTTP server (handshake integration)', async () => {
  const http = require('node:http');
  const WebSocket = require(path.join(ROOT, 'node_modules', 'ws'));

  const httpServer = http.createServer((req, res) => res.end('ok'));
  const wssA = new WebSocket.Server({ noServer: true });
  const wssB = new WebSocket.Server({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws') {
      wssA.handleUpgrade(req, socket, head, (ws) => wssA.emit('connection', ws, req));
    } else if (pathname === '/ws/chat') {
      wssB.handleUpgrade(req, socket, head, (ws) => wssB.emit('connection', ws, req));
    } else {
      socket.destroy();
    }
  });
  wssA.on('connection', (ws) => ws.send('A'));
  wssB.on('connection', (ws) => ws.send('B'));

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  const connectAndRead = (p) =>
    new Promise((resolve, reject) => {
      const c = new WebSocket(`ws://127.0.0.1:${port}${p}`);
      const timer = setTimeout(() => reject(new Error(`${p} timeout`)), 3000);
      c.on('message', (m) => {
        clearTimeout(timer);
        c.close();
        resolve(m.toString());
      });
      c.on('error', (e) => {
        clearTimeout(timer);
        reject(new Error(`${p} handshake failed: ${e.message}`));
      });
    });

  try {
    const [a, b] = await Promise.all([connectAndRead('/ws'), connectAndRead('/ws/chat')]);
    assert.equal(a, 'A');
    assert.equal(b, 'B');
  } finally {
    wssA.close();
    wssB.close();
    httpServer.close();
  }
});
