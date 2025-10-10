// 댓글 기능 테스트 스크립트
const TEST_URL = process.env.PROD ? 
  'https://athletetime-backend.onrender.com' : 
  'http://localhost:3000';

console.log('💬 댓글 기능 테스트');
console.log('🌐 테스트 환경:', TEST_URL);
console.log('═══════════════════════════════════\n');

let testPostId = null;

// 1. 테스트용 게시글 생성
async function createTestPost() {
  console.log('📝 테스트 게시글 생성 중...');
  
  const testPost = {
    title: '댓글 테스트 게시글 ' + Date.now(),
    author: '테스터',
    content: '댓글 기능을 테스트하기 위한 게시글입니다.',
    category: '테스트',
    password: 'test123'
  };
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPost)
    });
    
    const data = await response.json();
    if (data.success) {
      testPostId = data.post.id;
      console.log('✅ 게시글 생성 성공! ID:', testPostId);
      return testPostId;
    } else {
      console.error('❌ 게시글 생성 실패:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
    return null;
  }
}

// 2. 댓글 추가 테스트
async function testAddComment(postId) {
  console.log('\n💬 댓글 추가 테스트');
  
  const comments = [
    { author: '댓글러1', content: '첫 번째 댓글입니다!', instagram: 'user1' },
    { author: '댓글러2', content: '두 번째 댓글이에요~', instagram: 'user2' },
    { author: '익명', content: '익명 댓글도 테스트', instagram: '' }
  ];
  
  const addedComments = [];
  
  for (const comment of comments) {
    try {
      const response = await fetch(`${TEST_URL}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      
      const data = await response.json();
      if (data.success) {
        console.log(`✅ 댓글 추가 성공: "${comment.content.substring(0, 20)}..."`);
        console.log(`   ID: ${data.comment.id}, 작성자: ${data.comment.author}`);
        addedComments.push(data.comment);
      } else {
        console.log(`❌ 댓글 추가 실패:`, data.message);
      }
    } catch (error) {
      console.error(`❌ 오류:`, error.message);
    }
  }
  
  return addedComments;
}

// 3. 게시글 상세 조회 (댓글 포함)
async function testGetPostWithComments(postId) {
  console.log('\n📖 게시글 상세 조회 (댓글 확인)');
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${postId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 게시글 조회 성공!');
      console.log('   제목:', data.post.title);
      console.log('   댓글 수:', data.post.comments ? data.post.comments.length : 0);
      
      if (data.post.comments && data.post.comments.length > 0) {
        console.log('\n   📋 댓글 목록:');
        data.post.comments.forEach((comment, index) => {
          console.log(`   ${index + 1}. [${comment.author}] ${comment.content}`);
          console.log(`      작성시간: ${new Date(comment.created_at).toLocaleString()}`);
        });
      } else {
        console.log('   ⚠️ 댓글이 없거나 가져오지 못했습니다!');
      }
      
      return data.post;
    } else {
      console.log('❌ 게시글 조회 실패:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
    return null;
  }
}

// 4. 게시글 목록 조회 (댓글 수 확인)
async function testGetPostsList() {
  console.log('\n📋 게시글 목록 조회 (댓글 수 확인)');
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`);
    const data = await response.json();
    
    if (data.success) {
      const testPost = data.posts.find(p => p.id === testPostId);
      if (testPost) {
        console.log('✅ 목록에서 테스트 게시글 발견:');
        console.log(`   제목: ${testPost.title}`);
        console.log(`   댓글 수: ${testPost.comment_count || 0}`);
        
        if (testPost.comment_count === 0) {
          console.log('   ⚠️ 댓글 수가 0으로 표시됩니다!');
        }
      } else {
        console.log('⚠️ 목록에서 테스트 게시글을 찾을 수 없습니다');
      }
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

// 5. 데이터베이스 직접 확인 (디버깅용)
async function checkDatabase() {
  console.log('\n🔍 데이터베이스 확인');
  console.log('   (서버 로그를 확인하세요)');
}

// 6. 정리 - 테스트 게시글 삭제
async function cleanup(postId) {
  console.log('\n🗑️ 테스트 게시글 정리');
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test123' })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ 테스트 게시글 삭제 완료');
    } else {
      console.log('❌ 삭제 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

// 전체 테스트 실행
async function runCommentTests() {
  console.log('🚀 댓글 기능 테스트 시작\n');
  
  // 1. 게시글 생성
  const postId = await createTestPost();
  if (!postId) {
    console.log('❌ 게시글 생성 실패로 테스트 중단');
    return;
  }
  
  // 2. 댓글 추가
  const comments = await testAddComment(postId);
  
  // 3. 게시글 상세 조회
  await testGetPostWithComments(postId);
  
  // 4. 게시글 목록 조회
  await testGetPostsList();
  
  // 5. 5초 대기 후 다시 조회 (캐시 문제 확인)
  console.log('\n⏳ 5초 대기 후 재조회...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n🔄 재조회 시도');
  await testGetPostWithComments(postId);
  
  // 6. 정리
  await cleanup(postId);
  
  console.log('\n═══════════════════════════════════');
  console.log('✨ 댓글 기능 테스트 완료!');
  console.log('\n📊 테스트 결과 요약:');
  console.log(`   게시글 ID: ${postId}`);
  console.log(`   추가된 댓글: ${comments.length}개`);
  
  if (comments.length > 0) {
    console.log('\n⚠️ 만약 댓글이 표시되지 않는다면:');
    console.log('   1. 데이터베이스 연결 확인');
    console.log('   2. comments 테이블 구조 확인');
    console.log('   3. 서버 로그에서 오류 확인');
  }
}

// 테스트 실행
runCommentTests().catch(console.error);