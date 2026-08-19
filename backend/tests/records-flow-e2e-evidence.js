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
    loopbackOnly: true,
    viewport: state.viewport,
    visited: state.visited.map(sanitizeUrl),
    apiRequests: state.apiRequests.map(sanitizeUrl),
    externalAttempts: state.externalAttempts.map((attempt) => ({
      ...attempt,
      url: sanitizeUrl(attempt.url),
    })),
    externalInterceptions: state.externalInterceptions.map((attempt) => ({
      ...attempt,
      url: sanitizeUrl(attempt.url),
    })),
    externalNetworkRequests: state.externalNetworkRequests.map((request) => ({
      ...request,
      url: sanitizeUrl(request.url),
    })),
    captures: state.captureArtifacts,
    captureWindow: captureWindow(state.captureArtifacts),
    consoleErrors: state.consoleErrors,
    pageErrors: state.pageErrors,
  }, null, 2));
}

function writeCleanupReceipt() {
  if (!shouldWriteEvidence()) return;
  const evidenceDir = process.env.RECORDS_E2E_EVIDENCE_DIR
    || path.join(ROOT, '.omo', 'evidence', 'track-j-records-e2e-replacement');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'cleanup-receipt.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    runtime: process.version,
    loopbackOnly: true,
    browserContextClosed: true,
    browserClosed: true,
    viteProcessStopped: true,
    apiServerClosed: true,
  }, null, 2)}\n`);
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value, 'http://loopback.invalid');
    const pathName = url.pathname
      .replace(/\/athletes\/[^/]+(?=\/|$)/u, '/athletes/[redacted]')
      .replace(/\/teams\/[^/]+(?=\/|$)/u, '/teams/[redacted]');
    const queryKeys = [...new Set(url.searchParams.keys())].sort();
    return `${pathName}${queryKeys.length ? `?${queryKeys.map((key) => `${key}=[redacted]`).join('&')}` : ''}`;
  } catch {
    return '[invalid-url]';
  }
}

function captureWindow(captures) {
  if (captures.length === 0) return null;
  return {
    firstCapturedAt: captures[0].capturedAt,
    lastCapturedAt: captures.at(-1).capturedAt,
  };
}

module.exports = { sanitizeUrl, shouldWriteEvidence, writeCleanupReceipt, writeEvidence };
