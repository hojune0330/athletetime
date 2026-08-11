const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

function createViteStartupLock(lockPath, options = {}) {
  if ((options.platform ?? process.platform) === 'win32') {
    return createWindowsPipeLock(createPipeName(lockPath), options);
  }

  return createFileLock(lockPath, options);
}

function createWindowsPipeLock(pipeName, options) {
  const retryMs = options.retryMs ?? 50;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const createServer = options.createServer ?? net.createServer;
  const listenPipe = options.listenPipe ?? listenPipeServer;

  return async function acquireViteStartupLock() {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
      const server = createServer();
      try {
        await listenPipe(server, pipeName);
        let released = false;
        return async () => {
          if (released) return;
          released = true;
          await closeServer(server);
        };
      } catch (error) {
        await closeServer(server);
        if (!isRetryableWindowsLockError(error)) throw error;
        lastError = error;
        options.onContention?.(error);
        await pause(retryMs);
      }
    }
    throw lockTimeoutError(pipeName, lastError);
  };
}

function createFileLock(lockPath, options) {
  const retryMs = options.retryMs ?? 50;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const fsPromises = options.fsPromises ?? fs.promises;

  return async function acquireViteStartupLock() {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
      try {
        const handle = await fsPromises.open(lockPath, 'wx');
        try {
          await handle.writeFile(`${process.pid}\n`);
        } catch (error) {
          await handle.close();
          await fsPromises.unlink(lockPath).catch(() => undefined);
          throw error;
        }
        let released = false;
        return async () => {
          if (released) return;
          released = true;
          await handle.close();
          await fsPromises.unlink(lockPath).catch((error) => {
            if (error.code !== 'ENOENT') throw error;
          });
        };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        lastError = error;
        options.onContention?.(error);
        await pause(retryMs);
      }
    }
    throw lockTimeoutError(lockPath, lastError);
  }
}

function createPipeName(lockPath) {
  const digest = crypto.createHash('sha256').update(path.resolve(lockPath)).digest('hex');
  return `\\\\.\\pipe\\athletetime-records-e2e-${digest}`;
}

function isRetryableWindowsLockError(error) {
  return ['EADDRINUSE', 'EACCES', 'EBUSY', 'EPERM'].includes(error.code);
}

function listenPipeServer(server, pipeName) {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(pipeName);
  });
}

async function closeServer(server) {
  if (!server || typeof server.close !== 'function') return;
  await new Promise((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
}

function lockTimeoutError(lockName, cause) {
  return new Error(`Timed out waiting for Vite startup lock: ${lockName}`, { cause });
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const workspaceHash = crypto.createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16);
const acquireViteStartupLock = createViteStartupLock(path.join(os.tmpdir(), `athletetime-records-e2e-vite-${workspaceHash}.lock`));

async function startViteWithLock(startViteServer) {
  const release = await acquireViteStartupLock();
  try {
    return await startViteServer();
  } finally {
    await release();
  }
}

module.exports = { createViteStartupLock, startViteWithLock };
