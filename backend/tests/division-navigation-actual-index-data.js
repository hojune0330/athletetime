const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function selectionKey(selection) {
  return `${selection.season}\0${selection.eventKey}\0${selection.divisionKey}`;
}

function sameSelection(left, right) {
  return left.season === right.season
    && left.eventKey === right.eventKey
    && left.divisionKey === right.divisionKey;
}

function findNearestSelection(filters, selection) {
  let nearest = null;
  for (const candidate of filters.availableSeasonCombinations) {
    if (
      candidate.eventKey !== selection.eventKey
      || candidate.divisionKey !== selection.divisionKey
      || candidate.season === selection.season
    ) continue;
    if (
      !nearest
      || Math.abs(candidate.season - selection.season)
        < Math.abs(nearest.season - selection.season)
    ) nearest = candidate;
  }
  return nearest;
}

function selectActualIndexScenarios(analytics) {
  const filters = analytics.getFilters();
  const advertised = filters.availableSeasonCombinations;
  assert.ok(advertised.length > 0, 'actual availability must not be empty');
  const genuineValidEmptyTuplePresent = advertised.some((selection) => (
    analytics.getSeasonRecords({ ...selection, limit: 100 }).rows.length === 0
  ));

  const advertisedKeys = new Set(advertised.map(selectionKey));
  let invalidSelection = null;
  outer: for (const season of filters.seasons) {
    for (const event of filters.events) {
      for (const division of filters.divisions) {
        const candidate = { season, eventKey: event.key, divisionKey: division.key };
        if (!advertisedKeys.has(selectionKey(candidate))) {
          invalidSelection = candidate;
          break outer;
        }
      }
    }
  }
  assert.ok(invalidSelection, 'an absent deep-link combination is required');

  let recoveryPair = null;
  for (const emptySelection of advertised) {
    const recoverySelection = findNearestSelection(filters, emptySelection);
    if (!recoverySelection) continue;
    const initialRows = analytics.getSeasonRecords({ ...emptySelection, limit: 100 }).rows;
    const recoveredRows = analytics.getSeasonRecords({ ...recoverySelection, limit: 100 }).rows;
    if (initialRows.length > 0 && recoveredRows.length > 0) {
      recoveryPair = { emptySelection, recoverySelection };
      break;
    }
  }
  assert.ok(recoveryPair, 'a real nearest-season recovery pair is required');
  return { filters, genuineValidEmptyTuplePresent, invalidSelection, recoveryPair };
}

function fingerprintFiles(root, relativePaths) {
  const hash = crypto.createHash('sha256');
  for (const relativePath of [...relativePaths].sort()) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(root, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex').toUpperCase();
}

function assertProductionBundleFresh(root, frontendSources) {
  const indexPath = path.join(root, 'community', 'index.html');
  assert.ok(fs.existsSync(indexPath), 'production index is missing');
  const newestSource = Math.max(...frontendSources.map((relativePath) => (
    fs.statSync(path.join(root, relativePath)).mtimeMs
  )));
  assert.ok(fs.statSync(indexPath).mtimeMs >= newestSource, 'production bundle is stale');
  const recordAssets = fs.readdirSync(path.join(root, 'community', 'assets'))
    .filter((name) => /^page-records-.*\.js$/u.test(name))
    .map((name) => path.join('community', 'assets', name));
  assert.equal(recordAssets.length, 1, 'one records production asset is required');
  return fingerprintFiles(root, ['community/index.html', ...recordAssets]);
}

module.exports = {
  assertProductionBundleFresh,
  fingerprintFiles,
  sameSelection,
  selectActualIndexScenarios,
  selectionKey,
};
