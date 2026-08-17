const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const browserBoundary = ' && node --test ';
const testCommand = packageJson.scripts.test;
const boundaryIndex = testCommand.indexOf(browserBoundary);

assert.ok(boundaryIndex > 0, 'root test script must separate browser tests with an explicit boundary');
const unitCommand = testCommand.slice(0, boundaryIndex).trim().split(/\s+/u);
assert.equal(unitCommand.shift(), 'node');
const result = spawnSync(process.execPath, unitCommand, {
  cwd: root,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
