const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('LEGACY-DASHBOARD-ADMIN-API-001 Given the operator dashboard loads status or gallery data When it creates a request Then it uses the authenticated admin API boundary', () => {
  const client = readSource('dashboard/js/api.js');
  const server = readSource('src/server.js');

  assert.match(client, /baseUrl:\s*'\/api\/card-studio\/admin'/u);
  assert.match(client, /publicBaseUrl:\s*'\/api\/card-studio'/u);
  assert.match(client, /credentials:\s*'same-origin'/u);
  assert.match(client, /csrfCookieName:\s*'athletetime_csrf'/u);
  assert.match(client, /requestOptions\.headers\['X-CSRF-Token'\]/u);
  assert.match(client, /getPublic\(path\)/u);
  assert.match(client, /authenticated:\s*false/u);
  assert.doesNotMatch(client, /localStorage\.getItem\('accessToken'\)/u);
  assert.doesNotMatch(client, /Authorization\s*=\s*`Bearer \$\{token\}`/u);
  assert.doesNotMatch(client, /get\('\/api\/status'\)/u);
  assert.doesNotMatch(client, /get\(`\/api\/gallery/u);
  assert.match(server, /app\.use\('\/api\/card-studio\/admin',\s*authenticateToken,\s*jwtRequireAdmin,\s*cardStudioAdmin\)/u);

  const search = readSource('dashboard/js/search.js');
  assert.match(search, /api\.getPublic\('\/search\/competitions'\)/u);
  assert.match(search, /api\.getPublic\(`\/search\?\$\{qs\.toString\(\)\}`\)/u);
  assert.match(search, /api\.getPublic\(`\/search\/section\?\$\{params\.toString\(\)\}`\)/u);
  assert.doesNotMatch(search, /api\.get\('\/api\/card-studio\//u);

  const dashboard = readSource('dashboard/index.html');
  assert.match(dashboard, /xhr\.withCredentials\s*=\s*true/u);
  assert.doesNotMatch(dashboard, /localStorage\.getItem\('accessToken'\)/u);
  assert.doesNotMatch(dashboard, /Authorization',\s*'Bearer/u);
});
