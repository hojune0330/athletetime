const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const identityResolver = require('../../card-studio/services/identityResolver');
const KEY_A = '1111111111111111';
const KEY_B = '2222222222222222';

function createFixtureResolver(t, entries, version = 2) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-identity-'));
  const mapPath = path.join(dir, 'athlete-map.json');
  fs.writeFileSync(mapPath, JSON.stringify({ version, entries }), 'utf8');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return identityResolver.createResolver({ mapPath, statTtlMs: 0 });
}

function validEntry(overrides = {}) {
  return {
    canonicalId: 'at_verified_group_a',
    matchConfidence: 0.95,
    decisionBasis: 'manual_verified',
    sourceRefs: ['ledger:manual-review-001'],
    matchedAthleteKeys: [KEY_A, KEY_B],
    ...overrides,
  };
}

test('identity resolver exposes an injectable resolver without changing the production map', () => {
  // Given: the production singleton module.
  // When: its testable boundary is inspected.
  // Then: a path-injected resolver factory is available.
  assert.equal(typeof identityResolver.createResolver, 'function');
});

test('identity resolver returns null when the map is empty', (t) => {
  // Given: an empty identity map.
  const resolver = createFixtureResolver(t, []);

  // When: a public athlete key is resolved.
  const resolved = resolver.resolve({ athleteKey: KEY_A });

  // Then: the public key remains ungrouped.
  assert.equal(resolved, null);
  assert.deepEqual(resolver.getStatus(), {
    enabled: false,
    mappedAthleteKeys: 0,
    matchKeys: 0,
    canonicalGroups: 0,
    rejectedEntries: 0,
    mtimeMs: resolver.getStatus().mtimeMs,
    threshold: identityResolver.AUTO_MERGE_THRESHOLD,
  });
});

test('identity resolver accepts only a manually verified evidence-backed mapping', (t) => {
  // Given: one explicitly reviewed canonical group.
  const resolver = createFixtureResolver(t, [validEntry()]);

  // When: a reviewed public key is resolved.
  const resolved = resolver.resolve({ athleteKey: KEY_B });

  // Then: the reviewed canonical group is returned.
  assert.equal(resolved, 'at_verified_group_a');
  assert.equal(resolver.getStatus().canonicalGroups, 1);
});

test('identity resolver rejects mappings from a legacy schema version', (t) => {
  // Given: a valid-looking entry wrapped in the retired schema version.
  const resolver = createFixtureResolver(t, [validEntry()], 1);

  // When: a reviewed public key is resolved.
  const resolved = resolver.resolve({ athleteKey: KEY_A });

  // Then: the legacy map cannot activate identity grouping.
  assert.equal(resolved, null);
  assert.equal(resolver.getStatus().canonicalGroups, 0);
});

test('identity resolver rejects missing non-finite and out-of-range confidence', (t) => {
  // Given: mappings with unsafe confidence values.
  const unsafeValues = [undefined, Number.NaN, Number.POSITIVE_INFINITY, 0.8499, 1.01];

  for (const [index, matchConfidence] of unsafeValues.entries()) {
    const athleteKey = index.toString(16).padStart(16, '0');
    const entry = validEntry({
      canonicalId: `at_unsafe_confidence_${index}`,
      matchedAthleteKeys: [athleteKey],
    });
    if (matchConfidence === undefined) {
      delete entry.matchConfidence;
    } else {
      entry.matchConfidence = matchConfidence;
    }
    const resolver = createFixtureResolver(t, [entry]);

    // When: the untrusted mapping is resolved.
    const resolved = resolver.resolve({ athleteKey });

    // Then: no canonical group is returned.
    assert.equal(resolved, null);
  }
});

test('identity resolver rejects missing review basis or source evidence', (t) => {
  // Given: mappings missing a required review fact.
  const entries = [
    validEntry({ canonicalId: 'at_no_basis', decisionBasis: undefined }),
    validEntry({ canonicalId: 'at_wrong_basis', decisionBasis: 'automatic_guess' }),
    validEntry({ canonicalId: 'at_no_sources', sourceRefs: [] }),
    validEntry({ canonicalId: 'at_blank_sources', sourceRefs: ['  '] }),
  ];
  entries.forEach((entry, index) => {
    entry.matchedAthleteKeys = [(index + 10).toString(16).padStart(16, '0')];
  });
  const resolver = createFixtureResolver(t, entries);

  // When: every unsupported mapping is resolved.
  const resolved = entries.map((_, index) => (
    resolver.resolve({ athleteKey: (index + 10).toString(16).padStart(16, '0') })
  ));

  // Then: none of them is grouped.
  assert.deepEqual(resolved, [null, null, null, null]);
});

test('identity resolver never resolves a name and team match key', (t) => {
  // Given: a reviewed entry that also contains a legacy name-team match key.
  const resolver = createFixtureResolver(t, [
    validEntry({ matchKeys: ['홍길동|서울고'] }),
  ]);

  // When: only the legacy name-team string is supplied.
  const resolved = resolver.resolve({ matchKey: '홍길동|서울고' });

  // Then: the string cannot create a canonical identity.
  assert.equal(resolved, null);
  assert.equal(resolver.resolve({ athleteKey: KEY_A }), null);
  assert.equal(resolver.getStatus().matchKeys, 0);
});

test('identity resolver rejects all groups sharing one public athlete key', (t) => {
  // Given: two reviewed groups claiming the same public key.
  const resolver = createFixtureResolver(t, [
    validEntry({
      canonicalId: 'at_conflict_a',
      matchedAthleteKeys: ['3333333333333333', '4444444444444444'],
    }),
    validEntry({
      canonicalId: 'at_conflict_b',
      matchedAthleteKeys: ['3333333333333333', '5555555555555555'],
    }),
  ]);

  // When: any key from either conflicting group is resolved.
  const resolved = ['3333333333333333', '4444444444444444', '5555555555555555'].map((athleteKey) => (
    resolver.resolve({ athleteKey })
  ));

  // Then: both groups fail closed.
  assert.deepEqual(resolved, [null, null, null]);
  assert.equal(resolver.getStatus().rejectedEntries, 2);
});

test('identity resolver rejects duplicate canonical group declarations', (t) => {
  // Given: two entries declaring the same canonical group.
  const resolver = createFixtureResolver(t, [
    validEntry({
      canonicalId: 'at_duplicate_group',
      matchedAthleteKeys: ['6666666666666666'],
    }),
    validEntry({
      canonicalId: 'at_duplicate_group',
      matchedAthleteKeys: ['7777777777777777'],
    }),
  ]);

  // When: either key is resolved.
  const resolved = ['6666666666666666', '7777777777777777'].map((athleteKey) => (
    resolver.resolve({ athleteKey })
  ));

  // Then: neither declaration is trusted.
  assert.deepEqual(resolved, [null, null]);
  assert.equal(resolver.getStatus().canonicalGroups, 0);
});

test('identity resolver status never exposes source evidence or athlete labels', (t) => {
  // Given: a valid entry containing an internal review reference.
  const resolver = createFixtureResolver(t, [validEntry()]);

  // When: the diagnostic status is serialized.
  const serialized = JSON.stringify(resolver.getStatus());

  // Then: it contains counts only.
  assert.doesNotMatch(serialized, /manual-review-001|1111111111111111/);
});

test('identity resolver rejects entries carrying labels or external identity fields', (t) => {
  // Given: otherwise valid mappings that persist a forbidden identity field.
  const forbiddenFields = [
    ['displayName', '홍길동'],
    ['affiliations', [{ year: 2026, team: '서울고' }]],
    ['personNo', 'external-123'],
    ['person_no', 'external-123'],
    ['birthDate', '2010-01-01'],
    ['sourceUrl', 'https://example.com/player/123'],
  ];
  const entries = forbiddenFields.map(([field, value], index) => validEntry({
    canonicalId: `at_forbidden_field_${index}`,
    matchedAthleteKeys: [(index + 20).toString(16).padStart(16, '0')],
    [field]: value,
  }));
  const resolver = createFixtureResolver(t, entries);

  // When: each mapping carrying extra identity data is resolved.
  const resolved = entries.map((_, index) => (
    resolver.resolve({ athleteKey: (index + 20).toString(16).padStart(16, '0') })
  ));

  // Then: strict entry parsing rejects every mapping.
  assert.deepEqual(resolved, forbiddenFields.map(() => null));
  assert.equal(resolver.getStatus().rejectedEntries, forbiddenFields.length);
});

test('identity resolver rejects direct source URLs and malformed public keys', (t) => {
  // Given: mappings that bypass the source ledger or public-key format.
  const entries = [
    validEntry({
      canonicalId: 'at_direct_source_url',
      sourceRefs: ['https://example.com/player/123'],
      matchedAthleteKeys: ['8888888888888888'],
    }),
    validEntry({
      canonicalId: 'at_raw_identity_key',
      matchedAthleteKeys: ['홍길동|서울고'],
    }),
  ];
  const resolver = createFixtureResolver(t, entries);

  // When: their candidate keys are resolved.
  const resolved = [
    resolver.resolve({ athleteKey: '8888888888888888' }),
    resolver.resolve({ athleteKey: '홍길동|서울고' }),
  ];

  // Then: neither entry is indexed.
  assert.deepEqual(resolved, [null, null]);
  assert.equal(resolver.getStatus().rejectedEntries, 2);
});
