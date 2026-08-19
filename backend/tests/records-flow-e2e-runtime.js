const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const recordAnalyticsRoutes = require('../../card-studio/routes/recordAnalyticsRoutes');
const { makeWorkspacePreview } = require('./records-flow-e2e-data');

const ROOT = path.join(__dirname, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITE_BIN = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');
let viteCacheDir;
let cacheCleanupRegistered = false;

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function startTeamApiServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/api/card-studio/analytics/record-workspaces/preview', express.json(), (req, res) => {
    const subjectKeys = Array.isArray(req.body?.subjectKeys)
      ? req.body.subjectKeys.filter((subjectKey) => typeof subjectKey === 'string')
      : [];
    return res.json({
      success: true,
      data: makeWorkspacePreview(subjectKeys, {
        cursor: typeof req.body?.cursor === 'string' ? req.body.cursor : '',
        limit: Number.isInteger(req.body?.limit) ? req.body.limit : undefined,
      }),
    });
  });
  app.use('/api/card-studio/analytics', recordAnalyticsRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function startViteServer(port) {
  assert.ok(fs.existsSync(VITE_BIN), `Vite binary not found at ${VITE_BIN}`);
  const child = spawn(process.execPath, [
    VITE_BIN,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ], {
    cwd: FRONTEND,
    env: {
      ...process.env,
      BROWSER: 'none',
      VITE_API_BASE_URL: '',
      VITE_CACHE_DIR: getViteCacheDir(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [];
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  try {
    await waitForHttp(`http://127.0.0.1:${port}/records`, 45_000);
  } catch (error) {
    await stopServer({ child });
    error.message = `${error.message}\nVite output:\n${output.join('')}`;
    throw error;
  }
  return { child };
}

function getViteCacheDir() {
  if (!viteCacheDir) {
    viteCacheDir = fs.mkdtempSync(path.join(
      os.tmpdir(),
      `athletetime-records-e2e-vite-worker-${process.pid}-`,
    ));
  }
  if (!cacheCleanupRegistered) {
    cacheCleanupRegistered = true;
    process.once('exit', () => fs.rmSync(viteCacheDir, { force: true, recursive: true }));
  }
  return viteCacheDir;
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const status = await requestStatus(url);
      if (status && status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on('error', reject);
    request.setTimeout(2_000, () => {
      request.destroy(new Error(`Timed out requesting ${url}`));
    });
  });
}

async function stopServer(server) {
  const child = server.child;
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

module.exports = { getFreePort, startTeamApiServer, startViteServer, stopServer };
