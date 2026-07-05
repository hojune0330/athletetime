const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const netlifyPath = path.join(repoRoot, 'netlify.toml');
const netlifyToml = fs.readFileSync(netlifyPath, 'utf8');

const apiRedirectIndex = netlifyToml.indexOf('from = "/api/*"');
const spaRedirectIndex = netlifyToml.indexOf('from = "/*"');

if (apiRedirectIndex === -1) {
  fail('netlify.toml에 /api/* redirect가 없습니다.');
} else {
  pass('netlify.toml /api/* redirect 확인');
}

if (spaRedirectIndex === -1) {
  fail('netlify.toml에 SPA catch-all redirect가 없습니다.');
} else {
  pass('netlify.toml SPA catch-all redirect 확인');
}

if (apiRedirectIndex !== -1 && spaRedirectIndex !== -1 && apiRedirectIndex > spaRedirectIndex) {
  fail('/api/* redirect가 SPA catch-all보다 뒤에 있습니다.');
} else if (apiRedirectIndex !== -1 && spaRedirectIndex !== -1) {
  pass('/api/* redirect가 SPA catch-all보다 먼저 적용됩니다.');
}

if (!netlifyToml.includes('https://athletetime-backend.onrender.com/api/:splat')) {
  fail('Netlify API proxy 대상이 athletetime-backend Render API와 일치하지 않습니다.');
} else {
  pass('Netlify API proxy 대상 확인');
}
