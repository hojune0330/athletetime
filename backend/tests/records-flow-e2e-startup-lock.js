const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createViteStartupLock(lockPath, options = {}) {
  const retryMs = options.retryMs ?? 50;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const staleMs = options.staleMs ?? 60_000;

  return async function acquireViteStartupLock() {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const handle = await fs.promises.open(lockPath, 'wx');
        await handle.writeFile(`${process.pid}\n`);
        let released = false;
        return async () => {
          if (released) return;
          released = true;
          await handle.close();
          await fs.promises.unlink(lockPath).catch((error) => {
            if (error.code !== 'ENOENT') throw error;
          });
        };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await clearStaleLock(lockPath, staleMs);
        await pause(retryMs);
      }
    }
    throw new Error(`Timed out waiting for Vite startup lock: ${lockPath}`);
  };
}

async function clearStaleLock(lockPath, staleMs) {
  try {
    const stat = await fs.promises.stat(lockPath);
    if (Date.now() - stat.mtimeMs > staleMs) await fs.promises.unlink(lockPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const acquireViteStartupLock = createViteStartupLock(path.join(os.tmpdir(), 'athletetime-records-e2e-vite.lock'));

async function startViteWithLock(startViteServer) {
  const release = await acquireViteStartupLock();
  try {
    return await startViteServer();
  } finally {
    await release();
  }
}

module.exports = { createViteStartupLock, startViteWithLock };
