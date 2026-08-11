const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const publicRoutes = require('../../card-studio/routes/publicRoutes');
const insightService = require('../../card-studio/services/insightService');

function containsKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([currentKey, child]) => (
    currentKey === key || containsKey(child, key)
  ));
}

async function withPublicRoutes(t, run) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(publicRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return run(`http://127.0.0.1:${server.address().port}`);
}

test('LEGACY-SEARCH-PAGE-001 Given a public legacy search When it returns context Then it does not embed every result row and provides a bounded page key', async (t) => {
  const profile = insightService.getFeaturedProfiles(1)[0];
  assert.ok(profile, 'the public fixture must contain a searchable profile');

  await withPublicRoutes(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/search?q=${encodeURIComponent(profile.name)}&type=name`);
    const body = await response.json();
    const subsection = body.data.sections
      .flatMap((section) => section.subSections)
      .find((item) => item.sectionKey);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.ok(subsection, 'a legacy search subsection must carry a page key');
    assert.match(subsection.sectionKey, /^[a-f0-9]{24}$/u);
    assert.equal(containsKey(body, 'allResults'), false);
    assert.ok(subsection.totalAthletes >= subsection.results.filter((row) => !row.isSeparator).length);
  });
});

test('LEGACY-SEARCH-PAGE-002 Given an expandable legacy search subsection When a visitor requests a page Then it returns only the requested bounded rows', async (t) => {
  const profile = insightService.getFeaturedProfiles(1)[0];
  assert.ok(profile);

  await withPublicRoutes(t, async (baseUrl) => {
    const initial = await fetch(`${baseUrl}/search?q=${encodeURIComponent(profile.name)}&type=name`)
      .then((response) => response.json());
    const subsection = initial.data.sections
      .flatMap((section) => section.subSections)
      .find((item) => item.sectionKey);
    assert.ok(subsection);

    const pageResponse = await fetch(
      `${baseUrl}/search/section?q=${encodeURIComponent(profile.name)}&type=name&section=${subsection.sectionKey}&offset=0&limit=1`,
    );
    const page = await pageResponse.json();

    assert.equal(pageResponse.status, 200);
    assert.equal(page.success, true);
    assert.equal(page.data.rows.length, 1);
    assert.equal(page.data.offset, 0);
    assert.equal(page.data.limit, 1);
    assert.equal(containsKey(page, 'allResults'), false);
  });
});

test('LEGACY-SEARCH-PAGE-003 Given an oversized page request When it reaches the public route Then the route rejects it instead of returning an expanded result set', async (t) => {
  const profile = insightService.getFeaturedProfiles(1)[0];
  assert.ok(profile);

  await withPublicRoutes(t, async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/search/section?q=${encodeURIComponent(profile.name)}&section=${'a'.repeat(24)}&limit=31`,
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });
});

test('LEGACY-SEARCH-PAGE-004 Given the legacy dashboard expands a result section When it needs more rows Then it requests bounded pages instead of embedding all rows in the initial response', () => {
  const dashboardSearch = fs.readFileSync(
    path.join(__dirname, '..', '..', 'dashboard', 'js', 'search.js'),
    'utf8',
  );

  assert.match(dashboardSearch, /data-section-key/u);
  assert.match(dashboardSearch, /loadSearchResultPage\(this, true\)/u);
  assert.match(dashboardSearch, /\/api\/card-studio\/search\/section\?/u);
  assert.doesNotMatch(dashboardSearch, /data-all=/u);
  assert.doesNotMatch(dashboardSearch, /expandSubSection\(/u);
});
