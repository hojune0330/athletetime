'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { buildSourceInventory } = require('./sourceInventoryService');

const DEFAULT_FROM_YEAR = 2010;

const STATUS = Object.freeze({
  LISTED_NO_RESULTS: 'listed_no_results',
  LOCALLY_ALIGNED: 'locally_aligned_not_global_proof',
  NOT_STARTED: 'not_started',
  ORPHAN_RESULTS: 'orphan_results',
  PARTIAL_GAP: 'partial_local_gap',
  RESULT_OVERLISTED: 'result_overlisted',
});

function defaultDataRoot() {
  return path.join(__dirname, '..', '..', 'data');
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, items: [] };
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new TypeError(`Expected JSON array at ${filePath}`);
  }

  return { exists: true, items: parsed };
}

function countResultRows(resultBundles) {
  let eventCount = 0;
  let resultRowCount = 0;

  for (const bundle of resultBundles) {
    if (!Array.isArray(bundle.events)) continue;
    eventCount += bundle.events.length;
    for (const event of bundle.events) {
      if (Array.isArray(event.results)) {
        resultRowCount += event.results.length;
      }
    }
  }

  return { eventCount, resultRowCount };
}

function classifyYear(competitionFile, resultFile) {
  const competitionCount = competitionFile.items.length;
  const resultBundleCount = resultFile.items.length;

  if (!competitionFile.exists && !resultFile.exists) {
    return {
      evidenceTag: 'NO_LOCAL_COMPETITION_OR_RESULT_FILE',
      status: STATUS.NOT_STARTED,
      warning: 'NO_LOCAL_DATA',
    };
  }

  if (!competitionFile.exists && resultFile.exists) {
    return {
      evidenceTag: 'RESULT_FILE_WITHOUT_LOCAL_COMPETITION_FILE',
      status: STATUS.ORPHAN_RESULTS,
      warning: 'LOCAL_INDEX_MISMATCH',
    };
  }

  if (competitionFile.exists && !resultFile.exists) {
    return {
      evidenceTag: 'LOCAL_COMPETITION_FILE_WITHOUT_RESULT_FILE',
      status: STATUS.LISTED_NO_RESULTS,
      warning: 'LOCAL_RESULT_GAP',
    };
  }

  if (resultBundleCount < competitionCount) {
    return {
      evidenceTag: 'LOCAL_COMPETITION_COUNT_EXCEEDS_RESULT_BUNDLES',
      status: STATUS.PARTIAL_GAP,
      warning: 'LOCAL_RESULT_GAP',
    };
  }

  if (resultBundleCount > competitionCount) {
    return {
      evidenceTag: 'RESULT_BUNDLE_COUNT_EXCEEDS_LOCAL_COMPETITIONS',
      status: STATUS.RESULT_OVERLISTED,
      warning: 'LOCAL_INDEX_MISMATCH',
    };
  }

  return {
    evidenceTag: 'LOCAL_COMPETITION_COUNT_MATCHES_RESULT_BUNDLES',
    status: STATUS.LOCALLY_ALIGNED,
    warning: 'LOCAL_LIST_MATCHES_RESULTS_BUT_NOT_GLOBAL_COMPLETENESS',
  };
}

function buildYearRow(dataRoot, year) {
  const competitionFile = readJsonArray(path.join(dataRoot, 'competitions', `${year}.json`));
  const resultFile = readJsonArray(path.join(dataRoot, 'results', `${year}.json`));
  const counts = countResultRows(resultFile.items);
  const classification = classifyYear(competitionFile, resultFile);
  const competitionCount = competitionFile.items.length;
  const resultBundleCount = resultFile.items.length;

  return {
    year,
    competitionCount,
    resultBundleCount,
    eventCount: counts.eventCount,
    resultRowCount: counts.resultRowCount,
    missingLocalResultBundles: Math.max(competitionCount - resultBundleCount, 0),
    hasCompetitionFile: competitionFile.exists,
    hasResultFile: resultFile.exists,
    ...classification,
  };
}

function compactSourceCandidate(candidate) {
  return {
    inventoryId: candidate.inventoryId,
    provider: candidate.provider,
    title: candidate.title,
    sourceClass: candidate.sourceClass,
    collectionAction: candidate.collectionAction,
    reviewStatus: candidate.reviewStatus,
    sourceUrl: candidate.sourceUrl,
    downloadUrl: candidate.downloadUrl || null,
    datasetId: candidate.datasetId || null,
    originalFilename: candidate.originalFilename || null,
  };
}

function summarizeYears(years) {
  const competitionYears = years.filter((year) => year.hasCompetitionFile);
  const resultYears = years.filter((year) => year.hasResultFile);

  return {
    totalYears: years.length,
    localCompetitionYears: competitionYears.length,
    localResultYears: resultYears.length,
    locallyAlignedYears: years.filter((year) => year.status === STATUS.LOCALLY_ALIGNED).length,
    partialYears: years.filter((year) => year.status === STATUS.PARTIAL_GAP).length,
    notStartedYears: years.filter((year) => year.status === STATUS.NOT_STARTED).length,
    listedNoResultYears: years.filter((year) => year.status === STATUS.LISTED_NO_RESULTS).length,
    earliestLocalCompetitionYear: competitionYears[0]?.year || null,
    earliestLocalResultYear: resultYears[0]?.year || null,
    latestLocalCompetitionYear: competitionYears[competitionYears.length - 1]?.year || null,
    latestLocalResultYear: resultYears[resultYears.length - 1]?.year || null,
  };
}

function buildCoverageMatrix(options = {}) {
  const dataRoot = options.dataRoot || defaultDataRoot();
  const fromYear = Number(options.fromYear || DEFAULT_FROM_YEAR);
  const toYear = Number(options.toYear || new Date().getFullYear());
  const generatedAt = options.generatedAt || new Date().toISOString();
  const years = [];

  for (let year = fromYear; year <= toYear; year += 1) {
    years.push(buildYearRow(dataRoot, year));
  }

  return {
    generatedAt,
    requestedRange: { fromYear, toYear },
    truthStatement: {
      hasAllCompetitionResultsFromRequestedRange: false,
      headline: '아직 2010년부터 오늘까지 모든 경기결과가 다 있는 상태가 아닙니다.',
      reason: '로컬 파일 기준의 일치 여부만 확인했으며, 공식 전체 대회 대비 완전성은 별도 출처 대조가 필요합니다.',
    },
    summary: summarizeYears(years),
    years,
    nextCollectionPlan: buildSourceInventory().candidates.map(compactSourceCandidate),
  };
}

function renderNullable(value) {
  return value === null || value === undefined ? '-' : String(value);
}

function renderCoverageMatrixMarkdown(matrix) {
  const lines = [
    '# AthleteTime 경기결과 커버리지 매트릭스',
    '',
    `생성시각: ${matrix.generatedAt}`,
    `범위: ${matrix.requestedRange.fromYear}-${matrix.requestedRange.toYear}`,
    '',
    `판정: ${matrix.truthStatement.headline}`,
    '',
    '주의: 전체 보유 또는 공식 완전성 표현 금지. 이 표는 현재 로컬 보유 데이터와 안전 수집 후보를 분리해 보여주는 운영용 증거입니다.',
    '',
    '## 요약',
    '',
    `- 로컬 대회목록 보유 연도: ${matrix.summary.localCompetitionYears}/${matrix.summary.totalYears}`,
    `- 로컬 결과묶음 보유 연도: ${matrix.summary.localResultYears}/${matrix.summary.totalYears}`,
    `- 로컬 목록과 결과 수가 맞는 연도: ${matrix.summary.locallyAlignedYears}`,
    `- 로컬 결과가 부족한 연도: ${matrix.summary.partialYears}`,
    `- 시작 전 연도: ${matrix.summary.notStartedYears}`,
    '',
    '## 연도별 현황',
    '',
    '| 연도 | 대회목록 | 결과묶음 | 로컬 누락 | 상태 | 증거태그 |',
    '| --- | ---: | ---: | ---: | --- | --- |',
  ];

  for (const year of matrix.years) {
    lines.push(
      `| ${year.year} | ${year.competitionCount} | ${year.resultBundleCount} | ${year.missingLocalResultBundles} | ${year.status} | ${year.evidenceTag} |`,
    );
  }

  lines.push('', '## 다음 수집 후보', '');
  for (const candidate of matrix.nextCollectionPlan) {
    lines.push(
      `- ${candidate.collectionAction}: ${candidate.title || candidate.originalFilename || candidate.datasetId || candidate.sourceUrl} (${renderNullable(candidate.sourceUrl)})`,
    );
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  STATUS,
  buildCoverageMatrix,
  renderCoverageMatrixMarkdown,
};
