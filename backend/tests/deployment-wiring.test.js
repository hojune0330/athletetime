const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('DEPLOY-WS-001: chat upgrades are served by the dedicated /ws/chat websocket', () => {
  const server = readSource('src/server.js');

  assert.match(server, /chatWss\.handleUpgrade\(/);
  assert.match(server, /setupWebSocket\(chatWss\)/);
  // 준비 모드 폴백(rejectPreparingWebSocket)은 활성 핸들러보다 뒤(실패 시에만)에 위치해야 한다
  assert.ok(server.indexOf('rejectPreparingWebSocket(socket)') > server.indexOf('chatWss.handleUpgrade('));
});

test('DEPLOY-WS-002: card-studio websocket keeps its scoped no-server attachment', () => {
  const wsManager = readSource('card-studio/websocket/wsManager.js');

  assert.doesNotMatch(wsManager, /WebSocket\.Server\(\{ server, path/);
  assert.match(wsManager, /noServer: true/);
  assert.match(wsManager, /!== '\/ws'/);
});

test('DEPLOY-WS-003: chat nickname API is served by the live chat router', () => {
  const server = readSource('src/server.js');

  assert.doesNotMatch(server, /app\.get\('\/api\/chat\/check-nickname', rejectPreparingFeature\)/);
  assert.match(server, /app\.use\('\/api\/chat', chatRouter\)/);
});

test('DEPLOY-WS-004: the chat page wires the live websocket chat', () => {
  const page = readSource('frontend/src/pages/ChatPage/index.tsx');

  assert.doesNotMatch(page, /FeaturePreparingPage/);
  assert.match(page, /useChat\(\)/);
  assert.match(page, /MessageList/);
});

test('DEPLOY-NETLIFY-001: Netlify uses the checked frontend build and no retired chat websocket endpoint', () => {
  const toml = readSource('netlify.toml');

  assert.match(toml, /publish = "community"/);
  assert.match(toml, /cd frontend && npm ci && npm run build:check/);
  assert.match(toml, /VITE_WS_URL\s*=\s*"wss:\/\/athletetime-backend\.onrender\.com\/ws\/chat"/);
  assert.match(toml, /\/api\/\*/);
});

test('DEPLOY-NETLIFY-002: production CSP permits the Render websocket origin', () => {
  const toml = readSource('netlify.toml');

  assert.match(
    toml,
    /connect-src[^;]*wss:\/\/athletetime-backend\.onrender\.com/,
  );
});

test('DEPLOY-CI-001: every pull request runs the full repository verification gate', () => {
  const workflow = readSource('.github/workflows/data-rights-postgres.yml');
  const pullRequestBlock = workflow.split('workflow_dispatch:')[0];

  assert.match(pullRequestBlock, /pull_request:\s*\n/);
  assert.doesNotMatch(pullRequestBlock, /\n\s+paths:/);
  assert.match(workflow, /- run: npm run test:data-rights/);
  assert.match(workflow, /- run: npm run verify/);
  assert.doesNotMatch(workflow, /- run: npm test\s*$/m);
  assert.doesNotMatch(workflow, /- run: npm run build:check --prefix frontend/);
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

test('DEPLOY-RUNTIME-001: a direct /ws/chat handshake upgrades to 101', async () => {
  const { spawn } = require('node:child_process');
  const WebSocket = require(path.join(ROOT, 'node_modules', 'ws'));

  const port = 5800 + Math.floor(Math.random() * 100);
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'deployment-wiring-test-secret',
      AUTH_CODE_PEPPER: 'deployment-wiring-test-pepper',
      RESEND_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (c) => { logs += c; });
  child.stderr.on('data', (c) => { logs += c; });

  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET' }, (res) => {
            res.resume();
            resolve(res.statusCode);
          });
          req.on('error', reject);
          req.end();
        });
        if (response && response < 500) break;
      } catch {
        // 아직 안 뜸 — 재시도
      }
      await new Promise((r) => setTimeout(r, 200));
      if (child.exitCode !== null) throw new Error(`server exited early: ${logs}`);
    }

    const { client } = await new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://127.0.0.1:${port}/ws/chat`);
      const timer = setTimeout(() => reject(new Error('chat handshake timeout')), 5000);
      client.on('open', () => {
        clearTimeout(timer);
        resolve({ client });
      });
      client.on('unexpected-response', (_request, response) => {
        clearTimeout(timer);
        reject(new Error(`expected 101 got ${response.statusCode}`));
      });
      client.on('error', reject);
    });
    assert.ok(true);
    // 웹소켓 클라이언트를 닫아 서버가 keep-alive 홀드하지 않게 하고,
    // 프로세스가 남는 것을 방지한다.
    client.terminate();
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGKILL');
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
  }
});
