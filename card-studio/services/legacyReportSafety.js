'use strict';

const FORBIDDEN_REPORT_TEXT = /privateStoragePath|sourcePath|data[\\/]sources[\\/]import[\\/]originals|PERSON_NO|birthdate|phone|email|address|secret|010-\d{3,4}-\d{4}/iu;

function sha256Prefix(value) {
  return String(value || '').slice(0, 12);
}

function sanitizeReportString(value) {
  const text = String(value || '');
  return FORBIDDEN_REPORT_TEXT.test(text) ? '[redacted]' : text;
}

module.exports = {
  FORBIDDEN_REPORT_TEXT,
  sanitizeReportString,
  sha256Prefix,
};
