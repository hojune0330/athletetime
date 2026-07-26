const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dependencyManifest = require('../../package.json');
const rootDirectory = path.resolve(__dirname, '..', '..');
const netlifyConfiguration = fs.readFileSync(path.join(rootDirectory, 'netlify.toml'), 'utf8');
const launchFiles = [
  'src/scraper.js',
  'src/screenshot.js',
  'src/services/adminContentService.js',
  'src/services/profileCardService.js',
  'card-studio/scraper.js',
  'card-studio/screenshot.js',
  'card-studio/services/adminContentService.js',
  'card-studio/services/profileCardService.js',
];

test('Puppeteer uses the supported v25 dependency line', () => {
  assert.equal(dependencyManifest.dependencies.puppeteer, '^25.3.0');
  assert.equal(dependencyManifest.engines.node, '>=22.12.0');
  assert.match(netlifyConfiguration, /NODE_VERSION = "22\.17\.1"/);
});

test('browser rendering uses the current supported headless option everywhere', () => {
  for (const relativePath of launchFiles) {
    const source = fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8');

    assert.doesNotMatch(source, /headless:\s*'new'/, relativePath);
    assert.match(source, /headless:\s*true/, relativePath);
  }
});
