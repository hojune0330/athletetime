const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const recordAnalyticsRoutes = require('../../card-studio/routes/recordAnalyticsRoutes');

async function startActualIndexServer(root) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.get('/api/auth/me', (_request, response) => {
    response.json({ success: true, data: null });
  });
  app.get('/api/auth/csrf-token', (_request, response) => {
    response.json({ success: true, csrfToken: 'local-smoke' });
  });
  app.use('/api/card-studio/analytics', recordAnalyticsRoutes);
  const spaDir = path.join(root, 'community');
  app.use(express.static(spaDir));
  app.get('/{*splat}', (_request, response) => {
    response.sendFile(path.join(spaDir, 'index.html'));
  });
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { server, baseUrl: `http://127.0.0.1:${address.port}`, port: address.port };
}

async function stopActualIndexServer(server) {
  if (!server.listening) return;
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function installLoopbackNetworkGuard(page, baseUrl) {
  const appOrigin = new URL(baseUrl).origin;
  const state = {
    externalAttempted: false,
    externalStylesIntercepted: false,
    unexpectedExternalRequest: false,
    actualExternalNetworkObserved: false,
    localRequestFailed: false,
    consoleError: false,
    pageError: false,
    nonLocalWebSocket: false,
    observationTasks: [],
  };
  page.on('console', (message) => {
    if (message.type() === 'error') state.consoleError = true;
  });
  page.on('pageerror', () => { state.pageError = true; });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).origin === appOrigin) state.localRequestFailed = true;
  });
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).origin !== appOrigin) state.nonLocalWebSocket = true;
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === appOrigin) return;
    state.observationTasks.push(response.serverAddr().then((address) => {
      if (address) state.actualExternalNetworkObserved = true;
    }));
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === appOrigin) {
      await route.continue();
      return;
    }
    state.externalAttempted = true;
    if (request.resourceType() === 'stylesheet' || url.pathname.endsWith('.css')) {
      state.externalStylesIntercepted = true;
      await route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' });
      return;
    }
    state.unexpectedExternalRequest = true;
    await route.abort('blockedbyclient');
  });
  return state;
}

async function assertLoopbackNetworkGuard(state) {
  await Promise.all(state.observationTasks);
  assert.equal(state.actualExternalNetworkObserved, false);
  assert.equal(state.unexpectedExternalRequest, false);
  assert.equal(state.localRequestFailed, false);
  assert.equal(state.consoleError, false);
  assert.equal(state.pageError, false);
  assert.equal(state.nonLocalWebSocket, false);
  assert.equal(
    state.externalStylesIntercepted,
    state.externalAttempted,
    'any external request must be an intercepted stylesheet; zero external requests is valid',
  );
}

async function captureRecoveryNotice(locator, screenshotPath) {
  await locator.waitFor({ state: 'visible' });
  await locator.screenshot({ path: screenshotPath, animations: 'disabled' });
  const bytes = fs.readFileSync(screenshotPath);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {
    screenshot: path.basename(screenshotPath),
    capturedAt: fs.statSync(screenshotPath).mtime.toISOString(),
    screenshotSize: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) },
  };
}

module.exports = {
  assertLoopbackNetworkGuard,
  captureRecoveryNotice,
  installLoopbackNetworkGuard,
  startActualIndexServer,
  stopActualIndexServer,
};
