const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('PACERISE-UX-001 Given a slow first load When PaceRise remains pending Then it offers a clear retry and records route without changing results', () => {
  const page = readSource('frontend/src/pages/PaceRisePage.tsx');
  const loadingState = readSource('frontend/src/pages/pacerise/PaceRiseLoadingState.tsx');

  assert.match(page, /PaceRiseLoadingState/, 'the initial PaceRise load uses a dedicated recovery state');
  assert.match(page, /<PaceRiseLoadingState\s*\/>/, 'the recovery state is shown only while initial data is loading');
  assert.match(loadingState, /SLOW_LOAD_DELAY_MS = 5_000/, 'recovery actions wait until a load is genuinely slow');
  assert.match(loadingState, /다시 시도/, 'a person can retry without guessing what happened');
  assert.match(loadingState, /to="\/competitions\?tab=results"/, 'a person can leave for the available records route');
});
