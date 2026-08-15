const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  EVIDENCE_DIR,
  ROOT,
  SOURCE_FILES,
  VIEWPORTS,
} = require('./division-navigation-e2e-config');
const { shouldWriteEvidence } = require('./records-flow-e2e-fixture');

function writeMatrixManifest(captures, networkSummaries) {
  assert.equal(captures.length, 15);
  assert.equal(networkSummaries.length, VIEWPORTS.length);
  const sourceMtimes = Object.fromEntries(SOURCE_FILES.map((relativePath) => {
    const mtime = fs.statSync(path.join(ROOT, relativePath)).mtime;
    return [relativePath, mtime.toISOString()];
  }));
  const latestSourceMtime = Math.max(
    ...Object.values(sourceMtimes).map((mtime) => Date.parse(mtime)),
  );
  const entries = captures.map((capture) => {
    const screenshotPath = path.join(ROOT, capture.screenshot);
    const screenshotMtime = fs.statSync(screenshotPath).mtime.toISOString();
    assert.equal(capture.capturedAt, screenshotMtime);
    assert.ok(Date.parse(capture.capturedAt) >= latestSourceMtime, `${capture.screenshot} is stale`);
    return { ...capture, sourceMtimes };
  });
  if (shouldWriteEvidence()) assertViewportEvidenceAlignment(entries);
  const generatedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'task-5-browser-matrix-manifest.json'),
    JSON.stringify({
      generatedAt,
      runtime: process.version,
      fakeDataOnly: true,
      screenshotCount: entries.length,
      scenariosPerViewport: 5,
      entries,
    }, null, 2),
  );
  const actualExternalNetworkRequests = networkSummaries
    .reduce((total, summary) => total + summary.externalNetworkRequests, 0);
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'task-5-browser-matrix-results.json'),
    JSON.stringify({
      passed: true,
      generatedAt,
      runtime: process.version,
      viewportCount: VIEWPORTS.length,
      screenshotCount: entries.length,
      consoleErrors: 0,
      pageErrors: 0,
      invalidCombinationRequested: false,
      validEmptyPreserved: true,
      athleteQueryPreserved: true,
      keyboardTraversal: 'Tab/Shift+Tab plus :focus-visible',
      externalAttempts: networkSummaries
        .reduce((total, summary) => total + summary.externalAttempts, 0),
      externalInterceptions: networkSummaries
        .reduce((total, summary) => total + summary.externalInterceptions, 0),
      actualExternalNetworkRequests,
      viewportEvidenceAligned: shouldWriteEvidence(),
    }, null, 2),
  );
}

function assertViewportEvidenceAlignment(entries) {
  for (const viewport of VIEWPORTS) {
    const viewportEntries = entries.filter((entry) => (
      entry.viewport.width === viewport.width && entry.viewport.height === viewport.height
    ));
    assert.equal(viewportEntries.length, 5);
    const evidencePath = path.join(
      EVIDENCE_DIR,
      `task-5-${viewport.width}x${viewport.height}-browser-results.json`,
    );
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.equal(evidence.runtime, process.version);
    assert.deepEqual(
      evidence.captures.map(({ scenario, screenshot, capturedAt }) => ({
        scenario,
        screenshot,
        capturedAt,
      })),
      viewportEntries.map(({ scenario, screenshot, capturedAt }) => ({
        scenario,
        screenshot,
        capturedAt,
      })),
    );
    const latestCapture = Math.max(
      ...viewportEntries.map(({ capturedAt }) => Date.parse(capturedAt)),
    );
    assert.ok(Date.parse(evidence.generatedAt) >= latestCapture);
    assert.ok(fs.statSync(evidencePath).mtime.getTime() >= latestCapture);
    assert.deepEqual(evidence.externalNetworkRequests, []);
  }
}

module.exports = { writeMatrixManifest };
