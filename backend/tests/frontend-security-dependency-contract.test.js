const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const frontendManifest = require('../../frontend/package.json');
const frontendLockfile = require('../../frontend/package-lock.json');
const frontendSourceRoot = path.join(__dirname, '..', '..', 'frontend', 'src');

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
