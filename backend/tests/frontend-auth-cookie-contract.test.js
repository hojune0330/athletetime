const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

test('frontend auth client uses cookie credentials and CSRF instead of auth localStorage tokens', () => {
  const client = read('frontend/src/api/client.ts');
  const authContext = read('frontend/src/context/AuthContext.tsx');
  const header = read('frontend/src/components/layout/Header.tsx');
  const registerPage = read('frontend/src/pages/RegisterPage.tsx');
  const authApi = read('frontend/src/api/auth.ts');
  const frontendSource = listSourceFiles(path.join(ROOT, 'frontend/src'))
    .map((sourcePath) => fs.readFileSync(sourcePath, 'utf8'))
    .join('\n');

  assert.match(client, /withCredentials:\s*true/);
  assert.match(client, /X-CSRF-Token/);
  assert.match(client, /\/api\/auth\/csrf-token/);

  assert.equal(frontendSource.includes("localStorage.getItem('accessToken')"), false);
  assert.equal(frontendSource.includes('localStorage.getItem("accessToken")'), false);
  assert.equal(frontendSource.includes("localStorage.setItem('accessToken'"), false);
  assert.equal(frontendSource.includes('localStorage.setItem("accessToken"'), false);
  assert.equal(frontendSource.includes("localStorage.removeItem('accessToken'"), false);
  assert.equal(frontendSource.includes('localStorage.removeItem("accessToken"'), false);
  assert.equal(frontendSource.includes("localStorage.getItem('refreshToken')"), false);
  assert.equal(frontendSource.includes('localStorage.getItem("refreshToken")'), false);
  assert.equal(frontendSource.includes("localStorage.setItem('refreshToken'"), false);
  assert.equal(frontendSource.includes('localStorage.setItem("refreshToken"'), false);
  assert.equal(frontendSource.includes("localStorage.removeItem('refreshToken'"), false);
  assert.equal(frontendSource.includes('localStorage.removeItem("refreshToken"'), false);

  assert.doesNotMatch(authContext, /if \(!token\)\s*\{/);
  assert.doesNotMatch(authApi, /logout\(refreshToken/);
  assert.doesNotMatch(authApi, /\b(?:accessToken|refreshToken)\?:/);
});

test('frontend treats an anonymous me response as a quiet unauthenticated state', () => {
  const authContext = read('frontend/src/context/AuthContext.tsx');
  const client = read('frontend/src/api/client.ts');

  const fetchUserBlock = authContext.slice(
    authContext.indexOf('const fetchUser = async () => {'),
    authContext.indexOf('// 초기 로드'),
  );

  assert.doesNotMatch(authContext, /SESSION_HINT_COOKIE_NAME|hasCookie\(/);
  assert.match(fetchUserBlock, /authApi\.getMe\(\)/);
  assert.match(fetchUserBlock, /!isHttpStatus\(error, 401\) && !isHttpStatus\(error, 403\)/);
  assert.match(client, /function isGuestSessionCheck/);
  assert.match(client, /return status === 401 && url\.includes\('\/api\/auth\/me'\)/);
});
