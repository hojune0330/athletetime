const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const insightService = require('../../card-studio/services/insightService');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_SERVICE_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

function request(server, requestPath) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port: address.port, path: requestPath }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({
        statusCode: response.statusCode,
        cacheControl: response.headers['cache-control'] || '',
        body,
      }));
    });
    request.on('error', reject);
  });
}

test('PUBLIC-ROUTE-ERROR-001 Given an internal public-route failure When a visitor receives the response Then the internal message is not disclosed', async () => {
  const marker = 'PUBLIC_ROUTE_INTERNAL_MARKER_4d9c';
  const original = insightService.getFeaturedProfiles;
  const app = express();
  app.use('/api/card-studio', require('../../card-studio/routes/publicRoutes'));
  insightService.getFeaturedProfiles = () => { throw new Error(marker); };

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const response = await request(server, '/api/card-studio/insights/featured');
    assert.equal(response.statusCode, 500);
    assert.equal(response.cacheControl, 'no-store');
    assert.deepEqual(JSON.parse(response.body), { success: false, error: PUBLIC_SERVICE_ERROR });
    assert.equal(response.body.includes(marker), false);
  } finally {
    insightService.getFeaturedProfiles = original;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('PUBLIC-ROUTE-ERROR-002 Given public route handlers When their source is reviewed Then raw exception messages are never serialized', () => {
  const publicRouteFiles = [
    'card-studio/routes/publicRoutes.js',
    'card-studio/routes/profileCardPublicRoutes.js',
    'card-studio/routes/resultEventsRoute.js',
  ];

  for (const relativePath of publicRouteFiles) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    assert.doesNotMatch(source, /error:\s*(?:error|err)\.message/u, relativePath);
  }
});
