'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  throw new Error('XLSX_ZIP_EOCD_NOT_FOUND');
}

function readCentralDirectory(buffer, offset, entryCount) {
  const entries = [];
  let cursor = offset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw new Error('XLSX_ZIP_CENTRAL_DIRECTORY_CORRUPT');
    }
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString('utf8');
    entries.push({ compressedSize, localOffset, method, name });
    cursor = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readLocalPayload(buffer, entry) {
  const cursor = entry.localOffset;
  if (buffer.readUInt32LE(cursor) !== LOCAL_SIGNATURE) {
    throw new Error(`XLSX_ZIP_LOCAL_HEADER_CORRUPT:${entry.name}`);
  }
  const fileNameLength = buffer.readUInt16LE(cursor + 26);
  const extraLength = buffer.readUInt16LE(cursor + 28);
  const dataStart = cursor + 30 + fileNameLength + extraLength;
  const payload = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return Buffer.from(payload);
  if (entry.method === 8) return zlib.inflateRawSync(payload);
  throw new Error(`XLSX_ZIP_UNSUPPORTED_COMPRESSION:${entry.method}:${entry.name}`);
}

function readZipEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = readCentralDirectory(buffer, centralOffset, entryCount);
  const result = new Map();

  for (const entry of entries) {
    if (!entry.name.endsWith('/')) result.set(entry.name, readLocalPayload(buffer, entry));
  }

  return result;
}

module.exports = {
  readZipEntries,
};
