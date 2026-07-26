const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const dependencyManifest = require('../../package.json');

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

  const { server } = require('../../src/server');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const spaResponse = await request(server, '/records/shared-link-check');
    assert.equal(spaResponse.statusCode, 200);
    assert.match(spaResponse.contentType, /text\/html/);

    const apiResponse = await request(server, '/api/does-not-exist');
    assert.equal(apiResponse.statusCode, 401);
    assert.match(apiResponse.contentType, /application\/json/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
