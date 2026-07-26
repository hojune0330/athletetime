const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

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
    '/api/posts',
    '/api/posts/:postId/comments',
    '/api/posts/:postId/vote',
    '/api/posts/:postId/poll',
    '/api/marketplace',
    '/api/competitions',
    '/api/match-results',
  ]) {
    assert.match(source, new RegExp(`app\\.use\\('${route.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}', requireReadOnlyLaunchFeature\\(`));
  }
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
    ['/api/chat', '{"message":"direct chat"}', 'application/json'],
    ['/api/upload/image', '--audit-boundary\r\ncontent-disposition: form-data; name="image"\r\n\r\nbytes\r\n--audit-boundary--', 'multipart/form-data; boundary=audit-boundary'],
  ];

  for (const [requestPath, payload, contentType] of writes) {
    const response = await request(port, 'POST', requestPath, payload, contentType);
    assert.equal(response.status, 503, `${requestPath} must fail closed`);
    assert.match(response.headers['cache-control'] || '', /no-store/);
    assert.deepEqual(response.body, expected);
  }

  for (const requestPath of ['/api/posts', '/api/POSTS', '/api/%70osts', '/api/marketplace', '/api/chat']) {
    const response = await request(port, 'POST', requestPath, '{not-json');
    assert.equal(response.status, 503, `${requestPath} must reject before JSON parsing`);
    assert.match(response.headers['cache-control'] || '', /no-store/);
    assert.deepEqual(response.body, expected);
  }

  assert.equal((await request(port, 'GET', '/api/posts')).status, 200);
  assert.equal((await request(port, 'GET', '/api/marketplace')).status, 200);
  assert.notEqual((await request(port, 'GET', '/api/upload/image')).status, 503);
});

test('Given launch preparation mode When a chat upgrade is requested Then server rejects it before WebSocket setup', () => {
  const source = readSource('src/server.js');

  assert.match(source, /if \(pathname === '\/ws\/chat'\) \{\s*rejectPreparingWebSocket\(socket\);\s*return;/);
  assert.doesNotMatch(source, /chatWss\.handleUpgrade\(/);
});

test('Given unreleased social interactions When a direct write request is sent Then it is rejected instead of returning fake success', () => {
  const source = readSource('src/server.js');

  assert.match(source, /app\.post\('\/api\/reactions', rejectPreparingFeature\);/);
  assert.match(source, /app\.post\('\/api\/flash-polls\/:pollId\/vote', rejectPreparingFeature\);/);
  assert.doesNotMatch(source, /app\.post\('\/api\/reactions', \(req, res\) => \{\s*res\.json/);
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
