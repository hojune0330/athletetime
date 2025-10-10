// 기존 평문 비밀번호를 bcrypt로 마이그레이션하는 스크립트
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

const SALT_ROUNDS = 10;

async function migratePasswords() {
  console.log('🔄 비밀번호 마이그레이션 시작...\n');
  
  try {
    // 1. posts 테이블의 비밀번호 마이그레이션
    console.log('📝 게시글 비밀번호 마이그레이션 중...');
    
    // 모든 게시글 조회
    const { rows: posts } = await pool.query('SELECT id, password FROM posts WHERE password IS NOT NULL');
    console.log(`   총 ${posts.length}개 게시글 발견`);
    
    let migratedPosts = 0;
    for (const post of posts) {
      // 이미 해시된 비밀번호인지 확인 (bcrypt 해시는 $2로 시작)
      if (post.password && !post.password.startsWith('$2')) {
        try {
          const hashedPassword = await bcrypt.hash(post.password, SALT_ROUNDS);
          await pool.query(
            'UPDATE posts SET password = $1 WHERE id = $2',
            [hashedPassword, post.id]
          );
          migratedPosts++;
        } catch (err) {
          console.error(`   ⚠️ Post ${post.id} 마이그레이션 실패:`, err.message);
        }
      }
    }
    console.log(`   ✅ ${migratedPosts}개 게시글 비밀번호 암호화 완료\n`);
    
    // 2. comments 테이블의 비밀번호 마이그레이션
    console.log('💬 댓글 비밀번호 마이그레이션 중...');
    
    const { rows: comments } = await pool.query('SELECT id, password FROM comments WHERE password IS NOT NULL');
    console.log(`   총 ${comments.length}개 댓글 발견`);
    
    let migratedComments = 0;
    for (const comment of comments) {
      if (comment.password && !comment.password.startsWith('$2')) {
        try {
          const hashedPassword = await bcrypt.hash(comment.password, SALT_ROUNDS);
          await pool.query(
            'UPDATE comments SET password = $1 WHERE id = $2',
            [hashedPassword, comment.id]
          );
          migratedComments++;
        } catch (err) {
          console.error(`   ⚠️ Comment ${comment.id} 마이그레이션 실패:`, err.message);
        }
      }
    }
    console.log(`   ✅ ${migratedComments}개 댓글 비밀번호 암호화 완료\n`);
    
    // 3. 결과 요약
    console.log('═══════════════════════════════════');
    console.log('✨ 마이그레이션 완료!');
    console.log(`   - 게시글: ${migratedPosts}개 암호화`);
    console.log(`   - 댓글: ${migratedComments}개 암호화`);
    console.log('═══════════════════════════════════\n');
    
    // 4. 샘플 확인
    if (migratedPosts > 0) {
      const { rows: sample } = await pool.query('SELECT id, password FROM posts LIMIT 1');
      if (sample.length > 0) {
        console.log('📌 암호화 샘플:');
        console.log(`   ID: ${sample[0].id}`);
        console.log(`   암호화된 비밀번호: ${sample[0].password.substring(0, 20)}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
  } finally {
    await pool.end();
  }
}

// 실행
migratePasswords();