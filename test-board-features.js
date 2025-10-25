// 게시판 전체 기능 테스트 스크립트
const TEST_URL = process.env.PROD ? 
  'https://athlete-time-backend.onrender.com' : 
  'http://localhost:3000';

console.log('🧪 테스트 환경:', TEST_URL);
console.log('═══════════════════════════════════');

// 테스트용 데이터
const testPost = {
  title: '테스트 게시글 ' + new Date().toISOString(),
  author: '테스터',
  content: '조회수 테스트를 위한 게시글입니다.\n\n여러 줄의 내용을 포함합니다.',
  category: '러닝 정보',
  password: 'test123',
  images: [],
  instagram: 'test_user'
};

let createdPostId = null;

// 1. 게시글 작성 테스트
async function testCreatePost() {
  console.log('\n📝 1. 게시글 작성 테스트');
  try {
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPost)
    });
    
    const data = await response.json();
    if (data.success) {
      createdPostId = data.post.id;
      console.log('✅ 게시글 작성 성공! ID:', createdPostId);
      console.log('   제목:', data.post.title);
      console.log('   작성자:', data.post.author);
      console.log('   초기 조회수:', data.post.views);
    } else {
      console.log('❌ 게시글 작성 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 게시글 작성 오류:', error.message);
  }
}

// 2. 조회수 증가 테스트
async function testViewCount() {
  console.log('\n👁️ 2. 조회수 증가 테스트');
  if (!createdPostId) {
    console.log('⚠️ 게시글이 생성되지 않아 테스트 불가');
    return;
  }
  
  try {
    // 조회수 증가 3번 시도
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}/views`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      if (data.success) {
        console.log(`✅ ${i}번째 조회: 현재 조회수 ${data.views}`);
      } else {
        console.log(`❌ ${i}번째 조회 실패:`, data.message);
      }
      
      // 0.5초 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('❌ 조회수 증가 오류:', error.message);
  }
}

// 3. 게시글 상세 조회 테스트
async function testGetPost() {
  console.log('\n📖 3. 게시글 상세 조회 테스트');
  if (!createdPostId) {
    console.log('⚠️ 게시글이 생성되지 않아 테스트 불가');
    return;
  }
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 게시글 조회 성공!');
      console.log('   제목:', data.post.title);
      console.log('   조회수:', data.post.views);
      console.log('   댓글 수:', data.post.comments ? data.post.comments.length : 0);
    } else {
      console.log('❌ 게시글 조회 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 게시글 조회 오류:', error.message);
  }
}

// 4. 댓글 작성 테스트
async function testAddComment() {
  console.log('\n💬 4. 댓글 작성 테스트');
  if (!createdPostId) {
    console.log('⚠️ 게시글이 생성되지 않아 테스트 불가');
    return;
  }
  
  const comment = {
    author: '댓글러',
    content: '좋은 글 감사합니다!',
    password: 'comment123',
    instagram: 'commenter'
  };
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ 댓글 작성 성공!');
      console.log('   작성자:', data.comment.author);
      console.log('   내용:', data.comment.content);
    } else {
      console.log('❌ 댓글 작성 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 댓글 작성 오류:', error.message);
  }
}

// 5. 투표 기능 테스트
async function testVoting() {
  console.log('\n👍 5. 투표 기능 테스트');
  if (!createdPostId) {
    console.log('⚠️ 게시글이 생성되지 않아 테스트 불가');
    return;
  }
  
  try {
    // 좋아요 투표
    const likeResponse = await fetch(`${TEST_URL}/api/posts/${createdPostId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user-1',
        type: 'like'
      })
    });
    
    const likeData = await likeResponse.json();
    if (likeData.success) {
      console.log('✅ 좋아요 투표 성공!');
      console.log('   좋아요 수:', likeData.likes);
      console.log('   싫어요 수:', likeData.dislikes);
    }
    
    // 다른 사용자로 싫어요 투표
    const dislikeResponse = await fetch(`${TEST_URL}/api/posts/${createdPostId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user-2',
        type: 'dislike'
      })
    });
    
    const dislikeData = await dislikeResponse.json();
    if (dislikeData.success) {
      console.log('✅ 싫어요 투표 성공!');
      console.log('   좋아요 수:', dislikeData.likes);
      console.log('   싫어요 수:', dislikeData.dislikes);
    }
  } catch (error) {
    console.error('❌ 투표 오류:', error.message);
  }
}

// 6. 게시글 수정 테스트
async function testUpdatePost() {
  console.log('\n✏️ 6. 게시글 수정 테스트');
  if (!createdPostId) {
    console.log('⚠️ 게시글이 생성되지 않아 테스트 불가');
    return;
  }
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: testPost.title + ' (수정됨)',
        content: testPost.content + '\n\n[수정: ' + new Date().toLocaleTimeString() + ']',
        category: '자유게시판',
        password: testPost.password
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ 게시글 수정 성공!');
      console.log('   새 제목:', data.post.title);
      console.log('   새 카테고리:', data.post.category);
    } else {
      console.log('❌ 게시글 수정 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 게시글 수정 오류:', error.message);
  }
}

// 7. 게시글 목록 조회 테스트
async function testGetPosts() {
  console.log('\n📋 7. 게시글 목록 조회 테스트');
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 게시글 목록 조회 성공!');
      console.log('   전체 게시글 수:', data.posts.length);
      
      // 최신 5개 게시글 표시
      const recentPosts = data.posts.slice(0, 5);
      console.log('\n   최신 게시글 5개:');
      recentPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. [${post.category}] ${post.title}`);
        console.log(`      작성자: ${post.author}, 조회수: ${post.views}, 댓글: ${post.comment_count || 0}`);
      });
    } else {
      console.log('❌ 게시글 목록 조회 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 게시글 목록 조회 오류:', error.message);
  }
}

// 8. 게시글 삭제 테스트
async function testDeletePost() {
  console.log('\n🗑️ 8. 게시글 삭제 테스트');
  if (!createdPostId) {
    console.log('⚠️ 게시글이 생성되지 않아 테스트 불가');
    return;
  }
  
  try {
    // 잘못된 비밀번호로 시도
    const wrongResponse = await fetch(`${TEST_URL}/api/posts/${createdPostId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' })
    });
    
    const wrongData = await wrongResponse.json();
    console.log('🔐 잘못된 비밀번호 테스트:', wrongData.success ? '❌ 실패 (삭제됨)' : '✅ 성공 (거부됨)');
    
    // 올바른 비밀번호로 삭제
    const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: testPost.password })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ 게시글 삭제 성공!');
    } else {
      console.log('❌ 게시글 삭제 실패:', data.message);
    }
  } catch (error) {
    console.error('❌ 게시글 삭제 오류:', error.message);
  }
}

// 전체 테스트 실행
async function runAllTests() {
  console.log('\n🚀 게시판 전체 기능 테스트 시작\n');
  
  await testCreatePost();
  await testViewCount();
  await testGetPost();
  await testAddComment();
  await testVoting();
  await testUpdatePost();
  await testGetPosts();
  await testDeletePost();
  
  console.log('\n═══════════════════════════════════');
  console.log('✨ 모든 테스트 완료!');
  console.log('\n💡 테스트 결과를 확인하고 문제가 있다면 수정이 필요합니다.');
}

// 테스트 실행
runAllTests().catch(console.error);