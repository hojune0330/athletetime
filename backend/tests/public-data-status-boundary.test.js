const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const publicDataRoutes = require('../../card-studio/routes/publicDataRoutes');
const publicDataService = require('../../card-studio/services/publicDataService');

function getJson(port, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: requestPath }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          body: JSON.parse(raw),
        });
      });
    });
    request.on('error', reject);
  });
}

test('PUBLIC-DATA-STATUS-001: public status exposes availability and source, never a server file path', async (t) => {
  const status = publicDataService.getStatus();
  assert.deepEqual(Object.keys(status).sort(), ['available', 'reason', 'rowCount', 'source']);

  const app = express();
  app.use('/api/public-data', publicDataRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await getJson(server.address().port, '/api/public-data/status');
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.deepEqual(Object.keys(response.body.status).sort(), ['available', 'reason', 'rowCount', 'source']);
  assert.doesNotMatch(JSON.stringify(response.body), /athlete-registry\.csv|data[\\/]+public[\\/]+krsport/u);
});
