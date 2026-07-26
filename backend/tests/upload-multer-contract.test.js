const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const { upload, handleUploadError } = require('../middleware/upload');

async function withUploadServer(run) {
  const app = express();
  app.post('/image', upload.single('image'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'missing file' });
      return;
    }

    res.json({
      success: true,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      bufferLength: req.file.buffer.length
    });
  });
  app.use(handleUploadError);

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function postImage(baseUrl, content, fileName, mimeType) {
  const form = new FormData();
  form.set('image', new Blob([content], { type: mimeType }), fileName);
  return fetch(`${baseUrl}/image`, { method: 'POST', body: form });
}

test('Given the resolved Multer package When checking the security floor Then v2.2.0 or newer is installed', () => {
  const { version } = require('multer/package.json');
  const [major, minor] = version.split('.').map((part) => Number.parseInt(part, 10));

  assert.ok(major > 2 || (major === 2 && minor >= 2), `expected Multer 2.2.0 or newer, received ${version}`);
});

test('Given an accepted image upload When Multer parses multipart data Then the in-memory buffer reaches the route', async () => {
  await withUploadServer(async (baseUrl) => {
    const response = await postImage(baseUrl, Buffer.from('image-proof'), 'proof.png', 'image/png');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      originalName: 'proof.png',
      mimeType: 'image/png',
      bufferLength: 11
    });
  });
});

test('Given a non-image upload When Multer applies the file filter Then the request is rejected', async () => {
  await withUploadServer(async (baseUrl) => {
    const response = await postImage(baseUrl, Buffer.from('not-an-image'), 'notes.txt', 'text/plain');
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.equal(typeof payload.error, 'string');
  });
});

test('Given an image above the configured limit When Multer parses it Then the request is rejected', async () => {
  await withUploadServer(async (baseUrl) => {
    const response = await postImage(baseUrl, Buffer.alloc((5 * 1024 * 1024) + 1), 'too-large.png', 'image/png');
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.equal(typeof payload.error, 'string');
  });
});
