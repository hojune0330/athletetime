const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT_PATH = path.join(ROOT, 'docs/athletetime-private-memo-v1-contract.md');

test('PRIVATE-MEMO-CONTRACT-001 v1 safety contract names every non-negotiable boundary', () => {
  const contract = fs.readFileSync(CONTRACT_PATH, 'utf8');

  for (const required of [
    '제목과 본문은 암호화',
    '최근 재인증 10분',
    '삭제 후 30일',
    '계정 소유자',
    'MEMO_NOT_FOUND',
    'Cache-Control: no-store',
    '첨부 없음',
    '나만 볼 수 있는 개인 메모예요.',
    '공용 기기라면 끝나고 로그아웃하세요.',
    '30일 안에는 휴지통에서 되돌릴 수 있어요.',
  ]) {
    assert.ok(contract.includes(required), `missing private memo safety boundary: ${required}`);
  }
});

test('PRIVATE-MEMO-CONTRACT-002 v1 forbids public record links, uploads, and operator access', () => {
  const contract = fs.readFileSync(CONTRACT_PATH, 'utf8');
  const prohibitedSection = sectionAfter(contract, '## v1에서 절대 연결하지 않는 대상');

  for (const forbidden of [
    'athleteKey',
    'recordId',
    'sourceId',
    'attachment',
    'Cloudinary',
    'multipart',
    '공개 업로드',
    '운영자 본문 열람',
  ]) {
    assert.ok(prohibitedSection.includes(forbidden), `contract must forbid: ${forbidden}`);
  }

  assert.doesNotMatch(prohibitedSection, /허용(?:\s*대상)?\s*[:：].*(athleteKey|recordId|sourceId|attachment|Cloudinary|multipart)/i);
});

function sectionAfter(document, heading) {
  const start = document.indexOf(heading);
  assert.notEqual(start, -1, `missing contract section: ${heading}`);

  const nextHeading = document.indexOf('\n## ', start + heading.length);
  return document.slice(start, nextHeading === -1 ? undefined : nextHeading);
}
