const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EVIDENCE_DIR, ROOT } = require('./division-navigation-e2e-config');
const { expectVisible } = require('./records-flow-e2e-fixture');
const { sanitizeUrl } = require('./records-flow-e2e-evidence');

async function capturePage(state, captureSpec) {
  const { anchor, captures, scenario } = captureSpec;
  const { page, viewport, visited } = state;
  await expectVisible(anchor);
  await anchor.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (
    document.readyState === 'complete' && document.fonts.status === 'loaded'
  ));
  await anchor.evaluate(async (element) => {
    const animations = element.getAnimations({ subtree: true });
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(
    geometry.innerWidth,
    viewport.width,
    `${scenario} changed the layout viewport: ${geometry.innerWidth} !== ${viewport.width}`,
  );
  assert.ok(
    geometry.scrollWidth <= geometry.innerWidth,
    `${scenario} overflowed horizontally: ${geometry.scrollWidth} > ${geometry.innerWidth}`,
  );
  const fileName = `task-5-${viewport.width}x${viewport.height}-${scenario}.png`;
  const screenshotPath = path.join(EVIDENCE_DIR, fileName);
  await page.screenshot({ path: screenshotPath });
  assert.deepEqual(readPngSize(screenshotPath), viewport);
  const capturedAt = fs.statSync(screenshotPath).mtime.toISOString();
  const screenshot = path.relative(ROOT, screenshotPath).replaceAll('\\', '/');
  const capture = {
    scenario,
    viewport,
    url: sanitizeUrl(page.url()),
    screenshot,
    geometry,
    capturedAt,
  };
  visited.push(page.url());
  state.captureArtifacts.push({ scenario, screenshot, capturedAt });
  captures.push(capture);
}

function readPngSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

module.exports = { capturePage, readPngSize };
