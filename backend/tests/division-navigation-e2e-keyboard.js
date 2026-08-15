const assert = require('node:assert/strict');

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

async function reachFocusVisible(page, locator, direction = 'forward') {
  await resetKeyboardStart(page);
  const focusableCount = await page.locator(FOCUSABLE_SELECTOR).count();
  const stepLimit = Math.max(focusableCount + 1, 1);
  for (let step = 1; step <= stepLimit; step += 1) {
    if (direction === 'reverse') {
      await page.keyboard.press('Shift+Tab');
    } else {
      await page.keyboard.press('Tab');
    }
    if (await isFocusVisible(locator)) {
      const accessibleName = await readAccessibleName(locator);
      assert.ok(accessibleName, 'keyboard target should expose an accessible name');
      return { accessibleName, direction, steps: step };
    }
  }
  assert.fail(`target did not receive :focus-visible after ${stepLimit} ${direction} steps`);
}

async function resetKeyboardStart(page) {
  await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      activeElement.blur();
    }
  });
  await page.waitForFunction(() => document.activeElement === document.body);
}

async function activateFocused(page, locator, key = 'Enter') {
  assert.equal(await isFocusVisible(locator), true, 'activation target should remain focus-visible');
  await page.keyboard.press(key);
}

async function isFocusVisible(locator) {
  return locator.evaluate((element) => (
    document.activeElement === element && element.matches(':focus-visible')
  ));
}

async function readAccessibleName(locator) {
  return locator.evaluate((element) => {
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const label = labelledBy.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ');
      if (label) return label;
    }
    if ('labels' in element && element.labels) {
      const label = [...element.labels]
        .map((item) => item.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ');
      if (label) return label;
    }
    return element.textContent?.trim() || '';
  });
}

module.exports = { activateFocused, reachFocusVisible };
