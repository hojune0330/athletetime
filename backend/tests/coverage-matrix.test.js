const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildCoverageMatrix,
  renderCoverageMatrixMarkdown,
} = require('../../card-studio/services/coverageMatrixService');

function makeTempDataRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-coverage-'));
  fs.mkdirSync(path.join(root, 'competitions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'results'), { recursive: true });
  return root;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('Given an empty data root When building 2005 to 2006 coverage Then both years are not started with zero totals', () => {
  const root = makeTempDataRoot();
  try {
    const matrix = buildCoverageMatrix({
      dataRoot: root,
      fromYear: 2005,
      toYear: 2006,
      generatedAt: '2026-07-14T00:00:00.000Z',
    });

    assert.match(matrix.truthStatement.headline, /2005/);
    assert.equal(matrix.summary.resultBundleCount, 0);
    assert.equal(matrix.summary.eventCount, 0);
    assert.equal(matrix.summary.resultRowCount, 0);
    assert.equal(matrix.summary.notStartedYears, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Given 2010 to current request When local data starts in 2018 Then missing years and partial current year are explicit', () => {
  const root = makeTempDataRoot();
  try {
    writeJson(path.join(root, 'competitions', '2018.json'), [{ id: 'c1' }, { id: 'c2' }]);
    writeJson(path.join(root, 'results', '2018.json'), [{ competitionId: 'c1' }, { competitionId: 'c2' }]);
    writeJson(path.join(root, 'competitions', '2026.json'), [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    writeJson(path.join(root, 'results', '2026.json'), [{ competitionId: 'a' }]);

    const matrix = buildCoverageMatrix({
      dataRoot: root,
      fromYear: 2010,
      toYear: 2026,
      generatedAt: '2026-06-25T00:00:00.000Z',
    });

    assert.equal(matrix.summary.totalYears, 17);
    assert.equal(matrix.summary.earliestLocalCompetitionYear, 2018);
    assert.equal(matrix.summary.earliestLocalResultYear, 2018);
    assert.equal(matrix.truthStatement.hasAllCompetitionResultsFromRequestedRange, false);

    const year2010 = matrix.years.find((year) => year.year === 2010);
    const year2018 = matrix.years.find((year) => year.year === 2018);
    const year2026 = matrix.years.find((year) => year.year === 2026);

    assert.equal(year2010.status, 'not_started');
    assert.equal(year2010.evidenceTag, 'NO_LOCAL_COMPETITION_OR_RESULT_FILE');
    assert.equal(year2018.status, 'locally_aligned_not_global_proof');
    assert.equal(year2018.warning, 'LOCAL_LIST_MATCHES_RESULTS_BUT_NOT_GLOBAL_COMPLETENESS');
    assert.equal(year2026.status, 'partial_local_gap');
    assert.equal(year2026.missingLocalResultBundles, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Given a requested start year and result rows When building coverage Then headline and summary use the requested evidence', () => {
  const root = makeTempDataRoot();
  try {
    writeJson(path.join(root, 'results', '2015.json'), [
      {
        competitionId: 'legacy-a',
        events: [
          { event: '100m', results: [{ name: 'A' }, { name: 'B' }] },
          { event: '200m', results: [{ name: 'C' }] },
        ],
      },
    ]);
    writeJson(path.join(root, 'results', '2016.json'), [
      {
        competitionId: 'legacy-b',
        events: [{ event: '400m', results: [{ name: 'D' }] }],
      },
      { competitionId: 'legacy-c', events: [] },
    ]);

    const matrix = buildCoverageMatrix({
      dataRoot: root,
      fromYear: 2015,
      toYear: 2016,
      generatedAt: '2026-07-14T00:00:00.000Z',
    });

    assert.match(matrix.truthStatement.headline, /2015년부터/);
    assert.equal(matrix.summary.resultBundleCount, 3);
    assert.equal(matrix.summary.eventCount, 3);
    assert.equal(matrix.summary.resultRowCount, 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Given markdown rendering When matrix is incomplete Then it states the service must not claim full coverage', () => {
  const matrix = {
    generatedAt: '2026-06-25T00:00:00.000Z',
    requestedRange: { fromYear: 2010, toYear: 2026 },
    truthStatement: {
      hasAllCompetitionResultsFromRequestedRange: false,
      headline: '아직 2010년부터 오늘까지 모든 경기결과가 다 있는 상태가 아닙니다.',
    },
    summary: {
      totalYears: 17,
      resultBundleCount: 6,
      eventCount: 120,
      resultRowCount: 900,
      localCompetitionYears: 1,
      localResultYears: 1,
      locallyAlignedYears: 0,
      partialYears: 1,
      notStartedYears: 16,
      earliestLocalCompetitionYear: 2026,
      earliestLocalResultYear: 2026,
      latestLocalCompetitionYear: 2026,
      latestLocalResultYear: 2026,
    },
    years: [
      {
        year: 2026,
        competitionCount: 60,
        resultBundleCount: 6,
        missingLocalResultBundles: 54,
        status: 'partial_local_gap',
        evidenceTag: 'LOCAL_COMPETITION_COUNT_EXCEEDS_RESULT_BUNDLES',
        warning: 'LOCAL_RESULT_GAP',
      },
    ],
    nextCollectionPlan: [],
  };

  const markdown = renderCoverageMatrixMarkdown(matrix);

  assert.equal(
    markdown.split('\n').slice(0, 4).join('\n'),
    '# AthleteTime 경기결과 커버리지 매트릭스\n\n> 현재 상태 정본: [`athletetime-current-state.md`](./athletetime-current-state.md)\n',
  );
  assert.match(markdown, /아직 2010년부터 오늘까지 모든 경기결과가 다 있는 상태가 아닙니다/);
  assert.match(markdown, /결과묶음 합계: 6/);
  assert.match(markdown, /종목 합계: 120/);
  assert.match(markdown, /결과행 합계: 900/);
  assert.match(markdown, /\| 2026 \| 60 \| 6 \| 54 \| partial_local_gap \|/);
  assert.match(markdown, /전체 보유 또는 공식 완전성 표현 금지/);
});

test('Given CLI invocation When writing coverage artifacts Then JSON and Markdown are created', () => {
  const root = makeTempDataRoot();
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-coverage-out-'));
  try {
    writeJson(path.join(root, 'competitions', '2010.json'), [{ id: 'legacy' }]);

    const jsonPath = path.join(output, 'coverage.json');
    const markdownPath = path.join(output, 'coverage.md');
    const stdout = execFileSync(
      process.execPath,
      [
        'tools/build-coverage-matrix.js',
        '--data-root',
        root,
        '--from-year',
        '2010',
        '--to-year',
        '2011',
        '--generated-at',
        '2026-06-25T00:00:00.000Z',
        '--out-json',
        jsonPath,
        '--out-md',
        markdownPath,
      ],
      { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' },
    );

    assert.match(stdout, /coverage:2010-2011/);
    assert.equal(fs.existsSync(jsonPath), true);
    assert.equal(fs.existsSync(markdownPath), true);

    const matrix = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.equal(matrix.years[0].status, 'listed_no_results');
    assert.match(fs.readFileSync(markdownPath, 'utf8'), /listed_no_results/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('Given CLI malformed year When invoked Then it prints a short operator error without stack trace', () => {
  const result = execFileSync(
    process.execPath,
    [
      '-e',
      [
        "const { spawnSync } = require('node:child_process');",
        "const r = spawnSync(process.execPath, ['tools/build-coverage-matrix.js', '--from-year', 'bad'], { cwd: process.cwd(), encoding: 'utf8' });",
        "process.stdout.write(JSON.stringify({ status: r.status, stdout: r.stdout, stderr: r.stderr }));",
      ].join(' '),
    ],
    { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' },
  );
  const parsed = JSON.parse(result);

  assert.equal(parsed.status, 1);
  assert.match(parsed.stderr, /^error: Invalid year: bad/);
  assert.doesNotMatch(parsed.stderr, /at parseYear/);
});
