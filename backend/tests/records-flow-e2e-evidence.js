const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function shouldWriteEvidence(value = process.env.WRITE_E2E_EVIDENCE) {
  return value === '1';
}

function writeEvidence(state, evidence) {
  if (!shouldWriteEvidence()) return;
  const evidenceDir = process.env.RECORDS_E2E_EVIDENCE_DIR
    || path.join(ROOT, '.omo', 'evidence', 'track-j-records-e2e-replacement');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const evidencePath = path.join(
    evidenceDir,
    evidence.fileName || 'records-flow-e2e-results.json',
  );
  fs.writeFileSync(evidencePath, JSON.stringify({
    generatedAt,
    runtime: process.version,
    scenario: evidence.scenario || 'records flow e2e',
    invocation: evidence.invocation || 'node --test backend/tests/records-flow-e2e.test.js',
    baseUrl: state.baseUrl,
    viewport: state.viewport,
    visited: state.visited,
    apiRequests: state.apiRequests,
    externalAttempts: state.externalAttempts,
    externalInterceptions: state.externalInterceptions,
    externalNetworkRequests: state.externalNetworkRequests,
    captures: state.captureArtifacts,
    captureWindow: captureWindow(state.captureArtifacts),
    consoleErrors: state.consoleErrors,
    pageErrors: state.pageErrors,
  }, null, 2));
}

function captureWindow(captures) {
  if (captures.length === 0) return null;
  return {
    firstCapturedAt: captures[0].capturedAt,
    lastCapturedAt: captures.at(-1).capturedAt,
  };
}

module.exports = { shouldWriteEvidence, writeEvidence };
