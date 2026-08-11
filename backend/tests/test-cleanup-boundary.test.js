const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const TEST_DIRECTORY = path.join(ROOT, 'backend', 'tests');

require('./release-preflight-contract.test');

function listTestFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTestFiles(filePath);
    return entry.name.endsWith('.test.js') ? [filePath] : [];
  });
}

test('TEST-CLEANUP-BOUNDARY-001: test commands and cleanup helpers never target the repository root', () => {
  const packageManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const testCommand = String(packageManifest.scripts?.test || '');

  assert.doesNotMatch(testCommand, /\bgit\s+clean\b|\bgit\s+worktree\s+remove\b|\bRemove-Item\b|\brm\s+-rf\b/u);

  const directRepositoryDeletion = /(?:fs\.rmSync|fs\.promises\.rm|fs\.rmdirSync)\(\s*(?:process\.cwd\(\)|ROOT|FRONTEND|path\.resolve\(\s*process\.cwd\(\)\s*\))/u;
  for (const filePath of listTestFiles(TEST_DIRECTORY)) {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(source, directRepositoryDeletion, `${path.relative(ROOT, filePath)} must only clean an isolated test artifact`);
  }
});
