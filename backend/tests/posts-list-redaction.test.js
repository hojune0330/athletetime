/**
 * posts 목록 응답 redaction 단위 테스트 (P0-F4).
 *
 * 공격 표면:
 *   GET /api/posts 의 posts[] 항목이 content 본문 10,000자, instagram 핸들,
 *   user_id, password_hash 같은 PII/내부 식별자를 그대로 노출하는 문제.
 *
 * 검증:
 *   redaction 적용 시 모든 항목에서 위 정보가 제거/축소되어야 함.
 *
 * 실행: node --test backend/tests/posts-list-redaction.test.js
 */

const test = require('node:test');
const assert = require('node:assert');

const { redactPostListRow, makePreview, maskInstagram, PREVIEW_LENGTH } = require(
  '../utils/postRedaction'
);

test('PREVIEW_LENGTH 상수는 280 이하다', () => {
  assert.ok(PREVIEW_LENGTH <= 280, 'preview should not exceed 280 chars to limit enumerator payload');
  assert.ok(PREVIEW_LENGTH >= 80, 'preview should not be too small to be useful');
});

test('maskInstagram: 짧은 값은 모두 마스킹한다', () => {
  assert.strictEqual(maskInstagram(''), null);
  assert.strictEqual(maskInstagram('a'), '*');
  assert.strictEqual(maskInstagram('ab'), '**');
  // 길이 N이면 첫 글자 + (N-2)개 * + 마지막 글자 (마스킹 폭 = max(1, N-2))
  assert.strictEqual(maskInstagram('abc'), 'a*c');
  assert.strictEqual(maskInstagram('abcd'), 'a**d');
  assert.strictEqual(maskInstagram('abcdefgh'), 'a******h');
});

test('makePreview: 짧은 본문은 그대로, 긴 본문은 잘라낸다', () => {
  const short = 'a'.repeat(10);
  assert.strictEqual(makePreview(short), short);

  const long = 'b'.repeat(PREVIEW_LENGTH + 100);
  const out = makePreview(long);
  assert.strictEqual(out.length, PREVIEW_LENGTH + 1); // trailing …
  assert.ok(out.endsWith('…'));
});

test('makePreview: 비문자열/null/undefined 방어', () => {
  assert.strictEqual(makePreview(null), '');
  assert.strictEqual(makePreview(undefined), '');
  assert.strictEqual(makePreview(123), '');
});

test('redactPostListRow: content 본문은 프리뷰로 축소', () => {
  const row = {
    id: 'post-1',
    title: 't',
    content: 'c'.repeat(1000),
    views: 5,
    user_id: 'internal-uuid',
    password_hash: '$2a$10$abcdef',
    instagram: 'hojune_real',
  };
  const out = redactPostListRow(row);
  assert.ok(out.content.length <= PREVIEW_LENGTH + 1, 'content should be preview-only');
  assert.strictEqual(out.content_truncated, true);
  // 내부 식별자 제거
  assert.strictEqual(out.user_id, undefined);
  assert.strictEqual(out.password_hash, undefined);
  // 핸들 마스킹
  assert.notStrictEqual(out.instagram, 'hojune_real');
  assert.ok(out.instagram.startsWith('h') && out.instagram.endsWith('l'));
});

test('redactPostListRow: 짧은 content는 그대로 + content_truncated=false', () => {
  const row = { content: 'hello', instagram: null };
  const out = redactPostListRow(row);
  assert.strictEqual(out.content, 'hello');
  assert.strictEqual(out.content_truncated, false);
});

test('redactPostListRow: 이미지는 안전 필드만 남긴다', () => {
  const row = {
    content: 'x',
    images: [
      {
        id: 1,
        cloudinary_url: 'https://res.cloudinary.com/demo/x.jpg',
        thumbnail_url: 'https://res.cloudinary.com/demo/x_thumb.jpg',
        cloudinary_id: 'demo/x',
        width: 100,
        height: 100,
      },
    ],
  };
  const out = redactPostListRow(row);
  assert.strictEqual(out.images.length, 1);
  assert.ok(!('cloudinary_id' in out.images[0]), 'cloudinary_id should be removed');
  assert.strictEqual(out.images[0].cloudinary_url, row.images[0].cloudinary_url);
});

test('redactPostListRow: 댓글은 프리뷰 + 인라인만', () => {
  const row = {
    content: 'x',
    comments: [
      {
        id: 1,
        author: 'realuser',
        content: 'y'.repeat(500),
        instagram: '@realuser',
        created_at: new Date(),
        is_blinded: false,
      },
    ],
  };
  const out = redactPostListRow(row);
  assert.ok(out.comments[0].content.length <= PREVIEW_LENGTH + 1);
  assert.strictEqual(out.comments[0].content_truncated, true);
  assert.ok(!('instagram' in out.comments[0]), 'comment instagram should be stripped');
});

test('redactPostListRow: null/비객체 입력 방어', () => {
  assert.strictEqual(redactPostListRow(null), null);
  assert.strictEqual(redactPostListRow(undefined), undefined);
  assert.strictEqual(redactPostListRow('string'), 'string');
});

test('redactPostListRow: 원본 객체를 변형하지 않는다', () => {
  const row = {
    content: 'a'.repeat(1000),
    user_id: 'uuid',
    instagram: 'hojune_real',
  };
  const snapshot = JSON.stringify(row);
  redactPostListRow(row);
  assert.strictEqual(JSON.stringify(row), snapshot, 'redaction must be immutable');
});
