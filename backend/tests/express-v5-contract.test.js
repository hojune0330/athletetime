const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const dependencyManifest = require('../../package.json');
const serverSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src/server.js'),
  'utf8',
);

function request(server, requestPath) {
  const address = server.address();

  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port: address.port, path: requestPath }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({
        statusCode: response.statusCode,
        contentType: response.headers['content-type'] || '',
        body,
      }));
    });

    request.on('error', reject);
  });
}

test('Express v5 preserves the SPA fallback while unknown API paths stay non-SPA JSON errors', async () => {
  assert.equal(dependencyManifest.dependencies.express, '^5.2.1');
  assert.equal(serverSource.includes('Legacy API:'), false);
  assert.match(serverSource, /Card Studio: http:\/\/localhost:\$\{PORT\}\/api\/card-studio\//);

  const { server } = require('../../src/server');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const spaResponse = await request(server, '/records/shared-link-check');
    assert.equal(spaResponse.statusCode, 200);
    assert.match(spaResponse.contentType, /text\/html/);

    const apiResponse = await request(server, '/api/does-not-exist');
    assert.equal(apiResponse.statusCode, 404);
    assert.match(apiResponse.contentType, /application\/json/);
    assert.deepEqual(JSON.parse(apiResponse.body), {
      success: false,
      error: '존재하지 않는 엔드포인트입니다.',
      path: '/api/does-not-exist',
    });

    const canonicalResponse = await request(server, '/api/card-studio/search?q=%EA%B9%80%EB%AF%BC%EC%A4%80');
    assert.equal(canonicalResponse.statusCode, 200);
    assert.match(canonicalResponse.contentType, /application\/json/);
    assert.equal(JSON.parse(canonicalResponse.body).success, true);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
