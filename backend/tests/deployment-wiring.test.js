const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('DEPLOY-WS-001: chat upgrades are denied until the service has moderation controls', () => {
  const server = readSource('src/server.js');

  assert.match(server, /rejectPreparingWebSocket\(socket\)/);
  assert.doesNotMatch(server, /chatWss\.handleUpgrade\(/);
  assert.doesNotMatch(server, /setupWebSocket\(chatWss\)/);
});

test('DEPLOY-WS-002: card-studio websocket keeps its scoped no-server attachment', () => {
  const wsManager = readSource('card-studio/websocket/wsManager.js');

  assert.doesNotMatch(wsManager, /WebSocket\.Server\(\{ server, path/);
  assert.match(wsManager, /noServer: true/);
  assert.match(wsManager, /!== '\/ws'/);
});

test('DEPLOY-WS-003: chat nickname API returns the same prepared state as the websocket route', () => {
  const server = readSource('src/server.js');

  assert.match(server, /app\.get\('\/api\/chat\/check-nickname', rejectPreparingFeature\)/);
});

test('DEPLOY-WS-004: the chat page does not initiate a websocket connection before launch', () => {
  const page = readSource('frontend/src/pages/ChatPage/index.tsx');

  assert.match(page, /FeaturePreparingPage/);
  assert.doesNotMatch(page, /useChat/);
  assert.doesNotMatch(page, /useWebSocket/);
});

test('DEPLOY-NETLIFY-001: Netlify uses the checked frontend build and no retired chat websocket endpoint', () => {
  const toml = readSource('netlify.toml');

  assert.match(toml, /publish = "community"/);
  assert.match(toml, /cd frontend && npm ci && npm run build:check/);
  assert.doesNotMatch(toml, /VITE_WS_URL/);
  assert.doesNotMatch(toml, /\/ws\/chat/);
  assert.match(toml, /\/api\/\*/);
});

test('DEPLOY-HTTP-001: production CORS never reflects arbitrary origins with credentialed cookies', () => {
  const server = readSource('src/server.js');

  assert.match(server, /FRONTEND_ORIGINS/);
  assert.match(server, /const originAllowed = typeof origin === 'string'/);
  assert.match(server, /if \(origin && !originAllowed\) return res\.sendStatus\(403\)/);
  assert.doesNotMatch(server, /Access-Control-Allow-Origin', origin \|\| '\*'/);
});

test('DEPLOY-HTTP-002: production does not serve the obsolete dashboard or its localStorage admin page', () => {
  const server = readSource('src/server.js');

  assert.match(server, /if \(NODE_ENV !== 'production'\) \{\s*app\.use\('\/legacy-dashboard'/);
  assert.match(server, /if \(NODE_ENV === 'production'\) return res\.sendStatus\(404\)/);
  assert.match(server, /res\.status\(503\)\.send\('서비스 화면을 준비하지 못했습니다\.'/);
});

test('DEPLOY-RUNBOOK-001: data-rights readiness uses the direct backend URL required by the CLI', () => {
  const runbook = readSource('docs/athletetime-deployment-target.md');

  assert.match(runbook, /npm run data:rights:readiness -- --base-url https:\/\/athletetime-backend\.onrender\.com/);
});

test('DEPLOY-RUNTIME-001: a direct chat handshake receives a 503 response', async () => {
  const WebSocket = require(path.join(ROOT, 'node_modules', 'ws'));
  const { rejectPreparingWebSocket } = require(path.join(ROOT, 'backend/middleware/launchFeatureGate'));
  const server = http.createServer((_req, res) => res.end('ok'));

  server.on('upgrade', (_req, socket) => rejectPreparingWebSocket(socket));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    await new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/chat`);
      const timer = setTimeout(() => reject(new Error('chat handshake timeout')), 3000);
      client.on('unexpected-response', (_request, response) => {
        clearTimeout(timer);
        assert.equal(response.statusCode, 503);
        response.resume();
        resolve();
      });
      client.on('error', reject);
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
