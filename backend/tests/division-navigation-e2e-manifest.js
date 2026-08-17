const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  EVIDENCE_DIR,
  ROOT,
  SOURCE_FILES,
  VIEWPORTS,
} = require('./division-navigation-e2e-config');

const EXPECTED_SCENARIOS = [
  'athlete-candidate-search',
  'athlete-record-provenance',
  'valid-season-navigation',
  'invalid-url-valid-empty-recovery',
  'team-search-affiliation-wording',
];

function fingerprintSources() {
  const hash = crypto.createHash('sha256');
  for (const relativePath of [...SOURCE_FILES].sort()) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex').toUpperCase();
}

function assertViewport(viewport, expected, label) {
  assert.deepEqual(viewport, expected, `${label} viewport does not match the matrix`);
}

function assertCapture(capture, expectedViewport, label) {
  assert.ok(EXPECTED_SCENARIOS.includes(capture.scenario), `${label} has an unknown scenario`);
  assertViewport(capture.viewport, expectedViewport, label);
  const screenshotPath = path.join(ROOT, capture.screenshot);
  assert.ok(fs.existsSync(screenshotPath), `${capture.screenshot} is missing`);
  assert.equal(capture.capturedAt, fs.statSync(screenshotPath).mtime.toISOString());
}

function validateViewportEvidence(expectedViewport) {
  const filePath = path.join(
    EVIDENCE_DIR,
    `task-5-${expectedViewport.width}x${expectedViewport.height}-browser-results.json`,
  );
  assert.ok(fs.existsSync(filePath), `${filePath} is missing`);
  const evidence = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(evidence.runtime, process.version, `${filePath} runtime mismatch`);
  assertViewport(evidence.viewport, expectedViewport, filePath);
  assert.deepEqual(
    evidence.captures.map(({ scenario }) => scenario),
    EXPECTED_SCENARIOS,
    `${filePath} must contain exactly the five named scenarios in order`,
  );
  assert.deepEqual(evidence.consoleErrors, [], `${filePath} has console errors`);
  assert.deepEqual(evidence.pageErrors, [], `${filePath} has page errors`);
  assert.deepEqual(evidence.externalNetworkRequests, [], `${filePath} has external network requests`);
  for (const capture of evidence.captures) {
    assertCapture({ ...capture, viewport: capture.viewport || expectedViewport }, expectedViewport, filePath);
  }
  return evidence;
}

function writeMatrixManifest(captures, networkSummaries) {
  assert.equal(networkSummaries.length, VIEWPORTS.length);
  assert.equal(captures.length, VIEWPORTS.length * EXPECTED_SCENARIOS.length);
  const entries = captures.map((capture) => capture);
  const pairs = new Set();
  for (const capture of entries) {
    const expectedViewport = VIEWPORTS.find((viewport) => (
      viewport.width === capture.viewport?.width
      && viewport.height === capture.viewport?.height
    ));
    assert.ok(expectedViewport, 'capture viewport is not part of the matrix');
    assertCapture(capture, expectedViewport, 'matrix capture');
    const pair = `${expectedViewport.width}x${expectedViewport.height}:${capture.scenario}`;
    assert.equal(pairs.has(pair), false, `duplicate capture pair: ${pair}`);
    pairs.add(pair);
  }
  for (const viewport of VIEWPORTS) {
    const expectedPairs = EXPECTED_SCENARIOS.map((scenario) => `${viewport.width}x${viewport.height}:${scenario}`);
    assert.deepEqual(
      expectedPairs.filter((pair) => pairs.has(pair)),
      expectedPairs,
      `viewport ${viewport.width}x${viewport.height} is incomplete`,
    );
    validateViewportEvidence(viewport);
  }
  assert.deepEqual(
    networkSummaries.map(({ viewport }) => viewport),
    VIEWPORTS,
    'network summaries must cover each viewport exactly once',
  );
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'task-5-browser-matrix-manifest.json'),
    JSON.stringify({
      generatedAt,
      runtime: process.version,
      loopbackOnly: true,
      sourceFingerprint: fingerprintSources(),
      viewportCount: VIEWPORTS.length,
      screenshotCount: entries.length,
      scenarios: EXPECTED_SCENARIOS,
      entries,
      network: networkSummaries,
    }, null, 2),
  );
}

module.exports = { EXPECTED_SCENARIOS, validateViewportEvidence, writeMatrixManifest };
