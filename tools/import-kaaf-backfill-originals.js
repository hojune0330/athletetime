#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const DEFAULT_BATCH = '20260708-kaaf-backfill-2005-2017';

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function fail(code, message) {
  const payload = { ok: false, error: { code, message } };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes storage root: ${target}`);
  }
  return resolvedTarget;
}

function readNullTerminatedString(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const nullIndex = slice.indexOf(0);
  return slice.subarray(0, nullIndex === -1 ? slice.length : nullIndex).toString('utf8').trim();
}

function parseOctal(buffer, start, length) {
  const text = readNullTerminatedString(buffer, start, length).replace(/\0/g, '').trim();
  if (!text) return 0;
  return Number.parseInt(text, 8);
}

function parsePaxPayload(payload) {
  const result = {};
  let offset = 0;
  while (offset < payload.length) {
    const spaceIndex = payload.indexOf(32, offset);
    if (spaceIndex === -1) break;
    const lengthText = payload.subarray(offset, spaceIndex).toString('ascii');
    const recordLength = Number.parseInt(lengthText, 10);
    if (!Number.isFinite(recordLength) || recordLength <= 0) break;
    const record = payload.subarray(spaceIndex + 1, offset + recordLength - 1).toString('utf8');
    const equalsIndex = record.indexOf('=');
    if (equalsIndex !== -1) {
      result[record.slice(0, equalsIndex)] = record.slice(equalsIndex + 1);
    }
    offset += recordLength;
  }
  return result;
}

function normalizeArchiveName(name, prefix) {
  const joined = prefix ? `${prefix}/${name}` : name;
  return joined.replace(/\\/g, '/').replace(/^\/+/, '');
}

function readArchive(archivePath) {
  const tarBuffer = zlib.gunzipSync(fs.readFileSync(archivePath));
  const entries = [];
  const files = [];
  let offset = 0;
  let nextPax = null;
  let nextLongName = null;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;

    const name = readNullTerminatedString(header, 0, 100);
    const size = parseOctal(header, 124, 12);
    const typeflag = readNullTerminatedString(header, 156, 1) || '0';
    const prefix = readNullTerminatedString(header, 345, 155);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    const payload = tarBuffer.subarray(dataStart, dataEnd);
    const paddedSize = Math.ceil(size / 512) * 512;
    offset = dataStart + paddedSize;

    if (typeflag === 'x' || typeflag === 'g') {
      nextPax = parsePaxPayload(payload);
      continue;
    }
    if (typeflag === 'L') {
      nextLongName = payload.subarray(0, payload.indexOf(0) === -1 ? payload.length : payload.indexOf(0)).toString('utf8');
      continue;
    }

    const archivePathInBackup = normalizeArchiveName(
      (nextPax && nextPax.path) || nextLongName || name,
      prefix,
    );
    nextPax = null;
    nextLongName = null;
    if (!archivePathInBackup) continue;

    entries.push(archivePathInBackup);
    if (typeflag === '0' || typeflag === '') {
      files.push({
        archivePathInBackup,
        data: Buffer.from(payload),
      });
    }
  }

  return { entries, files };
}

function sanitizeEntryName(value) {
  return value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'file';
}

function storageNameForEntry(entry, index) {
  const originalBase = path.posix.basename(entry);
  const extension = path.posix.extname(originalBase).toLowerCase();
  const stem = sanitizeEntryName(extension ? originalBase.slice(0, -extension.length) : originalBase);
  const year = yearFromRelative(entry) || 'unknown';
  const ordinal = String(index + 1).padStart(4, '0');
  const digest = crypto.createHash('sha1').update(entry).digest('hex').slice(0, 10);
  return path.join(String(year), `${ordinal}_${stem}_${digest}${extension}`);
}

function safeEntryExtractArchive(archive, storageRoot) {
  return archive.files.map((entry, index) => {
    const storageRelativePath = storageNameForEntry(entry.archivePathInBackup, index);
    const destination = ensureInside(storageRoot, path.join(storageRoot, storageRelativePath));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, entry.data);
    return {
      archivePathInBackup: entry.archivePathInBackup,
      storageRelativePath,
    };
  });
}

function resetDirectory(target) {
  const resolved = path.resolve(target);
  if (resolved.length < 12 || path.parse(resolved).root === resolved) {
    throw new Error(`Refusing to reset unsafe storage root: ${target}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  fs.mkdirSync(resolved, { recursive: true });
}

function extractArchive(archivePath, archive, storageRoot, extractMode) {
  fs.mkdirSync(storageRoot, { recursive: true });
  if (extractMode === 'safe-entry' || extractMode === 'auto') {
    resetDirectory(storageRoot);
    return {
      extractionMode: extractMode === 'auto' ? 'safe-entry-js' : 'safe-entry',
      extractionMap: safeEntryExtractArchive(archive, storageRoot),
    };
  }

  resetDirectory(storageRoot);
  const result = spawnSync('tar', ['--force-local', '-xzf', archivePath, '-C', storageRoot], { encoding: 'utf8' });
  if (result.status !== 0) {
    if (extractMode === 'bulk') {
      throw new Error((result.stderr || result.stdout || 'tar extraction failed').trim());
    }
    resetDirectory(storageRoot);
    return {
      extractionMode: 'safe-entry-fallback',
      extractionMap: safeEntryExtractArchive(archive, storageRoot),
      fallbackReason: (result.stderr || result.stdout || 'tar extraction failed').trim().slice(0, 500),
    };
  }
  return { extractionMode: 'bulk', extractionMap: null };
}

function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function yearFromRelative(relativePath) {
  const match = relativePath.match(/(?:^|[\\/])((?:19|20)\d{2})(?:[\\/]|-|$)/);
  return match ? Number(match[1]) : null;
}

function toPortable(value) {
  return value.split(path.sep).join('/');
}

function buildManifest({ archivePath, batch, storageRoot, logicalRoot, extraction }) {
  const sourceFiles = extraction.extractionMap
    ? extraction.extractionMap.map((entry) => ({
      filePath: path.join(storageRoot, entry.storageRelativePath),
      relativeToStorage: entry.storageRelativePath,
      archivePathInBackup: entry.archivePathInBackup,
    }))
    : walkFiles(storageRoot).map((filePath) => ({
      filePath,
      relativeToStorage: path.relative(storageRoot, filePath),
      archivePathInBackup: toPortable(path.relative(storageRoot, filePath)),
    }));

  const files = sourceFiles.map(({ filePath, relativeToStorage, archivePathInBackup }) => {
    const privateStoragePath = toPortable(path.join(logicalRoot, relativeToStorage));
    const stat = fs.statSync(filePath);
    return {
      provider: 'KAAF',
      sourceTier: 'kaaf_backfill_original_file',
      batch,
      year: yearFromRelative(archivePathInBackup),
      originalFilename: path.posix.basename(archivePathInBackup),
      archivePathInBackup,
      privateStoragePath,
      extension: path.posix.extname(archivePathInBackup).toLowerCase() || '(none)',
      fileSize: stat.size,
      sha256: sha256(filePath),
      sourceArchive: path.basename(archivePath),
      reviewStatus: 'original_stored_not_row_imported',
    };
  });

  return {
    batch,
    generatedAt: new Date().toISOString(),
    sourceArchive: path.basename(archivePath),
    extractionMode: extraction.extractionMode,
    fallbackReason: extraction.fallbackReason || null,
    storagePolicy: {
      originalsTrackedByGit: false,
      committedArtifactsOnly: ['manifest', 'report'],
      privateStorageRoot: toPortable(logicalRoot),
    },
    files,
  };
}

function renderReport(manifest) {
  const byYear = {};
  const byExtension = {};
  for (const file of manifest.files) {
    byYear[file.year || 'unknown'] = (byYear[file.year || 'unknown'] || 0) + 1;
    byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
  }
  return [
    '# KAAF Backfill Originals Manifest',
    '',
    `- Batch: ${manifest.batch}`,
    `- Source archive: ${manifest.sourceArchive}`,
    `- Files: ${manifest.files.length}`,
    `- Originals tracked by Git: ${manifest.storagePolicy.originalsTrackedByGit}`,
    '',
    '## By Year',
    '',
    ...Object.entries(byYear).map(([year, count]) => `- ${year}: ${count}`),
    '',
    '## By Extension',
    '',
    ...Object.entries(byExtension).map(([extension, count]) => `- ${extension}: ${count}`),
    '',
    '## Operating Rule',
    '',
    'Original files are evidence and extraction sources. They are not public service data until row-level normalization is reviewed.',
  ].join('\n') + '\n';
}

function isTrackedByGit(targetPath) {
  const relative = path.relative(ROOT, targetPath);
  if (relative.startsWith('..')) return false;
  const result = spawnSync('git', ['check-ignore', '-q', relative], { cwd: ROOT });
  return result.status !== 0;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function main() {
  const archivePath = path.resolve(readArg('--archive') || '');
  if (!archivePath || !fs.existsSync(archivePath)) {
    fail('BACKFILL_ARCHIVE_NOT_FOUND', `Archive not found: ${archivePath}`);
    return;
  }

  const batch = readArg('--batch', DEFAULT_BATCH);
  const logicalRoot = toPortable(path.join('data', 'sources', 'import', 'originals', batch));
  const storageRoot = ensureInside(
    readArg('--storage-root', path.join(ROOT, logicalRoot)),
    readArg('--storage-root', path.join(ROOT, logicalRoot)),
  );
  const manifestPath = path.resolve(readArg('--manifest', path.join(ROOT, 'data', 'sources', 'manifests', `${batch}-manifest.json`)));
  const reportPath = path.resolve(readArg('--report', path.join(ROOT, 'data', 'sources', 'manifests', `${batch}-report.md`)));

  try {
    const archive = readArchive(archivePath);
    const archiveEntries = archive.entries;
    const extractMode = readArg('--extract-mode', 'auto');
    if (!['auto', 'bulk', 'safe-entry'].includes(extractMode)) {
      throw new Error(`Unsupported extract mode: ${extractMode}`);
    }
    const extraction = extractArchive(archivePath, archive, storageRoot, extractMode);
    const manifest = buildManifest({ archivePath, batch, storageRoot, logicalRoot, extraction });
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFile(reportPath, renderReport(manifest));

    const result = {
      ok: true,
      batch,
      archiveEntries: archiveEntries.length,
      fileCount: manifest.files.length,
      extractionMode: extraction.extractionMode,
      storageRoot,
      manifestPath,
      reportPath,
      storageTrackedByGit: isTrackedByGit(storageRoot),
    };
    if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else process.stdout.write(`backfill files:${result.fileCount}\n`);
  } catch (error) {
    fail('BACKFILL_IMPORT_FAILED', error.message);
  }
}

main();
