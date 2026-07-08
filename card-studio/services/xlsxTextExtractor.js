'use strict';

const { readZipEntries } = require('./xlsxZipReader');

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(source, name) {
  const match = String(source || '').match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : '';
}

function stripTags(value) {
  return decodeXml(String(value || '').replace(/<[^>]+>/g, ''));
}

function columnIndex(cellRef) {
  const letters = String(cellRef || '').match(/^[A-Z]+/i);
  if (!letters) return null;
  let index = 0;
  for (const letter of letters[0].toUpperCase()) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

function parseSharedStrings(entries) {
  const xml = entries.get('xl/sharedStrings.xml');
  if (!xml) return [];
  const strings = [];
  const body = xml.toString('utf8');
  const pattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match = pattern.exec(body);
  while (match) {
    strings.push(stripTags(match[1]).trim());
    match = pattern.exec(body);
  }
  return strings;
}

function parseSheetNames(entries) {
  const workbook = entries.get('xl/workbook.xml');
  if (!workbook) return [];
  const names = [];
  const pattern = /<sheet\b([^>]*)\/?>/g;
  const body = workbook.toString('utf8');
  let match = pattern.exec(body);
  while (match) {
    names.push(attr(match[1], 'name'));
    match = pattern.exec(body);
  }
  return names;
}

function worksheetPaths(entries) {
  return [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/sheet(\d+)/)[1]) - Number(b.match(/sheet(\d+)/)[1]));
}

function cellText(cellAttrs, cellBody, sharedStrings) {
  const type = attr(cellAttrs, 't');
  if (type === 's') {
    const value = String(cellBody).match(/<v>([\s\S]*?)<\/v>/);
    const index = value ? Number(stripTags(value[1])) : -1;
    return sharedStrings[index] || '';
  }
  if (type === 'inlineStr') {
    const inline = String(cellBody).match(/<is\b[^>]*>([\s\S]*?)<\/is>/);
    return inline ? stripTags(inline[1]).trim() : '';
  }
  const value = String(cellBody).match(/<v>([\s\S]*?)<\/v>/);
  return value ? stripTags(value[1]).trim() : '';
}

function trimRow(row) {
  let end = row.length;
  while (end > 0 && !row[end - 1]) end -= 1;
  return row.slice(0, end);
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  const body = xml.toString('utf8');
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch = rowPattern.exec(body);

  while (rowMatch) {
    const rowNumber = Number(attr(rowMatch[1], 'r')) || rows.length + 1;
    const row = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch = cellPattern.exec(rowMatch[2]);
    while (cellMatch) {
      const index = columnIndex(attr(cellMatch[1], 'r'));
      if (index !== null) row[index] = cellText(cellMatch[1], cellMatch[2], sharedStrings);
      cellMatch = cellPattern.exec(rowMatch[2]);
    }
    rows[rowNumber - 1] = trimRow(row.map((value) => value || ''));
    rowMatch = rowPattern.exec(body);
  }

  return rows.map((row) => row || []);
}

function readXlsxTextWorkbook(filePath) {
  const entries = readZipEntries(filePath);
  const sharedStrings = parseSharedStrings(entries);
  const names = parseSheetNames(entries);
  const paths = worksheetPaths(entries);
  const sheets = paths.map((sheetPath, index) => ({
    name: names[index] || `sheet${index + 1}`,
    rows: parseWorksheet(entries.get(sheetPath), sharedStrings),
  }));

  return {
    sheetNames: sheets.map((sheet) => sheet.name),
    sheets,
  };
}

module.exports = {
  readXlsxTextWorkbook,
};
