'use strict';

const XLSX = require('xlsx');

function compactCell(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/gu, ' ').trim();
}

function trimTrailingEmptyCells(row) {
  const next = row.map(compactCell);
  while (next.length && !next[next.length - 1]) next.pop();
  return next;
}

function trimTrailingEmptyRows(rows) {
  const next = rows.map(trimTrailingEmptyCells);
  while (next.length && next[next.length - 1].every((cell) => !cell)) next.pop();
  return next;
}

function readLegacyXlsTextWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    dense: false,
    raw: false,
  });
  const sheetNames = workbook.SheetNames.slice();
  const sheets = sheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      blankrows: false,
      defval: '',
      header: 1,
      raw: false,
    });
    return {
      name,
      rows: trimTrailingEmptyRows(rows),
    };
  });

  return { sheetNames, sheets };
}

module.exports = {
  readLegacyXlsTextWorkbook,
};
