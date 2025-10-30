/**
 * PostgreSQL 데이터베이스 연결 유틸리티
 */

const { Pool } = require('pg');

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 연결 테스트
pool.on('connect', () => {
  console.log('✅ PostgreSQL 데이터베이스 연결 성공');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 연결 오류:', err);
});

/**
 * 쿼리 실행 함수
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️ 느린 쿼리 감지 (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('❌ 쿼리 실행 오류:', error);
    console.error('쿼리:', text);
    console.error('파라미터:', params);
    throw error;
  }
}

/**
 * 트랜잭션 시작
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * 연결 풀 종료
 */
async function end() {
  await pool.end();
  console.log('PostgreSQL 연결 풀 종료');
}

module.exports = {
  query,
  getClient,
  end,
  pool
};
