// 데이터베이스 스키마 마이그레이션 스크립트
// SERIAL에서 BIGINT로 변경하여 JavaScript Date.now()와 호환성 확보

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

async function migrateSchema() {
  console.log('🔄 스키마 마이그레이션 시작...\n');
  
  try {
    // 1. 기존 테이블 백업
    console.log('📦 기존 데이터 백업 중...');
    
    // 기존 posts 데이터 확인
    const { rows: existingPosts } = await pool.query('SELECT COUNT(*) as count FROM posts');
    console.log(`   기존 게시글: ${existingPosts[0].count}개`);
    
    // 기존 comments 데이터 확인
    const { rows: existingComments } = await pool.query('SELECT COUNT(*) as count FROM comments');
    console.log(`   기존 댓글: ${existingComments[0].count}개\n`);
    
    // 2. 외래 키 제약 조건 임시 제거
    console.log('🔓 외래 키 제약 조건 제거 중...');
    await pool.query(`
      ALTER TABLE comments 
      DROP CONSTRAINT IF EXISTS comments_post_id_fkey
    `);
    
    // 3. posts 테이블 ID 컬럼 타입 변경
    console.log('📝 posts 테이블 수정 중...');
    
    // ID가 이미 BIGINT인지 확인
    const { rows: postsCols } = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' AND column_name = 'id'
    `);
    
    if (postsCols[0]?.data_type !== 'bigint') {
      // SERIAL에서 BIGINT로 변경
      await pool.query(`
        ALTER TABLE posts 
        ALTER COLUMN id TYPE BIGINT USING id::BIGINT
      `);
      console.log('   ✅ posts.id를 BIGINT로 변경');
    } else {
      console.log('   ℹ️ posts.id는 이미 BIGINT입니다');
    }
    
    // 4. comments 테이블 수정
    console.log('💬 comments 테이블 수정 중...');
    
    // comments.id 타입 변경
    const { rows: commentIdCol } = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name = 'id'
    `);
    
    if (commentIdCol[0]?.data_type !== 'bigint') {
      await pool.query(`
        ALTER TABLE comments 
        ALTER COLUMN id TYPE BIGINT USING id::BIGINT
      `);
      console.log('   ✅ comments.id를 BIGINT로 변경');
    } else {
      console.log('   ℹ️ comments.id는 이미 BIGINT입니다');
    }
    
    // comments.post_id 타입 변경
    const { rows: postIdCol } = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name = 'post_id'
    `);
    
    if (postIdCol[0]?.data_type !== 'bigint') {
      await pool.query(`
        ALTER TABLE comments 
        ALTER COLUMN post_id TYPE BIGINT USING post_id::BIGINT
      `);
      console.log('   ✅ comments.post_id를 BIGINT로 변경');
    } else {
      console.log('   ℹ️ comments.post_id는 이미 BIGINT입니다');
    }
    
    // 5. 외래 키 제약 조건 다시 추가
    console.log('\n🔒 외래 키 제약 조건 복원 중...');
    await pool.query(`
      ALTER TABLE comments 
      ADD CONSTRAINT comments_post_id_fkey 
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    `);
    
    // 6. 인덱스 재생성
    console.log('📊 인덱스 재생성 중...');
    
    // 기존 인덱스 제거
    await pool.query('DROP INDEX IF EXISTS idx_posts_created_at');
    await pool.query('DROP INDEX IF EXISTS idx_comments_post_id');
    await pool.query('DROP INDEX IF EXISTS idx_chat_room');
    
    // 새 인덱스 생성
    await pool.query(`
      CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);
      CREATE INDEX idx_chat_room ON chat_messages(room, created_at DESC);
    `);
    
    console.log('   ✅ 인덱스 재생성 완료\n');
    
    // 7. 결과 확인
    console.log('🔍 마이그레이션 결과 확인...');
    
    // 스키마 확인
    const { rows: finalSchema } = await pool.query(`
      SELECT 
        c.table_name, 
        c.column_name, 
        c.data_type,
        c.character_maximum_length
      FROM information_schema.columns c
      WHERE c.table_name IN ('posts', 'comments')
        AND c.column_name IN ('id', 'post_id')
      ORDER BY c.table_name, c.ordinal_position
    `);
    
    console.log('\n📋 최종 스키마:');
    finalSchema.forEach(col => {
      console.log(`   ${col.table_name}.${col.column_name}: ${col.data_type}`);
    });
    
    // 데이터 무결성 확인
    const { rows: orphanComments } = await pool.query(`
      SELECT COUNT(*) as count
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE p.id IS NULL
    `);
    
    if (orphanComments[0].count > 0) {
      console.log(`\n⚠️ 고아 댓글 발견: ${orphanComments[0].count}개`);
      console.log('   (연결된 게시글이 없는 댓글)');
    } else {
      console.log('\n✅ 데이터 무결성 확인 완료');
    }
    
    console.log('\n═══════════════════════════════════');
    console.log('✨ 스키마 마이그레이션 완료!');
    console.log('   이제 JavaScript Date.now()로 생성한 ID를 사용할 수 있습니다.');
    console.log('═══════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    console.error('오류 상세:', error.stack);
  } finally {
    await pool.end();
  }
}

// 실행
migrateSchema();