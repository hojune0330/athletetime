/**
 * Poll 투표 디버깅 스크립트
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function debugPollVote() {
  try {
    console.log('🔍 Poll 투표 디버깅 시작...\n');

    // 1. Post 7번 존재 확인
    console.log('1️⃣ Post 7번 확인:');
    const postCheck = await pool.query('SELECT id, title, poll FROM posts WHERE id = 7');
    if (postCheck.rows.length === 0) {
      console.log('❌ Post 7번이 존재하지 않습니다!');
      return;
    }
    console.log('✅ Post 존재:', postCheck.rows[0].title);
    console.log('   Poll 데이터:', JSON.stringify(postCheck.rows[0].poll, null, 2));

    // 2. vote_poll 함수 존재 확인
    console.log('\n2️⃣ vote_poll 함수 확인:');
    const funcCheck = await pool.query(`
      SELECT proname, pg_get_function_arguments(oid) as args
      FROM pg_proc
      WHERE proname = 'vote_poll'
    `);
    if (funcCheck.rows.length === 0) {
      console.log('❌ vote_poll 함수가 존재하지 않습니다!');
      console.log('   마이그레이션을 실행해야 합니다.');
      return;
    }
    console.log('✅ 함수 존재:', funcCheck.rows[0].proname);
    console.log('   인자:', funcCheck.rows[0].args);

    // 3. 테스트 사용자 확인
    console.log('\n3️⃣ 테스트 사용자 확인:');
    const userCheck = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      ['550e8400-e29b-41d4-a716-446655440000']
    );
    if (userCheck.rows.length === 0) {
      console.log('❌ 테스트 사용자가 존재하지 않습니다!');
      return;
    }
    console.log('✅ 사용자 존재:', userCheck.rows[0].email);

    // 4. 실제 투표 시도
    console.log('\n4️⃣ 투표 시도:');
    try {
      const voteResult = await pool.query(
        'SELECT vote_poll($1, $2, $3) as updated_poll',
        [7, '550e8400-e29b-41d4-a716-446655440000', [1]]
      );
      console.log('✅ 투표 성공!');
      console.log('   결과:', JSON.stringify(voteResult.rows[0].updated_poll, null, 2));
    } catch (voteError) {
      console.log('❌ 투표 실패:', voteError.message);
      console.log('   상세:', voteError);
    }

    // 5. 현재 투표 결과 확인
    console.log('\n5️⃣ 현재 투표 결과:');
    const resultsCheck = await pool.query('SELECT * FROM poll_votes WHERE post_id = 7');
    console.log('   총 투표 수:', resultsCheck.rows.length);
    console.log('   투표 내역:', resultsCheck.rows);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

debugPollVote();
