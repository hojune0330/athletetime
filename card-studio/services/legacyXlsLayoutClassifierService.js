'use strict';

const {
  sanitizeReportString,
} = require('./legacyReportSafety');

const LAYOUTS = [
  'horizontal_podium',
  'vertical_result_list',
  'summary_only',
  'mixed',
  'unknown',
];
const RESULT_LAYOUTS = new Set(['horizontal_podium', 'vertical_result_list', 'mixed', 'unknown']);

function compact(value) {
  return String(value || '').replace(/\s+/gu, ' ').trim();
}

function normalizedHeader(value) {
  return compact(value).replace(/\s+/gu, '').toLowerCase();
}

function isNameHeader(value) {
  return /^(성명|이름|선수명|name)$/u.test(normalizedHeader(value));
}

function isAffiliationHeader(value) {
  return /^(소속|소속명|시도|시도명|국가|nat|team)$/u.test(normalizedHeader(value));
}

function isRecordHeader(value) {
  return /^(기록|기록계|종합기록|rec|record|mark)$/u.test(normalizedHeader(value));
}

function isEventHeader(value) {
  return /^(종목|events?|event)$/u.test(normalizedHeader(value));
}

function rowText(row) {
  return (row || []).map(compact).join(' ');
}

function hasRankText(value) {
  return /^(순위|등위|등수|rank)$/u.test(normalizedHeader(value));
}

function isRankValue(value) {
  return /^(?:\d+|0\d+|우승|준우승|3위|\d+위)$/u.test(compact(value));
}

function detectHorizontalPodium(sheet) {
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = (sheet.rows[index] || []).map(compact);
    const groups = [];
    for (let column = 0; column < row.length - 2; column += 1) {
      if (isNameHeader(row[column]) && isAffiliationHeader(row[column + 1]) && isRecordHeader(row[column + 2])) {
        groups.push({
          rank: groups.length + 1,
          nameColumn: column,
          affiliationColumn: column + 1,
          recordColumn: column + 2,
        });
      }
    }
    if (groups.length < 2) continue;

    const previousRowText = rowText(sheet.rows[index - 1]);
    if (!/1\s*위|1위|rank\s*1/iu.test(previousRowText) && !/2\s*위|2위|rank\s*2/iu.test(previousRowText)) {
      continue;
    }

    const resultRowEstimate = sheet.rows.slice(index + 1)
      .filter((candidate) => compact((candidate || [])[0]) && compact((candidate || [])[0]) !== '풍향풍속')
      .filter((candidate) => groups.some((group) => compact((candidate || [])[group.recordColumn])))
      .length;

    return {
      matched: true,
      headerRowIndex: index,
      eventColumnHint: 0,
      resultRowEstimate,
      parserReuse: 'extractHorizontalPodiumResults',
    };
  }

  return { matched: false };
}

function detectVerticalResultList(sheet) {
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = (sheet.rows[index] || []).map(compact);
    const rankColumns = row
      .map((cell, column) => (hasRankText(cell) ? column : -1))
      .filter((column) => column >= 0);
    const hasName = row.some(isNameHeader);
    const hasAffiliation = row.some(isAffiliationHeader);
    const recordColumns = row
      .map((cell, column) => (isRecordHeader(cell) ? column : -1))
      .filter((column) => column >= 0);

    if (!rankColumns.length || !hasName || !hasAffiliation || !recordColumns.length) continue;

    const resultRowEstimate = sheet.rows.slice(index + 1)
      .filter((candidate) => rankColumns.some((column) => isRankValue((candidate || [])[column])))
      .filter((candidate) => recordColumns.some((column) => compact((candidate || [])[column])))
      .length;

    return {
      matched: true,
      headerRowIndex: index,
      eventColumnHint: 'sheet_or_title',
      resultRowEstimate,
      parserReuse: null,
    };
  }

  return { matched: false };
}

function detectLegWinnerList(sheet) {
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = (sheet.rows[index] || []).map(compact);
    const joined = row.map(normalizedHeader).join(' ');
    if (!joined.includes('구간') || !row.some(isNameHeader) || !row.some(isRecordHeader)) continue;
    if (!row.some(isAffiliationHeader) && !joined.includes('종별')) continue;

    const resultRowEstimate = sheet.rows.slice(index + 1)
      .filter((candidate) => (candidate || []).map(compact).some(Boolean))
      .filter((candidate) => (candidate || []).some((cell) => /\d+(?:분|:)\s*\d+/u.test(compact(cell))))
      .length;

    return {
      matched: true,
      headerRowIndex: index,
      eventColumnHint: 'leg_columns',
      resultRowEstimate,
      parserReuse: null,
    };
  }

  return { matched: false };
}

function detectRelayMatrix(sheet) {
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = (sheet.rows[index] || []).map(compact);
    const normalized = row.map(normalizedHeader);
    const legColumns = normalized.filter((cell) => /구간/u.test(cell)).length;
    const hasTeamColumn = normalized[0] === '소속';
    const hasTotalColumn = normalized.some((cell) => /일계|총계/u.test(cell));
    if (!hasTeamColumn || legColumns < 2 || !hasTotalColumn) continue;

    const resultRowEstimate = sheet.rows.slice(index + 1)
      .filter((candidate) => compact((candidate || [])[0]) && compact((candidate || [])[0]) !== '역 대 최고기록')
      .filter((candidate) => (candidate || []).some((cell) => /\([^)]+\)\s*:?\d{1,2}:\d{2}/u.test(compact(cell))))
      .length;

    return {
      matched: true,
      headerRowIndex: index,
      eventColumnHint: 'relay_leg_columns',
      resultRowEstimate,
      parserReuse: null,
    };
  }

  return { matched: false };
}

function detectTeamResultList(sheet) {
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = (sheet.rows[index] || []).map(compact);
    const rankColumns = row
      .map((cell, column) => (hasRankText(cell) ? column : -1))
      .filter((column) => column >= 0);
    const hasTeam = row.some(isAffiliationHeader);
    const recordColumns = row
      .map((cell, column) => (isRecordHeader(cell) ? column : -1))
      .filter((column) => column >= 0);
    if (!rankColumns.length || !hasTeam || !recordColumns.length) continue;

    const resultRowEstimate = sheet.rows.slice(index + 1)
      .filter((candidate) => rankColumns.some((column) => isRankValue((candidate || [])[column])))
      .filter((candidate) => recordColumns.some((column) => compact((candidate || [])[column])))
      .length;
    if (resultRowEstimate === 0) continue;

    return {
      matched: true,
      headerRowIndex: index,
      eventColumnHint: 'team_result_rows',
      resultRowEstimate,
      parserReuse: null,
    };
  }

  return { matched: false };
}

function detectHeaderlessTeamResultList(sheet) {
  if (!/단체/u.test(compact(sheet.name))) return { matched: false };

  const resultRowEstimate = sheet.rows
    .filter((row) => isRankValue((row || [])[1]) && compact((row || [])[2]) && /\d+:\d{2}/u.test(compact((row || [])[3])))
    .length;
  if (resultRowEstimate === 0) return { matched: false };

  return {
    matched: true,
    headerRowIndex: 0,
    eventColumnHint: 'headerless_team_rows',
    resultRowEstimate,
    parserReuse: null,
  };
}

function detectSummaryOnly(sheet) {
  if (sheet.rows.length === 0) return true;
  const name = compact(sheet.name);
  const firstRowsText = sheet.rows.slice(0, 12).map(rowText).join(' ');
  return /종합성적|종합점수|시도종합점수|신기록|신기록현황|우수선수|성적\s*발표|기록구분|기상현황|기\s*상\s*현\s*황|weather|기상상황/u
    .test(`${name} ${firstRowsText}`);
}

function classifyLegacyXlsSheet(sheet) {
  const horizontal = detectHorizontalPodium(sheet);
  const vertical = detectVerticalResultList(sheet);
  const legWinnerList = detectLegWinnerList(sheet);
  const relayMatrix = detectRelayMatrix(sheet);
  const teamResultList = detectTeamResultList(sheet);
  const headerlessTeamResultList = detectHeaderlessTeamResultList(sheet);
  const summaryOnly = detectSummaryOnly(sheet);

  if (
    horizontal.matched
    && (
      vertical.matched
      || legWinnerList.matched
      || relayMatrix.matched
      || teamResultList.matched
      || headerlessTeamResultList.matched
    )
  ) {
    return {
      name: sanitizeReportString(sheet.name),
      layout: 'mixed',
      headerRowIndex: Math.min(
        horizontal.headerRowIndex,
        vertical.headerRowIndex
          ?? legWinnerList.headerRowIndex
          ?? relayMatrix.headerRowIndex
          ?? teamResultList.headerRowIndex
          ?? headerlessTeamResultList.headerRowIndex,
      ),
      eventColumnHint: 'multiple',
      resultRowEstimate: horizontal.resultRowEstimate
        + (vertical.resultRowEstimate || 0)
        + (legWinnerList.resultRowEstimate || 0)
        + (relayMatrix.resultRowEstimate || 0)
        + (teamResultList.resultRowEstimate || 0)
        + (headerlessTeamResultList.resultRowEstimate || 0),
      parserReuse: null,
      blockReason: 'MIXED_SHEET_LAYOUT_NEEDS_REVIEW',
    };
  }

  if (horizontal.matched) {
    return {
      name: sanitizeReportString(sheet.name),
      layout: 'horizontal_podium',
      headerRowIndex: horizontal.headerRowIndex,
      eventColumnHint: horizontal.eventColumnHint,
      resultRowEstimate: horizontal.resultRowEstimate,
      parserReuse: horizontal.parserReuse,
    };
  }

  if (
    vertical.matched
    || legWinnerList.matched
    || relayMatrix.matched
    || teamResultList.matched
    || headerlessTeamResultList.matched
  ) {
    const detected = [vertical, legWinnerList, relayMatrix, teamResultList, headerlessTeamResultList]
      .find((candidate) => candidate.matched);
    return {
      name: sanitizeReportString(sheet.name),
      layout: 'vertical_result_list',
      headerRowIndex: detected.headerRowIndex,
      eventColumnHint: detected.eventColumnHint,
      resultRowEstimate: detected.resultRowEstimate,
      parserReuse: detected.parserReuse,
      blockReason: 'VERTICAL_RESULT_LIST_NEEDS_PARSER',
    };
  }

  if (summaryOnly) {
    return {
      name: sanitizeReportString(sheet.name),
      layout: 'summary_only',
      resultRowEstimate: 0,
      parserReuse: null,
      blockReason: 'SUMMARY_ONLY_NO_RESULT_ROWS',
    };
  }

  return {
    name: sanitizeReportString(sheet.name),
    layout: 'unknown',
    resultRowEstimate: 0,
    parserReuse: null,
    blockReason: 'UNKNOWN_LAYOUT_NEEDS_REVIEW',
  };
}

function workbookLayoutOf(sheets) {
  const layouts = new Set(sheets.map((sheet) => sheet.layout));
  if (layouts.size === 1) return [...layouts][0];
  return 'mixed';
}

function blockReasonOf(sheets) {
  const resultLayouts = sheets
    .map((sheet) => sheet.layout)
    .filter((layout) => RESULT_LAYOUTS.has(layout));
  const hasHorizontal = resultLayouts.includes('horizontal_podium');
  const hasVertical = resultLayouts.includes('vertical_result_list');
  const hasUnknown = resultLayouts.includes('unknown');
  const hasMixed = resultLayouts.includes('mixed');

  if (hasHorizontal && !hasVertical && !hasUnknown && !hasMixed) return null;
  if (hasHorizontal && (hasVertical || hasUnknown || hasMixed)) return 'MIXED_RESULT_LAYOUTS_NEED_REVIEW';
  if (hasVertical) return 'VERTICAL_RESULT_LIST_NEEDS_PARSER';
  if (hasUnknown || hasMixed) return 'UNKNOWN_LAYOUT_NEEDS_REVIEW';
  return 'SUMMARY_ONLY_NO_RESULT_ROWS';
}

function classifyLegacyXlsWorkbook(workbook) {
  const sheets = workbook.sheets.map(classifyLegacyXlsSheet);
  const blockReason = blockReasonOf(sheets);
  const workbookLayout = workbookLayoutOf(sheets);

  return {
    sheets,
    workbookLayout,
    primaryResultLayout: sheets.find((sheet) => RESULT_LAYOUTS.has(sheet.layout))?.layout || 'summary_only',
    promotable: blockReason === null,
    blockReason,
    reusableByExistingHorizontalPipeline: blockReason === null,
  };
}

function countInto(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function emptyLayoutCounts() {
  return Object.fromEntries(LAYOUTS.map((layout) => [layout, 0]));
}

function buildLegacyXlsLayoutSummary(workbooks) {
  const workbookLayouts = emptyLayoutCounts();
  const sheetLayouts = emptyLayoutCounts();
  const byYear = {};
  const blockReasonCounts = {};
  let promotableWorkbooks = 0;

  for (const workbook of workbooks) {
    const year = String(workbook.year);
    if (!byYear[year]) {
      byYear[year] = {
        total: 0,
        promotable: 0,
        workbookLayouts: emptyLayoutCounts(),
        blockReasons: {},
      };
    }

    byYear[year].total += 1;
    countInto(workbookLayouts, workbook.workbookLayout);
    countInto(byYear[year].workbookLayouts, workbook.workbookLayout);
    if (workbook.promotable) {
      promotableWorkbooks += 1;
      byYear[year].promotable += 1;
    }
    if (workbook.blockReason) {
      countInto(blockReasonCounts, workbook.blockReason);
      countInto(byYear[year].blockReasons, workbook.blockReason);
    }
    for (const sheet of workbook.sheets || []) countInto(sheetLayouts, sheet.layout);
  }

  return {
    workbookLayouts,
    sheetLayouts,
    byYear,
    promotableWorkbooks,
    blockedWorkbooks: workbooks.length - promotableWorkbooks,
    blockReasonCounts,
    existingHorizontalPipelineReusableWorkbooks: workbooks
      .filter((workbook) => workbook.reusableByExistingHorizontalPipeline)
      .length,
  };
}

module.exports = {
  buildLegacyXlsLayoutSummary,
  classifyLegacyXlsSheet,
  classifyLegacyXlsWorkbook,
};
