// 전체 기능 통합 테스트 스크립트
const TEST_URL = process.env.PROD ? 
  'https://athlete-time-backend.onrender.com' : 
  'http://localhost:3000';

console.log(`
╔══════════════════════════════════════════════════════╗
║        🧪 애슬리트 타임 전체 기능 테스트              ║
║        환경: ${TEST_URL.padEnd(40)}  ║
║        시간: ${new Date().toLocaleString().padEnd(40)}  ║
╚══════════════════════════════════════════════════════╝
`);

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// 유틸리티 함수
function logTest(name, success, details = '') {
  if (success) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testResults.failed++;
  }
}

// 1. API 연결 테스트
async function testAPIConnection() {
  console.log('\n📡 1. API 연결 테스트');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(TEST_URL);
    const text = await response.text();
    
    if (response.ok) {
      logTest('서버 응답', true, `상태 코드: ${response.status}`);
      
      // JSON API인지 HTML인지 확인
      if (text.startsWith('<!DOCTYPE') || text.includes('<html>')) {
        logTest('API 형식', false, 'HTML 응답 (API 아님)');
        testResults.errors.push('서버가 HTML을 반환함 - API 라우팅 문제');
      } else {
        logTest('API 형식', true, 'JSON API 확인');
      }
    } else {
      logTest('서버 응답', false, `상태 코드: ${response.status}`);
    }
  } catch (error) {
    logTest('서버 연결', false, error.message);
    testResults.errors.push(`서버 연결 실패: ${error.message}`);
  }
}

// 2. 게시글 CRUD 테스트
async function testPostCRUD() {
  console.log('\n📝 2. 게시글 CRUD 테스트');
  console.log('─'.repeat(50));
  
  let createdPostId = null;
  
  // 2-1. CREATE - 게시글 작성
  try {
    const newPost = {
      title: `테스트 게시글 ${Date.now()}`,
      author: '테스터',
      content: '전체 기능 테스트를 위한 게시글입니다.\n여러 줄의 내용을 포함합니다.',
      category: '테스트',
      password: 'test123',
      instagram: 'tester'
    };
    
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.post) {
        createdPostId = data.post.id;
        logTest('게시글 작성', true, `ID: ${createdPostId}`);
        
        // ID 타입 확인
        if (typeof createdPostId === 'number' && createdPostId > 1000000000000) {
          logTest('ID 형식', true, `Date.now() 형식 (${createdPostId})`);
        } else if (typeof createdPostId === 'number' && createdPostId < 1000) {
          logTest('ID 형식', false, `SERIAL 형식 (${createdPostId}) - 문제 가능성`);
          testResults.errors.push('ID가 SERIAL 형식으로 생성됨');
        }
      } else {
        logTest('게시글 작성', false, data.message || 'Unknown error');
      }
    } else {
      const errorText = await response.text();
      logTest('게시글 작성', false, `HTTP ${response.status}`);
      if (errorText.includes('<!DOCTYPE')) {
        testResults.errors.push('POST /api/posts가 HTML 반환 - 라우팅 문제');
      }
    }
  } catch (error) {
    logTest('게시글 작성', false, error.message);
    testResults.errors.push(`게시글 작성 실패: ${error.message}`);
  }
  
  // 2-2. READ - 게시글 목록 조회
  try {
    const response = await fetch(`${TEST_URL}/api/posts`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.posts)) {
        logTest('게시글 목록 조회', true, `총 ${data.posts.length}개`);
        
        // 방금 생성한 게시글 확인
        if (createdPostId) {
          const found = data.posts.find(p => p.id == createdPostId);
          if (found) {
            logTest('생성된 게시글 목록에 표시', true);
          } else {
            logTest('생성된 게시글 목록에 표시', false, '게시글이 목록에 없음');
            testResults.errors.push('게시글이 생성되었지만 목록에 나타나지 않음');
          }
        }
      } else {
        logTest('게시글 목록 조회', false, 'Invalid response format');
      }
    } else {
      logTest('게시글 목록 조회', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('게시글 목록 조회', false, error.message);
  }
  
  // 2-3. READ - 게시글 상세 조회
  if (createdPostId) {
    try {
      const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.post) {
          logTest('게시글 상세 조회', true);
          
          // 필수 필드 확인
          const requiredFields = ['id', 'title', 'author', 'content', 'created_at'];
          const missingFields = requiredFields.filter(f => !data.post[f]);
          if (missingFields.length > 0) {
            logTest('필수 필드 확인', false, `누락: ${missingFields.join(', ')}`);
          } else {
            logTest('필수 필드 확인', true);
          }
        } else {
          logTest('게시글 상세 조회', false, 'Post not found in response');
        }
      } else {
        const errorText = await response.text();
        logTest('게시글 상세 조회', false, `HTTP ${response.status}`);
        if (errorText.includes('<!DOCTYPE')) {
          testResults.errors.push(`GET /api/posts/${createdPostId}가 HTML 반환`);
        }
      }
    } catch (error) {
      logTest('게시글 상세 조회', false, error.message);
    }
  }
  
  // 2-4. UPDATE - 게시글 수정
  if (createdPostId) {
    try {
      const updateData = {
        title: '수정된 제목',
        content: '수정된 내용',
        category: '자유게시판',
        password: 'test123'
      };
      
      const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          logTest('게시글 수정', true);
        } else {
          logTest('게시글 수정', false, data.message);
        }
      } else {
        logTest('게시글 수정', false, `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest('게시글 수정', false, error.message);
    }
  }
  
  // 2-5. DELETE - 게시글 삭제
  if (createdPostId) {
    try {
      const response = await fetch(`${TEST_URL}/api/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test123' })
      });
      
      if (response.ok) {
        logTest('게시글 삭제', true);
      } else {
        logTest('게시글 삭제', false, `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest('게시글 삭제', false, error.message);
    }
  }
  
  return createdPostId;
}

// 3. 댓글 기능 테스트
async function testComments() {
  console.log('\n💬 3. 댓글 기능 테스트');
  console.log('─'.repeat(50));
  
  // 테스트용 게시글 생성
  let postId = null;
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '댓글 테스트용 게시글',
        author: '테스터',
        content: '댓글 기능 테스트',
        category: '테스트',
        password: 'test'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      postId = data.post?.id;
      console.log(`   테스트 게시글 생성: ID ${postId}`);
    }
  } catch (error) {
    logTest('테스트 게시글 생성', false, error.message);
    return;
  }
  
  if (!postId) return;
  
  // 댓글 추가
  try {
    const comment = {
      author: '댓글 작성자',
      content: '테스트 댓글입니다',
      instagram: 'commenter'
    };
    
    const response = await fetch(`${TEST_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        logTest('댓글 작성', true, `댓글 ID: ${data.comment?.id}`);
      } else {
        logTest('댓글 작성', false, data.message);
      }
    } else {
      logTest('댓글 작성', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('댓글 작성', false, error.message);
  }
  
  // 댓글 포함 게시글 조회
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${postId}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.post?.comments && data.post.comments.length > 0) {
        logTest('댓글 조회', true, `${data.post.comments.length}개 댓글`);
      } else {
        logTest('댓글 조회', false, '댓글이 없거나 조회 실패');
        testResults.errors.push('댓글이 저장되었지만 조회되지 않음');
      }
    }
  } catch (error) {
    logTest('댓글 조회', false, error.message);
  }
  
  // 정리
  if (postId) {
    try {
      await fetch(`${TEST_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test' })
      });
    } catch (e) {}
  }
}

// 4. 조회수 테스트
async function testViewCount() {
  console.log('\n👁️ 4. 조회수 기능 테스트');
  console.log('─'.repeat(50));
  
  // 테스트용 게시글 생성
  let postId = null;
  let initialViews = 0;
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '조회수 테스트',
        author: '테스터',
        content: '조회수 테스트',
        category: '테스트',
        password: 'test'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      postId = data.post?.id;
      initialViews = data.post?.views || 0;
      console.log(`   테스트 게시글 생성: ID ${postId}, 초기 조회수: ${initialViews}`);
    }
  } catch (error) {
    logTest('테스트 게시글 생성', false, error.message);
    return;
  }
  
  if (!postId) return;
  
  // 조회수 증가
  for (let i = 1; i <= 3; i++) {
    try {
      const response = await fetch(`${TEST_URL}/api/posts/${postId}/views`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          logTest(`조회수 증가 ${i}회`, true, `현재 조회수: ${data.views}`);
        } else {
          logTest(`조회수 증가 ${i}회`, false);
        }
      } else {
        const errorText = await response.text();
        if (errorText.includes('<!DOCTYPE')) {
          logTest(`조회수 증가 ${i}회`, false, 'HTML 응답');
          testResults.errors.push('PUT /api/posts/:id/views가 HTML 반환');
        } else {
          logTest(`조회수 증가 ${i}회`, false, `HTTP ${response.status}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logTest(`조회수 증가 ${i}회`, false, error.message);
    }
  }
  
  // 최종 조회수 확인
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${postId}`);
    if (response.ok) {
      const data = await response.json();
      const finalViews = data.post?.views || 0;
      if (finalViews > initialViews) {
        logTest('조회수 증가 확인', true, `${initialViews} → ${finalViews}`);
      } else {
        logTest('조회수 증가 확인', false, '조회수가 증가하지 않음');
        testResults.errors.push('조회수 API는 작동하지만 실제로 증가하지 않음');
      }
    }
  } catch (error) {
    logTest('최종 조회수 확인', false, error.message);
  }
  
  // 정리
  if (postId) {
    try {
      await fetch(`${TEST_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test' })
      });
    } catch (e) {}
  }
}

// 5. 투표 기능 테스트
async function testVoting() {
  console.log('\n👍 5. 투표 기능 테스트');
  console.log('─'.repeat(50));
  
  // 테스트용 게시글 생성
  let postId = null;
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '투표 테스트',
        author: '테스터',
        content: '투표 테스트',
        category: '테스트',
        password: 'test'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      postId = data.post?.id;
    }
  } catch (error) {
    logTest('테스트 게시글 생성', false, error.message);
    return;
  }
  
  if (!postId) return;
  
  // 좋아요 투표
  try {
    const response = await fetch(`${TEST_URL}/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user123',
        type: 'like'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('좋아요 투표', true, `좋아요: ${data.likes}, 싫어요: ${data.dislikes}`);
    } else {
      logTest('좋아요 투표', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('좋아요 투표', false, error.message);
  }
  
  // 정리
  if (postId) {
    try {
      await fetch(`${TEST_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test' })
      });
    } catch (e) {}
  }
}

// 전체 테스트 실행
async function runAllTests() {
  const startTime = Date.now();
  
  await testAPIConnection();
  await testPostCRUD();
  await testComments();
  await testViewCount();
  await testVoting();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // 결과 요약
  console.log('\n' + '═'.repeat(56));
  console.log('📊 테스트 결과 요약');
  console.log('─'.repeat(56));
  console.log(`✅ 성공: ${testResults.passed}개`);
  console.log(`❌ 실패: ${testResults.failed}개`);
  console.log(`⏱️ 소요 시간: ${duration}초`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 발견된 주요 문제:');
    testResults.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  // 권장 조치
  console.log('\n💡 권장 조치:');
  if (testResults.errors.some(e => e.includes('HTML'))) {
    console.log('1. 서버가 API 대신 HTML을 반환함 - 라우팅 또는 미들웨어 문제');
    console.log('   → server-postgres.js의 라우트 정의 순서 확인');
    console.log('   → 정적 파일 미들웨어가 API 라우트보다 먼저 오는지 확인');
  }
  
  if (testResults.errors.some(e => e.includes('ID'))) {
    console.log('2. ID 생성 방식 문제 - SERIAL vs BIGINT');
    console.log('   → migrate-schema.js 실행 필요');
  }
  
  if (testResults.errors.some(e => e.includes('댓글'))) {
    console.log('3. 댓글이 저장되지만 조회되지 않음');
    console.log('   → post_id 타입 불일치 가능성');
    console.log('   → 데이터베이스 스키마 확인 필요');
  }
  
  console.log('\n' + '═'.repeat(56));
}

// 테스트 시작
runAllTests().catch(error => {
  console.error('❌ 테스트 실행 중 치명적 오류:', error);
});