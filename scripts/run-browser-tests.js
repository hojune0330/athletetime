const { spawnSync } = require('node:child_process');
const { EVIDENCE_DIR } = require('../backend/tests/division-navigation-e2e-config');

const pr88BrowserTests = [
  'backend/tests/records-mine-season-race-e2e.test.js',
  'backend/tests/division-navigation-e2e.test.js',
  'backend/tests/launch-interaction-safety.test.js',
];

const legacyBrowserTests = [
  'backend/tests/records-flow-e2e.test.js',
  'backend/tests/records-recovery-e2e.test.js',
  'backend/tests/records-workspace-e2e.test.js',
  'backend/tests/record-device-data-e2e.test.js',
  'backend/tests/data-request-boundary-e2e.test.js',
  'backend/tests/records-mobile-dock-e2e.test.js',
  'backend/tests/pace-calculator-first-use-e2e.test.js',
  'backend/tests/pacerise-loading-recovery-e2e.test.js',
];

function runTests(testFiles, env) {
  const result = spawnSync(process.execPath, [
    '--test',
    '--test-concurrency=1',
    ...testFiles,
  ], {
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const legacyEnv = { ...process.env };
delete legacyEnv.WRITE_E2E_EVIDENCE;
delete legacyEnv.RECORDS_E2E_EVIDENCE_DIR;
const legacyStatus = runTests(legacyBrowserTests, legacyEnv);
if (legacyStatus !== 0) {
  process.exitCode = legacyStatus;
} else {
  process.exitCode = runTests(
    pr88BrowserTests,
    {
      ...process.env,
      RECORDS_BROWSER_TESTS: '1',
      RECORDS_E2E_EVIDENCE_DIR: process.env.RECORDS_E2E_EVIDENCE_DIR || EVIDENCE_DIR,
      WRITE_E2E_EVIDENCE: '1',
    },
  );
}
