const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

test('profile page keeps nullable session users outside form state updates', () => {
  const source = fs.readFileSync(path.join(ROOT, 'frontend/src/pages/ProfilePage.tsx'), 'utf8');

  assert.match(source, /const user = response\.user;/);
  assert.match(source, /if \(response\.success && user\) \{[\s\S]*?email: user\.email,[\s\S]*?nickname: user\.nickname/);
  assert.match(source, /\} else \{\s*navigate\('\/'\);/);
});
