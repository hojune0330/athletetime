const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const { toPublicDataQualitySummary } = require('../../card-studio/routes/recordAnalyticsRoutes');

const ROOT = path.join(__dirname, '..', '..');

function request(baseUrl, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${requestPath}`, { method: 'GET' }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if ((await request(baseUrl, '/health')).status === 200) return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('server did not become healthy');
}

test('PUBLIC-DATA-QUALITY-001 Given internal quality review samples When a public summary is built Then only aggregate health data is returned', () => {
  const internalReport = {
    generatedAt: '2026-08-12T00:00:00.000Z',
    scope: 'data/results/*.json',
    totals: { competitions: 216, events: 8_344, resultRows: 83_401, resultSets: 216 },
    summary: { malformedRecord: 0, statusOnlyRecord: 22_600 },
    identity: { homonymNames: 4_735, shadowClusterNames: 712 },
    issues: {
      malformedRecord: [{
        filename: 'internal-source-file.json',
        competitionId: 'internal-competition-id',
        athleteKey: 'internal-athlete-key',
        name: 'not-for-public-response',
      }],
    },
  };

  const result = toPublicDataQualitySummary(internalReport);

  assert.deepEqual(result, {
    generatedAt: '2026-08-12T00:00:00.000Z',
    scope: 'collected_public_results',
    totals: { competitions: 216, events: 8_344, resultRows: 83_401, resultSets: 216 },
    summary: { malformedRecord: 0, statusOnlyRecord: 22_600 },
  });

  const serialized = JSON.stringify(result);
  for (const forbiddenValue of [
    'data/results/*.json',
    'internal-source-file.json',
    'internal-competition-id',
    'internal-athlete-key',
    'not-for-public-response',
    'homonymNames',
  ]) {
    assert.equal(serialized.includes(forbiddenValue), false, `public health summary must omit ${forbiddenValue}`);
  }
});

test('PUBLIC-DATA-QUALITY-002 Given the public analytics route When it returns collection health Then review samples and identity analysis stay server-only', async () => {
  const port = String(7100 + Math.floor(Math.random() * 500));
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-public-data-quality',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(baseUrl);
    const response = await request(baseUrl, '/api/card-studio/analytics/data-quality');

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.scope, 'collected_public_results');
    assert.equal(Number.isInteger(response.body.data.totals.competitions), true);
    assert.equal(typeof response.body.data.summary, 'object');

    const serialized = JSON.stringify(response.body.data);
    for (const forbiddenKey of ['issues', 'identity', 'filename', 'competitionId', 'athleteKey', 'sourceId']) {
      assert.equal(serialized.includes(`\"${forbiddenKey}\"`), false, `public health route must omit ${forbiddenKey}`);
    }
  } finally {
    serverProcess.kill('SIGINT');
    await new Promise((resolve) => {
      serverProcess.once('exit', resolve);
      setTimeout(resolve, 3_000);
    });
  }
});
