const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const preflightPath = path.join(ROOT, 'scripts', 'run-release-preflight.ps1');

test('RELEASE-PREFLIGHT-001: the release helper verifies an intact repository and never deletes workspace files', () => {
  const source = fs.readFileSync(preflightPath, 'utf8');

  assert.match(source, /\$requiredPaths/u);
  assert.match(source, /git -C \$repositoryRoot rev-parse --show-toplevel/u);
  assert.match(source, /backend\/tests\/test-cleanup-boundary\.test\.js/u);
  assert.match(source, /backend\/tests\/launch-interaction-safety\.test\.js/u);
  assert.match(source, /npm\.cmd --prefix frontend run type-check/u);
  assert.match(source, /npm\.cmd --prefix frontend run build:check/u);
  assert.match(source, /\[switch\]\$IncludeBrowser/u);
  assert.doesNotMatch(source, /Remove-Item|git\s+clean|git\s+worktree\s+remove|rm\s+-rf/u);
});
