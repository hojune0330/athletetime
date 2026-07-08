'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

class TrackAPromotionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TrackAPromotionError';
    this.code = code;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new TrackAPromotionError(
      'TRACK_A_CANDIDATES_NOT_FOUND',
      `Track A candidate file not found: ${filePath}`,
    );
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new TrackAPromotionError(
          'TRACK_A_INVALID_JSONL',
          `Invalid JSONL at line ${index + 1}: ${error.message}`,
        );
      }
    });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function countRows(competitions) {
  let eventCount = 0;
  let resultRowCount = 0;

  for (const competition of competitions) {
    for (const event of competition.events || []) {
      eventCount += 1;
      resultRowCount += Array.isArray(event.results) ? event.results.length : 0;
    }
  }

  return { eventCount, resultRowCount };
}

function publicSourceCatalog(inspectionFile) {
  if (!inspectionFile || !fs.existsSync(inspectionFile)) return new Map();

  const inspection = readJson(inspectionFile);
  const catalog = new Map();
  for (const workbook of inspection.workbooks || []) {
    if (!workbook.sourcePath) continue;
    catalog.set(workbook.sourcePath, {
      originalFilename: workbook.originalFilename || path.basename(workbook.sourcePath),
      sourcePath: workbook.sourcePath,
    });
  }
  return catalog;
}

function normalizePublicSourcePath(sourcePath) {
  return String(sourcePath || '').replace(/\\/gu, '/');
}

function sourceNumericToken(sourcePath) {
  const basename = path.basename(normalizePublicSourcePath(sourcePath));
  const match = basename.match(/^(\d{3,4})_/u);
  if (match) return match[1].padStart(4, '0');
  return null;
}

function dateFromSource(...values) {
  const text = values.filter(Boolean).join(' ');
  const matches = text.match(/20\d{6}/gu) || [];
  for (const raw of matches) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6));
    const day = Number(raw.slice(6, 8));
    if (year >= 2000 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
  }
  return '';
}

function cleanCompetitionName(name) {
  const cleaned = String(name || '')
    .replace(/[_`]+/gu, ' ')
    .replace(/[1-4]?(20\d{6})/gu, '')
    .replace(/종합\s*득점표/gu, '')
    .replace(/종합\s*기록지?/gu, '')
    .replace(/최종\s*기록/gu, '')
    .replace(/\s*기록지?\s*$/gu, '')
    .replace(/\s+/gu, ' ')
    .replace(/[·ㆍ,._\-\s]+$/gu, '')
    .trim();
  return cleaned || String(name || '').trim() || '(대회명 확인 중)';
}

function validateCandidate(row, index) {
  const required = ['year', 'competitionName', 'division', 'event', 'rank', 'name', 'affiliation', 'record'];
  const missing = required.filter((field) => {
    const value = row[field];
    return value === null || value === undefined || String(value).trim() === '';
  });
  if (missing.length > 0) {
    throw new TrackAPromotionError(
      'TRACK_A_INVALID_CANDIDATE_ROW',
      `Candidate line ${index + 1} is missing: ${missing.join(', ')}`,
    );
  }
  const sourcePath = row.source && (row.source.privateStoragePath || row.source.sourcePath);
  if (!sourcePath) {
    throw new TrackAPromotionError(
      'TRACK_A_INVALID_CANDIDATE_ROW',
      `Candidate line ${index + 1} is missing source.privateStoragePath`,
    );
  }
}

function eventKeyOf(row) {
  return [
    String(row.division || '').trim(),
    displayEventLabel(row),
  ].join('|');
}

function groupKeyOf(row) {
  const sourcePath = normalizePublicSourcePath(row.source.privateStoragePath || row.source.sourcePath);
  return [
    String(row.year),
    sourcePath,
    String(row.competitionName || '').trim(),
  ].join('|');
}

function resultRowOf(row) {
  return {
    rank: Number(row.rank),
    name: String(row.name || '').trim(),
    affiliation: String(row.affiliation || '').trim(),
    record: String(row.record || '').trim(),
    personal_best: '',
    note: String(row.note || '').trim(),
    newRecord: String(row.newRecord || '').trim(),
  };
}

function inferGender(row) {
  const event = String(row.event || '').trim();
  const division = String(row.division || '').trim();
  const firstToken = event.split(/\s+/u)[0] || division.split(/\s+/u)[0] || '';
  if (/^여/u.test(firstToken) || (/^여/u.test(division) && !/^남/u.test(firstToken))) return '여자';
  if (/^남/u.test(firstToken) || (/^남/u.test(division) && !/^여/u.test(firstToken))) return '남자';
  return '';
}

function pureEventName(row) {
  const division = String(row.division || '').trim();
  const escapedDivision = division.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return String(row.event || '')
    .replace(new RegExp(`^${escapedDivision}\\s*`, 'u'), '')
    .replace(/^(남자부|여자부|남자|여자|남고|여고|남중|여중|남초|여초)\s*/u, '')
    .replace(/^(중|고)\s*1학년부\s*/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function displayEventLabel(row) {
  const gender = inferGender(row);
  const pureEvent = pureEventName(row) || String(row.event || '').trim();
  if (!gender || !pureEvent) return String(row.event || '').trim();
  return `${gender} ${pureEvent} 결승`;
}

function publicEventLabel(row) {
  const gender = inferGender(row);
  const pureEvent = pureEventName(row) || String(row.event || '').trim();
  if (gender && pureEvent) return `${gender} ${pureEvent} 결승`;
  const division = String(row.division || '').trim();
  if (division && pureEvent && !String(row.event || '').includes('레인')) {
    return `${division} ${pureEvent} 결승`.replace(/\s+/gu, ' ').trim();
  }
  return String(row.event || '').trim();
}

function buildCompetition({ rows, sourceCatalog }) {
  const first = rows[0];
  const sourcePath = normalizePublicSourcePath(first.source.privateStoragePath || first.source.sourcePath);
  const source = sourceCatalog.get(sourcePath) || {
    originalFilename: path.basename(sourcePath),
    sourcePath,
  };
  const year = String(first.year);
  const token = sourceNumericToken(sourcePath);
  const competitionId = `${year}-track_field-${token || String(sourceCatalog.size + 1).padStart(4, '0')}`;
  const competitionDate = dateFromSource(source.originalFilename, sourcePath);
  const eventGroups = new Map();

  for (const row of rows) {
    const key = eventKeyOf(row);
    if (!eventGroups.has(key)) {
      eventGroups.set(key, {
        event: publicEventLabel(row),
        division: String(row.division || '').trim(),
        date: competitionDate,
        venue: '',
        wind: null,
        results: [],
      });
    }
    eventGroups.get(key).results.push(resultRowOf(row));
  }

  return {
    competitionId,
    toCd: '',
    competitionName: cleanCompetitionName(first.competitionName),
    year,
    period: competitionDate,
    venue: '',
    source: 'kaaf_backfill_xlsx',
    sourceUrl: '',
    sourceFile: source.originalFilename,
    collectedAt: '2026-07-08',
    events: [...eventGroups.values()],
  };
}

function buildPromotedResults({ candidateFile, inspectionFile }) {
  const candidates = readJsonl(candidateFile);
  candidates.forEach(validateCandidate);

  const sourceCatalog = publicSourceCatalog(inspectionFile);
  const groups = new Map();
  for (const row of candidates) {
    const key = groupKeyOf(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const heldWorkbooks = [];
  const safeGroups = [];
  for (const rows of groups.values()) {
    const safety = assessPromotionGroup(rows, sourceCatalog);
    if (safety.ok) safeGroups.push(rows);
    else heldWorkbooks.push(safety.hold);
  }

  const competitions = safeGroups
    .map((rows) => buildCompetition({ rows, sourceCatalog }))
    .sort((a, b) => {
      const yearCompare = String(a.year).localeCompare(String(b.year));
      if (yearCompare !== 0) return yearCompare;
      return String(a.competitionId).localeCompare(String(b.competitionId));
    });

  const byYearCompetitions = new Map();
  for (const competition of competitions) {
    if (!byYearCompetitions.has(competition.year)) byYearCompetitions.set(competition.year, []);
    byYearCompetitions.get(competition.year).push(competition);
  }

  const byYear = {};
  for (const [year, yearCompetitions] of byYearCompetitions.entries()) {
    byYear[year] = countRows(yearCompetitions).resultRowCount;
  }

  return {
    competitions,
    byYearCompetitions,
    report: {
      candidateRows: candidates.length,
      promotedRows: Object.values(byYear).reduce((sum, count) => sum + count, 0),
      promotedWorkbooks: competitions.length,
      heldWorkbooks,
      heldRows: heldWorkbooks.reduce((sum, item) => sum + item.candidateRows, 0),
      years: [...byYearCompetitions.keys()].map(Number).sort((a, b) => a - b),
      byYear,
      deferredXlsFiles: 83,
      excludedNonEliteFiles: 1,
    },
  };
}

function assessPromotionGroup(rows, sourceCatalog) {
  const first = rows[0];
  const sourcePath = normalizePublicSourcePath(first.source.privateStoragePath || first.source.sourcePath);
  const source = sourceCatalog.get(sourcePath) || {
    originalFilename: path.basename(sourcePath),
    sourcePath,
  };
  const headerRows = rows.filter((row) => (
    String(row.name || '').trim() === '성명'
    || String(row.affiliation || '').trim() === '소속'
    || String(row.record || '').trim() === '기록'
  )).length;
  const unsafeEventRows = rows.filter((row) => !/^(남자|여자)\s/u.test(displayEventLabel(row))).length;
  if (headerRows > 0 || unsafeEventRows === rows.length) {
    return {
      ok: false,
      hold: {
        year: Number(first.year),
        competitionName: cleanCompetitionName(first.competitionName),
        sourceFile: source.originalFilename,
        candidateRows: rows.length,
        reason: unsafeEventRows > 0 ? 'UNSAFE_EVENT_LABELS' : 'HEADER_ROWS',
        unsafeEventRows,
        headerRows,
      },
    };
  }
  return { ok: true };
}

function buildIndexEntries(competitions) {
  return competitions.map((competition) => {
    const counts = countRows([competition]);
    return {
      id: competition.competitionId,
      toCd: competition.toCd,
      name: competition.competitionName,
      year: competition.year,
      period: {
        start: competition.period || '',
        end: competition.period || '',
      },
      venue: competition.venue || '',
      category: 'track_field',
      eventCount: counts.eventCount,
      athleteCount: counts.resultRowCount,
    };
  });
}

function mergeIndex(existingIndexPath, promotedCompetitions) {
  const promoted = buildIndexEntries(promotedCompetitions).sort((a, b) => {
    const dateCompare = entryStartDate(a).localeCompare(entryStartDate(b));
    if (dateCompare !== 0) return dateCompare;
    return String(a.id).localeCompare(String(b.id));
  });
  const promotedIds = new Set(promoted.map((entry) => entry.id));
  const existing = fs.existsSync(existingIndexPath) ? readJson(existingIndexPath) : [];
  const existingWithoutPromoted = existing.filter((entry) => !promotedIds.has(entry.id));

  if (existingWithoutPromoted.length === 0) return promoted;
  const firstExistingDate = entryStartDate(existingWithoutPromoted[0]);
  const lastPromotedDate = entryStartDate(promoted[promoted.length - 1]);
  if (!firstExistingDate || lastPromotedDate <= firstExistingDate) {
    return [...promoted, ...existingWithoutPromoted];
  }
  return [...existingWithoutPromoted, ...promoted];
}

function entryStartDate(entry) {
  if (!entry) return '';
  if (entry.period && typeof entry.period === 'object') return entry.period.start || entry.period.end || '';
  return String(entry.period || '');
}

function writePromotion({ candidateFile, inspectionFile, outDir, indexPath, evidenceDir }) {
  const promoted = buildPromotedResults({ candidateFile, inspectionFile });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  for (const [year, competitions] of promoted.byYearCompetitions.entries()) {
    writeJson(path.join(outDir, `${year}.json`), competitions);
  }

  const mergedIndex = mergeIndex(indexPath, promoted.competitions);
  writeJson(indexPath, mergedIndex);
  writeJson(path.join(evidenceDir, 'promotion-report.json'), promoted.report);

  return {
    ...promoted.report,
    outDir: path.relative(ROOT, outDir).replace(/\\/gu, '/') || '.',
    index: path.relative(ROOT, indexPath).replace(/\\/gu, '/') || path.basename(indexPath),
    evidenceDir: path.relative(ROOT, evidenceDir).replace(/\\/gu, '/') || '.',
  };
}

module.exports = {
  TrackAPromotionError,
  buildIndexEntries,
  buildPromotedResults,
  cleanCompetitionName,
  dateFromSource,
  writePromotion,
};
