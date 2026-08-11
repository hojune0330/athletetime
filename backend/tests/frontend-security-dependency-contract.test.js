const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const frontendManifest = require('../../frontend/package.json');
const frontendLockfile = require('../../frontend/package-lock.json');
const frontendSourceRoot = path.join(__dirname, '..', '..', 'frontend', 'src');
const { securityHeaders } = require('../../card-studio/middleware/security');

function readFrontendSource(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readFrontendSource(entryPath);
    if (/\.(?:ts|tsx)$/.test(entry.name)) return [fs.readFileSync(entryPath, 'utf8')];
    return [];
  });
}

test('frontend toolchain keeps the patched Vite, DOMPurify, and router versions', () => {
  assert.equal(frontendManifest.devDependencies.vite, '^8.1.5');
  assert.equal(frontendManifest.devDependencies['@vitejs/plugin-react'], '^6.0.4');
  assert.equal(frontendManifest.dependencies['react-router-dom'], '^7.18.2');
  assert.equal(frontendManifest.overrides.dompurify, '^3.4.13');
  for (const buildOnlyPackage of ['autoprefixer', 'postcss', 'tailwindcss', 'tailwindcss-animate']) {
    assert.equal(frontendManifest.dependencies[buildOnlyPackage], undefined, `${buildOnlyPackage} must not ship to the browser runtime`);
    assert.ok(frontendManifest.devDependencies[buildOnlyPackage], `${buildOnlyPackage} must remain available to the build`);
  }
  assert.equal(frontendLockfile.packages['node_modules/vite'].version, '8.1.5');
  assert.equal(frontendLockfile.packages['node_modules/dompurify'].version, '3.4.13');
  assert.equal(frontendLockfile.packages['node_modules/react-router-dom'].version, '7.18.2');
  assert.equal(frontendLockfile.packages['node_modules/react-router'].version, '7.18.2');
});

test('frontend stays on BrowserRouter and does not opt into unstable React Router RSC APIs', () => {
  const appSource = fs.readFileSync(path.join(frontendSourceRoot, 'App.tsx'), 'utf8');
  const allFrontendSource = readFrontendSource(frontendSourceRoot).join('\n');

  assert.match(appSource, /BrowserRouter as Router/);
  assert.doesNotMatch(allFrontendSource, /react-server-dom|react-router\/rsc|unstable_RSC/);
});

test('web and API responses deny browser capabilities that AthleteTime does not use', () => {
  const headers = new Map();
  let nextCalls = 0;
  const response = {
    setHeader: (name, value) => headers.set(name, value),
    removeHeader: (name) => headers.delete(name),
  };

  securityHeaders({ path: '/api/card-studio/analytics/records/search' }, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  assert.equal(headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate');

  const netlifyConfig = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify.toml'), 'utf8');
  assert.match(netlifyConfig, /Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)"/u);
  assert.match(netlifyConfig, /Content-Security-Policy = "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none';/u);
});
