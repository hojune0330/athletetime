#!/usr/bin/env node
/*
 * Automated regression script for vote toggling logic and image attachment pipeline.
 *
 * Usage:
 *   BACKEND_URL=https://<render-app>/community node test-votes-and-attachments.js
 *   # Defaults to http://localhost:3000 when BACKEND_URL is not provided
 */

const { randomUUID } = require('crypto');

let FormDataCtor = globalThis.FormData;
let FileCtor = globalThis.File;

if (!FormDataCtor || !FileCtor) {
  try {
    const undici = require('undici');
    FormDataCtor = FormDataCtor || undici.FormData;
    FileCtor = FileCtor || undici.File;
  } catch (error) {
    console.error('❌ Node runtime does not expose FormData/File APIs. Please upgrade to Node 18+ or install undici.');
    process.exit(1);
  }
}

const fetchFn = typeof fetch === 'function' ? fetch.bind(globalThis) : null;
if (!fetchFn) {
  console.error('❌ Global fetch API is not available. Upgrade Node to v18+ or enable the experimental fetch flag.');
  process.exit(1);
}

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function jsonFetch(url, options = {}) {
  const response = await fetchFn(url, options);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`응답 JSON 파싱 실패 (${url}): ${error.message}\n${text}`);
    }
  }
  if (!response.ok) {
    throw new Error(`요청 실패 (${response.status}) ${url}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log(`🔗 BACKEND_URL = ${BACKEND_URL}`);

  const boardsPayload = await jsonFetch(`${BACKEND_URL}/community/boards`);
  const boardId = boardsPayload?.data?.find((board) => board.slug === 'anonymous' || board.id === 'anonymous')?.id || 'anonymous';
  console.log(`📋 테스트 대상 게시판: ${boardId}`);

  const suffix = randomUUID().slice(0, 8);
  const password = `tester-${suffix}`;
  const imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2N8/fp/AwAI/AL+0Jp9XwAAAABJRU5ErkJggg==';
  const imageBuffer = Buffer.from(imageBase64, 'base64');

  const form = new FormDataCtor();
  form.append('boardId', boardId);
  form.append('title', `[자동화] 이미지 파이프라인 점검 ${suffix}`);
  form.append('content', `이 글은 자동화 테스트에서 생성되었습니다. timestamp=${Date.now()}`);
  form.append('authorNick', '테스트봇');
  form.append('password', password);
  form.append('tags[]', '자동화');
  form.append('tags[]', '테스트');
  form.append('attachments', new FileCtor([imageBuffer], `pipeline-${suffix}.png`, { type: 'image/png' }));

  const createResponse = await fetchFn(`${BACKEND_URL}/community/posts`, {
    method: 'POST',
    body: form,
  });

  if (!createResponse.ok) {
    const failure = await createResponse.text();
    throw new Error(`게시글 생성 실패 (${createResponse.status}): ${failure}`);
  }

  const createdPost = await createResponse.json();
  assert(createdPost && createdPost.id, '생성 응답에서 게시글 ID를 찾을 수 없습니다');
  const postId = createdPost.id;
  console.log(`🆕 게시글 생성 완료 (ID: ${postId})`);

  assert(Array.isArray(createdPost.attachments), '생성 응답에 첨부파일 배열이 없습니다');
  assert(createdPost.attachments.length > 0, '생성 응답의 첨부파일 길이가 0입니다');
  const processedAttachment = createdPost.attachments[0];
  assert(processedAttachment.variant === 'image', '처리된 첨부파일 variant가 image가 아닙니다');
  assert(Boolean(processedAttachment.thumbnailUrl), '첨부파일 썸네일 URL이 누락되었습니다');
  assert(Boolean(processedAttachment.fileUrl), '첨부파일 URL이 누락되었습니다');

  const detail = await jsonFetch(`${BACKEND_URL}/community/posts/${postId}`);
  assert(Array.isArray(detail.attachments) && detail.attachments.length > 0, '상세 조회에서 첨부파일이 없습니다');
  const detailedAttachment = detail.attachments[0];
  assert(typeof detailedAttachment.cleanupStage === 'number', '상세 첨부파일에 cleanupStage 메타데이터가 없습니다');
  assert(Array.isArray(detail.images) && detail.images.length > 0, '상세 조회 images 배열이 비어 있습니다');

  const voteEndpoint = `${BACKEND_URL}/community/posts/${postId}/vote`;
  const voterId = `vote-bot-${suffix}`;

  const likeResponse = await jsonFetch(voteEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: voterId, type: 'like' }),
  });
  assert(likeResponse.success === true, '좋아요 응답 success 플래그가 true가 아닙니다');
  assert(likeResponse.post.likeCount === 1, '좋아요 카운트가 1이 아닙니다');
  assert(likeResponse.post.userVote === 'like', 'userVote 값이 like가 아닙니다');

  const toggleResponse = await jsonFetch(voteEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: voterId, type: 'like' }),
  });
  assert(toggleResponse.post.likeCount === 0, '좋아요 토글 해제 후 카운트가 0이 아닙니다');
  assert(toggleResponse.post.userVote === null, '좋아요 토글 해제 후 userVote가 null이 아닙니다');

  const dislikeResponse = await jsonFetch(voteEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: voterId, type: 'dislike' }),
  });
  assert(dislikeResponse.post.dislikeCount === 1, '싫어요 카운트가 1이 아닙니다');
  assert(dislikeResponse.post.userVote === 'dislike', '싫어요 적용 후 userVote가 dislike가 아닙니다');
  assert(dislikeResponse.post.isBlinded === false, '초기 싫어요 상태에서 isBlinded가 true입니다');

  console.log('✅ 투표 토글 및 이미지 첨부 파이프라인 검증 완료');
  console.log('ℹ️ 생성된 테스트 게시글은 검수 목적으로 남겨둡니다. 필요시 비밀번호로 직접 삭제하세요.');
}

main().catch((error) => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
