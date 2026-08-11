const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('DESKTOP-MORE-MENU-001 Given the desktop tools disclosure When it is rendered Then its trigger and panel have a stable accessible relationship', () => {
  const header = readSource('frontend/src/components/layout/Header.tsx');
  const menu = readSource('frontend/src/components/layout/DesktopMoreMenu.tsx');

  assert.match(header, /<DesktopMoreMenu/);
  assert.match(menu, /const MENU_ID = 'desktop-more-menu'/);
  assert.match(menu, /aria-controls=\{MENU_ID\}/);
  assert.match(menu, /id=\{MENU_ID\}/);
  assert.match(menu, /aria-expanded=\{open\}/);
  assert.doesNotMatch(menu, /role="menu"/);
});

test('DESKTOP-MORE-MENU-002 Given a keyboard visitor closes the tools disclosure with Escape Then focus returns to its trigger', () => {
  const menu = readSource('frontend/src/components/layout/DesktopMoreMenu.tsx');

  assert.match(menu, /event\.key !== 'Escape'/);
  assert.match(menu, /triggerRef\.current\?\.focus/);
  assert.match(menu, /setOpen\(false\)/);
});
