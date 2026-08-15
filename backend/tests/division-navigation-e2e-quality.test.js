const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getSearchResults } = require('./records-flow-e2e-data');
const { navigateToReady, withRecordsPage } = require('./records-flow-e2e-fixture');
const { assertExternalNetworkIsolation } = require('./records-flow-e2e-network');

const TEST_DIR = __dirname;

test('DIVISION-NAV-QUERY Given distinct athlete queries When the fake searches Then only matching candidates are returned', () => {
  assert.deepEqual(getSearchResults('Alpha').map(({ athleteKey }) => athleteKey), [
    'alpha-2016',
    'alpha-2020',
  ]);
  assert.deepEqual(getSearchResults('Beta').map(({ athleteKey }) => athleteKey), ['beta-2016']);
  assert.deepEqual(getSearchResults('No Match'), []);
  assert.deepEqual(getSearchResults(''), []);
});

test('DIVISION-NAV-NETWORK Given the records app loads external styles When routed by the fixture Then no external request reaches the network', { timeout: 120_000 }, async () => {
  const state = await withRecordsPage(async (browserState) => {
    const { baseUrl, page } = browserState;
    const candidate = page.locator('[data-candidate-key="alpha-2016"]');
    await navigateToReady(
      page,
      `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`,
      candidate,
    );
    return browserState;
  });
  assertExternalNetworkIsolation(state);
});

test('DIVISION-NAV-HARNESS Given the browser matrix source When checked Then it uses real keyboard traversal without sleeps and stays reviewable', () => {
  const files = fs.readdirSync(TEST_DIR)
    .filter((name) => (
      name.startsWith('division-navigation-e2e')
      || name.startsWith('records-flow-e2e-fixture')
      || name.startsWith('records-flow-e2e-data')
      || name.startsWith('records-flow-e2e-network')
      || name.startsWith('records-flow-e2e-runtime')
      || name.startsWith('records-flow-e2e-evidence')
    ))
    .filter((name) => name.endsWith('.js') && name !== path.basename(__filename));
  const sources = files.map((name) => ({
    name,
    source: fs.readFileSync(path.join(TEST_DIR, name), 'utf8'),
  }));

  for (const { name, source } of sources) {
    const pureLoc = source.split(/\r?\n/u)
      .filter((line) => line.trim() && !line.trimStart().startsWith('//')).length;
    assert.ok(pureLoc <= 250, `${name} has ${pureLoc} pure LOC`);
    assert.doesNotMatch(source, /waitForTimeout\s*\(/u, `${name} uses a fixed browser sleep`);
  }

  const matrixSource = sources
    .filter(({ name }) => name.startsWith('division-navigation-e2e'))
    .map(({ source }) => source)
    .join('\n');
  assert.doesNotMatch(matrixSource, /\.focus\s*\(/u);
  assert.match(matrixSource, /keyboard\.press\([^\n]*(?:Tab|Shift\+Tab)/u);
  assert.match(matrixSource, /:focus-visible/u);
});
