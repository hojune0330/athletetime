/**
 * 게시글 응답 비公开화(reduct) 유틸.
 *
 * 공격 표면 줄이기:
 * - 목록 응답에서 content 본문을 N자 프리뷰로 축소
 *   → 공격자가 1쿼리로 게시글 DB 전체 덤프하지 못하게 함.
 * - instagram 등 PII 비슷한 핸들은 마스킹
 * - user_id / password_hash / deleted_at 같은 내부 식별자 제거
 * - 댓글 본문도 동일 프리뷰 규칙 적용
 *
 * 단위 테스트: backend/tests/posts-list-redaction.test.js
 */

const PREVIEW_LENGTH = 280;

function maskInstagram(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.length <= 2) return '*'.repeat(value.length);
  return value[0] + '*'.repeat(Math.max(1, value.length - 2)) + value[value.length - 1];
}

function makePreview(content) {
  if (typeof content !== 'string' || content.length === 0) return '';
  if (content.length <= PREVIEW_LENGTH) return content;
  return content.slice(0, PREVIEW_LENGTH) + '…';
}

function redactPostListRow(row) {
  if (row === null || typeof row !== 'object') return row;
  const next = { ...row };

  // content 본문 전체 노출 차단
  if (typeof next.content === 'string') {
    next.content = makePreview(next.content);
    next.content_truncated = row.content.length > PREVIEW_LENGTH;
  }

  // 내부 식별자 제거
  if ('user_id' in next) delete next.user_id;
  if ('password_hash' in next) delete next.password_hash;
  if ('deleted_at' in next) delete next.deleted_at;

  // PII 마스킹
  if (typeof next.instagram === 'string') next.instagram = maskInstagram(next.instagram);

  // 이미지 메타는 썸네일·URL만 (cloudinary_id 같은 백엔드 식별자 제거)
  if (Array.isArray(next.images)) {
    next.images = next.images.map((img) => ({
      id: img.id,
      cloudinary_url: img.cloudinary_url,
      thumbnail_url: img.thumbnail_url,
      width: img.width,
      height: img.height,
    }));
  }

  // 댓글은 inline 프리뷰만
  if (Array.isArray(next.comments)) {
    next.comments = next.comments.map((c) => ({
      id: c.id,
      author: typeof c.author === 'string' ? c.author : null,
      content: typeof c.content === 'string' ? makePreview(c.content) : '',
      content_truncated: typeof c.content === 'string' && c.content.length > PREVIEW_LENGTH,
      created_at: c.created_at,
      is_blinded: c.is_blinded,
    }));
  }

  return next;
}

module.exports = {
  PREVIEW_LENGTH,
  maskInstagram,
  makePreview,
  redactPostListRow,
};
