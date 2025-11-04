/**
 * 테스트 사용자 생성 스크립트
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function createTestUser() {
  try {
    console.log('👤 테스트 사용자 생성 중...\n');

    // 기존 사용자 확인
    const existingUser = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [TEST_USER_ID]
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ 테스트 사용자가 이미 존재합니다:');
      console.log('   ID:', existingUser.rows[0].id);
      console.log('   Email:', existingUser.rows[0].email);
      return;
    }

    // 테스트 사용자 생성
    const result = await pool.query(`
      INSERT INTO users (
        id,
        email,
        username,
        profile_image_url,
        created_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW()
      )
      RETURNING id, email, username
    `, [
      TEST_USER_ID,
      'poll-test-user@athletetime.com',
      'Poll Test User',
      'https://ui-avatars.com/api/?name=Poll+Test'
    ]);

    console.log('✅ 테스트 사용자 생성 완료:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Email:', result.rows[0].email);
    console.log('   Username:', result.rows[0].username);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

createTestUser();
