const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const {
  expectVisible,
  navigateToReady,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');

const ROOT = path.resolve(__dirname, '../..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function request(port, method, requestPath, body, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const payload = body ?? '';
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers: {
        ...(payload ? { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let bodyJson = null;
        try {
          bodyJson = raw ? JSON.parse(raw) : null;
        } catch {
        }
        resolve({ status: res.statusCode, headers: res.headers, body: bodyJson, raw });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

function websocketHandshake(port) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/ws/chat',
      method: 'GET',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      },
    });
    req.on('response', (res) => {
      res.resume();
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on('upgrade', (_res, socket) => {
      socket.destroy();
      reject(new Error('The public chat websocket must not upgrade while it is preparing.'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer(port, processRef) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await request(port, 'GET', '/health');
      if (response.status) return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`launch-gate audit server did not start: ${processRef.logs.join('')}`);
}

function startAuditServer(t) {
  const port = 5700 + Math.floor(Math.random() * 300);
  const processRef = { logs: [] };
  processRef.child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'launch-interaction-safety-test-secret',
      AUTH_CODE_PEPPER: 'launch-interaction-safety-test-pepper',
      RESEND_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [processRef.child.stdout, processRef.child.stderr]) {
    stream.on('data', (chunk) => processRef.logs.push(chunk.toString('utf8')));
  }
  t.after(async () => {
    if (processRef.child.exitCode !== null) return;
    processRef.child.kill('SIGINT');
    await new Promise((resolve) => {
      processRef.child.once('exit', resolve);
      setTimeout(resolve, 3000);
    });
  });
  return { port, processRef };
}

test('Given launch preparation mode When interaction routes are mounted Then server-side read-only gates run before route handlers', () => {
  const source = readSource('src/server.js');

  for (const route of [
    '/api/competitions',
    '/api/match-results',
  ]) {
    assert.match(source, new RegExp(`app\\.use\\('${route.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}', requireReadOnlyLaunchFeature\\(`));
  }
  assert.match(source, /app\.use\('\/api\/marketplace', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/posts', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/categories', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/trending', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/reactions', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/flash-polls', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/feed\/shortform', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/upload', rejectPreparingFeature\);/);
  assert.ok(source.indexOf('app.use(rejectUnavailableInteractionWrite)') < source.indexOf('app.use(requireCsrfForCookieAuth)'), 'write gate must run before CSRF');
  assert.ok(source.indexOf('app.use(rejectUnavailableInteractionWrite)') < source.indexOf('app.use(express.json'), 'write gate must run before parsing');
});

test('Given unavailable interaction surfaces When direct normal or malformed writes arrive Then the server rejects them before parsing or authentication', async (t) => {
  const { port, processRef } = startAuditServer(t);
  await waitForServer(port, processRef);

  const expected = { success: false, error: '이 기능은 준비 중이에요.' };
  const writes = [
    ['/api/posts', '{"title":"direct write","content":"must not persist"}', 'application/json'],
    ['/api/marketplace', '{"title":"direct listing","price":1000}', 'application/json'],
    ['/api/upload/image', '--audit-boundary\r\ncontent-disposition: form-data; name="image"\r\n\r\nbytes\r\n--audit-boundary--', 'multipart/form-data; boundary=audit-boundary'],
    ['/api/chat/reports', '{"messageId":"1","reasonCode":"기타"}', 'application/json'],
  ];

  for (const [requestPath, payload, contentType] of writes) {
    const response = await request(port, 'POST', requestPath, payload, contentType);
    assert.equal(response.status, 503, `${requestPath} must fail closed`);
    assert.match(response.headers['cache-control'] || '', /no-store/);
    assert.deepEqual(response.body, expected);
  }

  for (const requestPath of ['/api/posts', '/api/POSTS', '/api/%70osts', '/api/marketplace']) {
    const response = await request(port, 'POST', requestPath, '{not-json');
    assert.equal(response.status, 503, `${requestPath} must reject before JSON parsing`);
    assert.match(response.headers['cache-control'] || '', /no-store/);
    assert.deepEqual(response.body, expected);
  }

  for (const requestPath of [
    '/api/categories',
    '/api/posts',
    '/api/posts/1',
    '/api/marketplace',
    '/api/marketplace/1',
    '/api/trending/topics',
    '/api/trending/hot-records',
    '/api/reactions/record/example',
    '/api/flash-polls',
    '/api/feed/shortform',
  ]) {
    const response = await request(port, 'GET', requestPath);
    assert.equal(response.status, 503, `${requestPath} must stay closed while its public page is preparing`);
    assert.match(response.headers['cache-control'] || '', /no-store/);
    assert.deepEqual(response.body, expected);
  }
  assert.notEqual((await request(port, 'GET', '/api/upload/image')).status, 503);
  const chatRead = await request(port, 'GET', '/api/chat/check-nickname');
  assert.equal(chatRead.status, 503);
  assert.match(chatRead.headers['cache-control'] || '', /no-store/);
  assert.deepEqual(chatRead.body, expected);
});

test('Given chat is preparing When a /ws/chat upgrade is requested Then the server rejects it', () => {
  const source = readSource('src/server.js');

  assert.match(source, /if \(pathname === '\/ws\/chat'\) \{\s*rejectPreparingWebSocket\(socket\)/);
  assert.doesNotMatch(source, /chatWss\.handleUpgrade\(/);
});

test('Given unreleased social interactions When a direct write request is sent Then it is rejected instead of returning fake success', () => {
  const source = readSource('src/server.js');

  assert.match(source, /app\.use\('\/api\/reactions', rejectPreparingFeature\);/);
  assert.match(source, /app\.use\('\/api\/flash-polls', rejectPreparingFeature\);/);
  assert.doesNotMatch(source, /res\.json\(\{ topics: \[\], updatedAt: new Date\(0\)\.toISOString\(\) \}\)/);
  assert.doesNotMatch(source, /res\.json\(\{ records: \[\], total: 0 \}\)/);
});

test('Given the local-only card studio When a retired public renderer is called Then server-side image and HTML generation are fail-closed', () => {
  const source = readSource('src/server.js');

  for (const route of [
    '/api/card-studio/profile-card/generate',
    '/api/card-studio/profile-card/generate-modular',
    '/api/card-studio/profile-card/preview-html',
    '/api/profile-card/generate',
    '/api/profile-card/generate-modular',
    '/api/profile-card/preview-html',
  ]) {
    assert.ok(source.includes(`'${route}'`), `${route} must be gated`);
  }
  assert.ok(source.indexOf('const blockedLegacyCardRendererPaths') < source.indexOf('app.use(express.json'), 'gate must run before body parsing');
  assert.match(source, /function normalizeRendererPath\(requestPath\)/);
  assert.doesNotMatch(source, /req\.method === 'POST' && blockedLegacyCardRendererPaths/);
  assert.match(source, /return rejectPreparingFeature\(req, res\);/);
});

test('Given retired public renderer routes When method and path variants are sent Then every renderer surface is rejected before parsing', async (t) => {
  const { port, processRef } = startAuditServer(t);
  await waitForServer(port, processRef);

  const expected = { success: false, error: '이 기능은 준비 중이에요.' };
  const rendererPaths = [
    '/api/card-studio/profile-card/generate',
    '/api/card-studio/profile-card/generate-modular',
    '/api/card-studio/profile-card/preview-html',
    '/api/profile-card/generate',
    '/api/profile-card/generate-modular',
    '/api/profile-card/preview-html',
  ];

  for (const rendererPath of rendererPaths) {
    const lastSlash = rendererPath.lastIndexOf('/') + 1;
    const encodedPath = `${rendererPath.slice(0, lastSlash)}%${rendererPath.charCodeAt(lastSlash).toString(16)}${rendererPath.slice(lastSlash + 1)}`;
    for (const requestPath of [rendererPath, `${rendererPath}/`, rendererPath.toUpperCase(), encodedPath]) {
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        const response = await request(port, method, requestPath, method === 'GET' ? '' : '{not-json');
        assert.equal(response.status, 503, `${method} ${requestPath} must fail closed`);
        assert.match(response.headers['cache-control'] || '', /no-store/);
        assert.deepEqual(response.body, expected);
      }
    }
  }

  const search = await request(port, 'GET', `/api/card-studio/search?q=${encodeURIComponent('김민')}`);
  assert.equal(search.status, 200);
  assert.equal(search.body?.success, true);
});

test('Given an unauthenticated upload When multipart data arrives Then authentication runs before Multer buffers it', () => {
  const source = readSource('backend/routes/upload.js');

  assert.match(source, /router\.post\('\/image', authenticateToken, upload\.single\('image'\)/);
  assert.match(source, /router\.post\('\/images', authenticateToken, upload\.array\('images', 10\)/);
});

test('Given public athlete records When an unverified owner claim is unavailable Then share-card output remains disabled', () => {
  const policy = readSource('frontend/src/config/dataPolicy.ts');

  assert.match(policy, /status:\s*'disabled'/);
});

test('Given unreleased user-submitted pages When a visitor follows an old link Then the client shows the prepared state instead of a write form', () => {
  const source = readSource('frontend/src/App.tsx');

  assert.match(source, /path="new" element=\{<FeaturePreparingPage title="대회 제보는 준비 중이에요"/);
  assert.match(source, /path="new" element=\{<FeaturePreparingPage title="결과 제보는 준비 중이에요"/);
  assert.match(source, /path="\/marketplace"[\s\S]*?path="\*" element=\{<FeaturePreparingPage title="중고 마켓은 준비 중이에요"/);
  assert.doesNotMatch(source, /MarketplaceFormPage/);
});

test('Given a production database When an operator looks for legacy scripts Then unsafe TLS and sample-data scripts are absent', () => {
  for (const retiredPath of [
    'backend/database/run-migration.js',
    'backend/database/seed.js',
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, retiredPath)), false, `${retiredPath} must stay removed`);
  }
});

test('Given preparation routes and public configuration When unfinished interactions are inspected Then they expose no public connection settings', () => {
  const app = readSource('frontend/src/App.tsx');
  const community = readSource('frontend/src/pages/CommunityPage.tsx');
  const netlify = readSource('netlify.toml');
  const frontendEnv = readSource('frontend/.env.example');

  assert.match(app, /path="\/chat"[\s\S]*?FeaturePreparingPage title="오픈 채팅은 준비 중이에요"/);
  assert.match(community, /title="커뮤니티는 준비 중이에요"/);
  assert.doesNotMatch(app, /const ChatPage = lazy\(/);
  assert.doesNotMatch(community, /CommunityQuickPostForm|CommunityImagePicker|api\/upload/);

  for (const publicConfig of [netlify, frontendEnv]) {
    assert.doesNotMatch(publicConfig, /\bVITE_WS_URL\b/);
    assert.doesNotMatch(publicConfig, /\bVITE_(?:PRIVATE|PERSONAL)_(?:NOTE|NOTES|PHOTO|PHOTOS|STORAGE)\b/i);
  }
});

test('Given no approved private vault When personal notes and photos are inspected Then they cannot reuse the public upload route', () => {
  const app = readSource('frontend/src/App.tsx');
  const profileCard = readSource('frontend/src/pages/ProfileCardStudio/index.tsx');
  const uploadConsumers = [];

  function collect(relativeDirectory) {
    for (const entry of fs.readdirSync(path.join(ROOT, relativeDirectory), { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        collect(relativePath);
      } else if (/\.(?:ts|tsx)$/.test(entry.name) && /(?:from\s+['"][^'"]*api\/upload|import\(['"][^'"]*api\/upload)/.test(readSource(relativePath))) {
        uploadConsumers.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }

  collect('frontend/src');

  assert.deepEqual(uploadConsumers, ['frontend/src/pages/MarketplaceFormPage.tsx']);
  assert.doesNotMatch(app, /MarketplaceFormPage/);
  assert.doesNotMatch(app, /path="\/(?:private-notes|private-photos|personal-notes|personal-photos|notes|photos)"/);
  assert.doesNotMatch(profileCard, /api\/upload/);
  assert.match(profileCard, /서버로 보내지 않아요/);
});

test('Given direct chat and write transports When no request body or upload fixture is supplied Then every unfinished surface fails closed', async (t) => {
  const { port, processRef } = startAuditServer(t);
  await waitForServer(port, processRef);
  const expected = { success: false, error: '이 기능은 준비 중이에요.' };

  for (const [method, requestPath] of [
    ['GET', '/api/chat/check-nickname'],
    ['GET', '/api/posts'],
    ['GET', '/api/marketplace'],
    ['POST', '/api/chat/reports'],
    ['POST', '/api/posts'],
    ['POST', '/api/posts/1/comments'],
    ['POST', '/api/posts/1/vote'],
    ['POST', '/api/posts/1/poll'],
    ['POST', '/api/marketplace'],
    ['POST', '/api/upload/image'],
    ['POST', '/api/competitions'],
    ['POST', '/api/match-results'],
    ['POST', '/api/reactions'],
    ['POST', '/api/flash-polls/1/vote'],
  ]) {
    const response = await request(port, method, requestPath);
    assert.equal(response.status, 503, `${method} ${requestPath} must stay closed`);
    assert.match(response.headers['cache-control'] || '', /no-store/);
    assert.deepEqual(response.body, expected);
  }

  const websocket = await websocketHandshake(port);
  assert.equal(websocket.status, 503, 'the public chat websocket must stay closed');
  assert.match(websocket.headers['cache-control'] || '', /no-store/, 'the closed websocket response must not be cacheable');
});

test('Given a guest on preparation routes When mobile and desktop widths are used Then recovery links replace interaction forms', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await navigateToReady(page, `${baseUrl}/community`, page.getByRole('heading', { name: '커뮤니티는 준비 중이에요', exact: true }));
    await expectVisible(page.getByRole('link', { name: '기록 찾아보기', exact: true }));
    await expectVisible(page.getByRole('link', { name: '대회 결과 보기', exact: true }));
    assert.equal(await page.locator('textarea, input[type="file"]').count(), 0, 'the closed community page must not expose a post or photo form');
    visited.push(page.url());

    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateToReady(page, `${baseUrl}/chat`, page.getByRole('heading', { name: '오픈 채팅은 준비 중이에요', exact: true }));
    await expectVisible(page.getByText('안전한 운영 기준과 신고·검토 절차를 먼저 갖춘 뒤 열겠습니다.', { exact: true }));
    assert.equal(await page.locator('textarea, input[type="file"]').count(), 0, 'the closed chat page must not expose a message or photo form');
    visited.push(page.url());
  }, {
    fileName: 'closed-interaction-surfaces-e2e-results.json',
    scenario: 'guest preparation surfaces at 390px mobile and desktop widths',
    invocation: 'node --test backend/tests/launch-interaction-safety.test.js',
  });
});
