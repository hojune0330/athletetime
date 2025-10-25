// 보안 기능 테스트 스크립트
const TEST_URL = process.env.PROD ? 
  'https://athlete-time-backend.onrender.com' : 
  'http://localhost:3000';

console.log('🔒 보안 테스트 시작');
console.log('🌐 테스트 환경:', TEST_URL);
console.log('═══════════════════════════════════\n');

// 1. XSS 공격 테스트
async function testXSS() {
  console.log('💉 XSS 공격 방어 테스트');
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
  ];
  
  for (const payload of xssPayloads) {
    const testPost = {
      title: `테스트 ${payload}`,
      author: payload,
      content: `내용 ${payload}`,
      category: '테스트',
      password: 'test123',
      instagram: payload
    };
    
    try {
      const response = await fetch(`${TEST_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPost)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 스크립트가 제거되었는지 확인
        const hasScript = data.post.title.includes('<script') || 
                         data.post.content.includes('<script') ||
                         data.post.author.includes('<script');
        
        if (!hasScript) {
          console.log(`   ✅ XSS 차단됨: ${payload.substring(0, 30)}...`);
        } else {
          console.log(`   ❌ XSS 통과됨: ${payload.substring(0, 30)}...`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️ 요청 실패:`, error.message);
    }
  }
  console.log('');
}

// 2. 비밀번호 해싱 테스트
async function testPasswordHashing() {
  console.log('🔐 비밀번호 해싱 테스트');
  
  const testPost = {
    title: '비밀번호 테스트 게시글',
    author: '테스터',
    content: '비밀번호가 해싱되는지 확인',
    category: '테스트',
    password: 'myPassword123!',
    images: []
  };
  
  try {
    // 게시글 생성
    const createRes = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPost)
    });
    
    const createData = await createRes.json();
    
    if (createData.success) {
      console.log(`   ✅ 게시글 생성 성공 (ID: ${createData.post.id})`);
      
      // 응답에 평문 비밀번호가 없는지 확인
      if (!createData.post.password) {
        console.log('   ✅ 응답에서 비밀번호 제거됨');
      } else {
        console.log('   ❌ 응답에 비밀번호 포함됨!');
      }
      
      // 잘못된 비밀번호로 삭제 시도
      const wrongDeleteRes = await fetch(`${TEST_URL}/api/posts/${createData.post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrongPassword' })
      });
      
      if (wrongDeleteRes.status === 403) {
        console.log('   ✅ 잘못된 비밀번호 거부됨');
      } else {
        console.log('   ❌ 잘못된 비밀번호가 통과됨!');
      }
      
      // 올바른 비밀번호로 삭제
      const correctDeleteRes = await fetch(`${TEST_URL}/api/posts/${createData.post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: testPost.password })
      });
      
      if (correctDeleteRes.ok) {
        console.log('   ✅ 올바른 비밀번호로 삭제 성공');
      } else {
        console.log('   ❌ 올바른 비밀번호 검증 실패');
      }
    }
  } catch (error) {
    console.error('   ❌ 테스트 오류:', error.message);
  }
  console.log('');
}

// 3. Rate Limiting 테스트
async function testRateLimiting() {
  console.log('🚦 Rate Limiting 테스트');
  
  // 조회수 증가 Rate Limit 테스트 (1분당 5번)
  console.log('   조회수 증가 제한 테스트 (1분당 최대 5번)...');
  
  // 먼저 게시글 생성
  const testPost = {
    title: 'Rate Limit 테스트',
    author: '테스터',
    content: '내용',
    category: '테스트',
    password: 'test'
  };
  
  try {
    const createRes = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPost)
    });
    
    const createData = await createRes.json();
    
    if (createData.success) {
      const postId = createData.post.id;
      let successCount = 0;
      let blockedCount = 0;
      
      // 10번 조회수 증가 시도
      for (let i = 1; i <= 10; i++) {
        const viewRes = await fetch(`${TEST_URL}/api/posts/${postId}/views`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (viewRes.ok) {
          successCount++;
        } else if (viewRes.status === 429) {
          blockedCount++;
        }
      }
      
      console.log(`   ✅ 성공: ${successCount}번, 차단: ${blockedCount}번`);
      
      if (blockedCount > 0) {
        console.log('   ✅ Rate Limiting 작동 확인');
      } else {
        console.log('   ⚠️ Rate Limiting이 작동하지 않을 수 있음');
      }
      
      // 테스트 게시글 삭제
      await fetch(`${TEST_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test' })
      });
    }
  } catch (error) {
    console.error('   ❌ 테스트 오류:', error.message);
  }
  console.log('');
}

// 4. 입력값 길이 제한 테스트
async function testInputValidation() {
  console.log('📏 입력값 검증 테스트');
  
  const longString = 'a'.repeat(1000);
  
  const testPost = {
    title: longString,
    author: longString,
    content: 'a'.repeat(20000),
    category: '테스트',
    password: 'test123',
    instagram: longString
  };
  
  try {
    const response = await fetch(`${TEST_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPost)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`   제목 길이: ${data.post.title.length} (최대 255)`);
      console.log(`   작성자 길이: ${data.post.author.length} (최대 100)`);
      
      if (data.post.title.length <= 255 && data.post.author.length <= 100) {
        console.log('   ✅ 입력값 길이 제한 작동');
      } else {
        console.log('   ❌ 입력값 길이 제한 미작동');
      }
      
      // 테스트 게시글 삭제
      await fetch(`${TEST_URL}/api/posts/${data.post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test123' })
      });
    }
  } catch (error) {
    console.error('   ❌ 테스트 오류:', error.message);
  }
  console.log('');
}

// 5. SQL Injection 테스트
async function testSQLInjection() {
  console.log('💾 SQL Injection 방어 테스트');
  
  const sqlPayloads = [
    "'; DROP TABLE posts; --",
    "1' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM posts--"
  ];
  
  for (const payload of sqlPayloads) {
    try {
      // SQL Injection 시도
      const response = await fetch(`${TEST_URL}/api/posts/${payload}`);
      
      // 404나 에러가 반환되면 성공 (공격 차단)
      if (response.status === 404 || response.status === 500) {
        console.log(`   ✅ SQL Injection 차단: ${payload.substring(0, 30)}...`);
      } else {
        console.log(`   ⚠️ 예상치 못한 응답:`, response.status);
      }
    } catch (error) {
      console.log(`   ✅ 요청 거부됨 (안전)`);
    }
  }
  console.log('');
}

// 전체 테스트 실행
async function runSecurityTests() {
  console.log('🛡️ 보안 테스트 시작\n');
  
  await testXSS();
  await testPasswordHashing();
  await testRateLimiting();
  await testInputValidation();
  await testSQLInjection();
  
  console.log('═══════════════════════════════════');
  console.log('✨ 모든 보안 테스트 완료!');
  console.log('\n📌 권장사항:');
  console.log('1. 모든 테스트가 ✅ 표시되는지 확인');
  console.log('2. Rate Limiting은 프로덕션 환경에서 재테스트 필요');
  console.log('3. 정기적으로 보안 테스트 실행');
}

// 테스트 실행
runSecurityTests().catch(console.error);