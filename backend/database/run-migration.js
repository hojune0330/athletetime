/**
 * 데이터베이스 마이그레이션 실행 스크립트
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🚀 데이터베이스 마이그레이션 시작...');

    // 마이그레이션 파일 읽기
    const migrationPath = path.join(__dirname, 'migration-001-add-auth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // 마이그레이션 실행
    await pool.query(migrationSQL);

    console.log('✅ 마이그레이션 완료!');
    console.log('');
    console.log('추가된 기능:');
    console.log('  - 이메일 회원가입');
    console.log('  - JWT 인증');
    console.log('  - 이메일 인증 시스템');
    console.log('  - Refresh Token 관리');
    console.log('  - 로그인 히스토리');
    console.log('  - 이메일 발송 로그');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 실행
runMigration();
