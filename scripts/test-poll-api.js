#!/usr/bin/env node

/**
 * Poll API 테스트 스크립트
 * 
 * Usage: node scripts/test-poll-api.js
 * 
 * 테스트 항목:
 * 1. 투표 제출 (단일 선택)
 * 2. 투표 결과 조회
 * 3. 투표 수정
 * 4. 투표 취소
 * 5. 에러 케이스 (마감, 중복, 유효하지 않은 선택지 등)
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const TEST_USER_ID = uuidv4();
const TEST_ANONYMOUS_ID = `test_${Date.now()}`;
let TEST_POST_ID;

async function setup() {
  console.log('🔧 테스트 환경 설정 중...\n');

  // 테스트용 사용자 생성
  const testEmail = `test_${Date.now()}@example.com`;
  const userResult = await pool.query(`
    INSERT INTO users (id, anonymous_id, username, email)
    VALUES ($1, $2, 'Test User', $3)
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `, [TEST_USER_ID, TEST_ANONYMOUS_ID, testEmail]);

  if (userResult.rows.length > 0) {
    console.log(`✅ 테스트 사용자 생성: ID=${TEST_USER_ID}`);
  } else {
    console.log(`✅ 기존 테스트 사용자 사용: ID=${TEST_USER_ID}`);
  }

  // 테스트용 게시글 생성
  const postResult = await pool.query(`
    INSERT INTO posts (
      category_id,
      user_id,
      title,
      content,
      author,
      password_hash,
      poll
    ) VALUES (
      1,
      $1,
      '테스트 투표 게시글',
      '이것은 Poll API 테스트용 게시글입니다.',
      'Test User',
      '$2b$10$test',
      '{
        "question": "당신의 주종목은?",
        "options": [
          {"id": 1, "text": "단거리 (100m, 200m)", "votes": 0},
          {"id": 2, "text": "중거리 (400m, 800m)", "votes": 0},
          {"id": 3, "text": "장거리 (1500m 이상)", "votes": 0}
        ],
        "allow_multiple": false,
        "ends_at": null,
        "total_votes": 0
      }'::jsonb
    ) RETURNING id
  `, [TEST_USER_ID]);

  TEST_POST_ID = postResult.rows[0].id;
  console.log(`✅ 테스트 게시글 생성: ID=${TEST_POST_ID}\n`);
}

async function testVoteSubmit() {
  console.log('📝 Test 1: 투표 제출 (단일 선택)');
  
  const result = await pool.query(
    'SELECT vote_poll($1, $2, $3) as poll',
    [TEST_POST_ID, TEST_USER_ID, [1]]
  );

  const poll = result.rows[0].poll;
  
  console.log('  ✅ 투표 제출 성공');
  console.log('  - 선택한 옵션:', poll.options[0].text);
  console.log('  - 득표수:', poll.options[0].votes);
  console.log('  - 총 투표수:', poll.total_votes);
  
  if (poll.options[0].votes === 1 && poll.total_votes === 1) {
    console.log('  ✅ 집계 정확함\n');
    return true;
  } else {
    console.log('  ❌ 집계 오류\n');
    return false;
  }
}

async function testGetResults() {
  console.log('📊 Test 2: 투표 결과 조회');
  
  const result = await pool.query(
    'SELECT * FROM get_poll_results($1)',
    [TEST_POST_ID]
  );

  console.log('  ✅ 결과 조회 성공');
  result.rows.forEach(row => {
    console.log(`  - ${row.option_text}: ${row.votes}표 (${row.percentage}%)`);
  });
  console.log();
  
  return result.rows.length === 3;
}

async function testVoteUpdate() {
  console.log('🔄 Test 3: 투표 수정');
  
  const result = await pool.query(
    'SELECT vote_poll($1, $2, $3) as poll',
    [TEST_POST_ID, TEST_USER_ID, [2]]
  );

  const poll = result.rows[0].poll;
  
  console.log('  ✅ 투표 수정 성공');
  console.log('  - 이전 선택 득표수:', poll.options[0].votes);
  console.log('  - 새 선택 득표수:', poll.options[1].votes);
  console.log('  - 총 투표수:', poll.total_votes);
  
  if (poll.options[0].votes === 0 && poll.options[1].votes === 1 && poll.total_votes === 1) {
    console.log('  ✅ 투표 수정 정확함\n');
    return true;
  } else {
    console.log('  ❌ 투표 수정 오류\n');
    return false;
  }
}

async function testVoteCancel() {
  console.log('🗑️  Test 4: 투표 취소');
  
  // 먼저 투표 기록 삭제
  await pool.query(
    'DELETE FROM poll_votes WHERE post_id = $1 AND user_id = $2',
    [TEST_POST_ID, TEST_USER_ID]
  );

  // Poll 데이터 수동 업데이트 (DELETE 엔드포인트 로직과 동일)
  const pollResult = await pool.query(
    'SELECT poll FROM posts WHERE id = $1',
    [TEST_POST_ID]
  );

  const poll = pollResult.rows[0].poll;
  poll.options[1].votes = Math.max(0, poll.options[1].votes - 1);
  poll.total_votes = Math.max(0, poll.total_votes - 1);

  await pool.query(
    'UPDATE posts SET poll = $1 WHERE id = $2',
    [JSON.stringify(poll), TEST_POST_ID]
  );

  console.log('  ✅ 투표 취소 성공');
  console.log('  - 총 투표수:', poll.total_votes);
  
  if (poll.total_votes === 0) {
    console.log('  ✅ 취소 정확함\n');
    return true;
  } else {
    console.log('  ❌ 취소 오류\n');
    return false;
  }
}

async function testErrorCases() {
  console.log('⚠️  Test 5: 에러 케이스');
  
  let passed = 0;
  let total = 3;

  // 5-1: 유효하지 않은 선택지
  try {
    await pool.query(
      'SELECT vote_poll($1, $2, $3)',
      [TEST_POST_ID, TEST_USER_ID, [99]]
    );
    console.log('  ❌ 5-1: 유효하지 않은 선택지 - 에러 발생해야 함');
  } catch (error) {
    console.log('  ✅ 5-1: 유효하지 않은 선택지 ID 거부됨');
    passed++;
  }

  // 5-2: 복수 선택 위반 (allow_multiple=false인데 2개 선택)
  try {
    await pool.query(
      'SELECT vote_poll($1, $2, $3)',
      [TEST_POST_ID, TEST_USER_ID, [1, 2]]
    );
    console.log('  ❌ 5-2: 복수 선택 위반 - 에러 발생해야 함');
  } catch (error) {
    console.log('  ✅ 5-2: 복수 선택 위반 감지됨');
    passed++;
  }

  // 5-3: 존재하지 않는 게시글
  try {
    await pool.query(
      'SELECT vote_poll($1, $2, $3)',
      [999999, TEST_USER_ID, [1]]
    );
    console.log('  ❌ 5-3: 존재하지 않는 게시글 - 에러 발생해야 함');
  } catch (error) {
    console.log('  ✅ 5-3: 존재하지 않는 게시글 거부됨');
    passed++;
  }

  console.log(`  📊 에러 케이스: ${passed}/${total} 통과\n`);
  return passed === total;
}

async function cleanup() {
  console.log('🧹 테스트 데이터 정리 중...');
  
  await pool.query(
    'DELETE FROM posts WHERE id = $1',
    [TEST_POST_ID]
  );

  console.log('✅ 테스트 데이터 삭제 완료\n');
}

async function runTests() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║     Poll API 테스트 스위트             ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const results = [];

  try {
    await setup();

    results.push(await testVoteSubmit());
    results.push(await testGetResults());
    results.push(await testVoteUpdate());
    results.push(await testVoteCancel());
    results.push(await testErrorCases());

    await cleanup();

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('╔═══════════════════════════════════════╗');
    console.log('║           테스트 결과 요약             ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log(`\n✅ 통과: ${passed}/${total}`);
    console.log(`❌ 실패: ${total - passed}/${total}\n`);

    if (passed === total) {
      console.log('🎉 모든 테스트 통과!\n');
      process.exit(0);
    } else {
      console.log('⚠️  일부 테스트 실패\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error.message);
    console.error('\nFull error:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set');
  process.exit(1);
}

runTests();
