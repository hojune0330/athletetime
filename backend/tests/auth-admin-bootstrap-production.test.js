const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

function request(server, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const { port } = server.address();
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/api/auth/set-admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: raw });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

function preserveEnvironment(keys) {
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function loadProductionRouter() {
  const modulePaths = [
    require.resolve('../auth/routes'),
    require.resolve('../middleware/auth'),
    require.resolve('../utils/jwt'),
    require.resolve('../utils/db'),
  ];
  const cachedModules = new Map(modulePaths.map((modulePath) => [modulePath, require.cache[modulePath]]));
  const restoreEnvironment = preserveEnvironment([
    'NODE_ENV',
    'JWT_SECRET',
    'ADMIN_SECRET_KEY',
    'ADMIN_SETUP_KEY',
  ]);
  let promotionQueries = 0;

  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'test-only-production-jwt-secret';
  process.env.ADMIN_SECRET_KEY = 'configured-secret-must-not-enable-production-bootstrap';
  process.env.ADMIN_SETUP_KEY = 'legacy-setup-key-must-be-ignored';

  for (const modulePath of modulePaths) {
    delete require.cache[modulePath];
  }

  const dbPath = require.resolve('../utils/db');
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql) => {
        if (/UPDATE users SET is_admin/i.test(sql)) {
          promotionQueries += 1;
        }
        return { rows: [], rowCount: 0 };
      },
      getClient: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release() {} }),
    },
  };

  const router = require('../auth/routes');

  return {
    router,
    promotionQueries: () => promotionQueries,
    restore() {
      for (const modulePath of modulePaths) {
        const cached = cachedModules.get(modulePath);
        if (cached) {
          require.cache[modulePath] = cached;
        } else {
          delete require.cache[modulePath];
        }
      }
      restoreEnvironment();
    },
  };
}

test('Given production and legacy admin setup keys, POST set-admin is an unregistered route and cannot promote an account', async (t) => {
  const production = loadProductionRouter();
  const app = express();
  const server = await new Promise((resolve) => {
    const instance = app.use('/api/auth', production.router).listen(0, '127.0.0.1', () => resolve(instance));
  });

  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => production.restore());

  const email = 'target-account@example.test';
  const response = await request(server, {
    email,
    secretKey: 'legacy-setup-key-must-be-ignored',
  });

  assert.equal(response.status, 404);
  assert.match(response.headers['content-type'], /^text\/html/);
  assert.doesNotMatch(response.body, new RegExp(email));
  assert.equal(production.promotionQueries(), 0);
});
