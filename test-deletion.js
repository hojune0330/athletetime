#!/usr/bin/env node
// 게시글 삭제 기능 테스트 스크립트

const fetch = require('node-fetch');

// API URL 설정 (프로덕션/로컬)
const API_URL = process.env.PROD 
  ? 'https://athletetime-backend.onrender.com' 
  : 'http://localhost:3000';

console.log(`\n🔍 테스트 서버: ${API_URL}\n`);

async function testDeletion() {
  try {
    // 1. 테스트 게시글 생성
    console.log('1️⃣ 테스트 게시글 생성 중...');
    const createRes = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: '정보',
        title: '🏃 러닝 초보자를 위한 기초 가이드',
        author: '러닝코치',
        content: '러닝을 시작하는 분들을 위한 기초 가이드입니다.',
        password: 'coach123',
        images: [],
        poll: null
      })
    });
    
    const created = await createRes.json();
    if (!created.success) {
      throw new Error('게시글 생성 실패: ' + created.message);
    }
    
    const postId = created.post.id;
    console.log(`✅ 게시글 생성 완료 (ID: ${postId})`);
    
    // 2. 잘못된 비밀번호로 삭제 시도
    console.log('\n2️⃣ 잘못된 비밀번호로 삭제 시도...');
    const wrongPwRes = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' })
    });
    
    const wrongPwResult = await wrongPwRes.json();
    if (wrongPwResult.success) {
      throw new Error('❌ 오류: 잘못된 비밀번호로 삭제되었습니다!');
    }
    console.log(`✅ 올바른 동작: ${wrongPwResult.message}`);
    
    // 3. 올바른 비밀번호로 삭제
    console.log('\n3️⃣ 올바른 비밀번호(coach123)로 삭제 시도...');
    const correctPwRes = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'coach123' })
    });
    
    const correctPwResult = await correctPwRes.json();
    if (!correctPwResult.success) {
      throw new Error('❌ 오류: 올바른 비밀번호로 삭제 실패!');
    }
    console.log(`✅ 삭제 성공: ${correctPwResult.message}`);
    
    // 4. 관리자 비밀번호 테스트
    console.log('\n4️⃣ 관리자 비밀번호 테스트...');
    const adminTestRes = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: '테스트',
        title: '관리자 삭제 테스트',
        author: '테스터',
        content: '관리자 비밀번호 테스트용',
        password: 'userpass',
        images: [],
        poll: null
      })
    });
    
    const adminTest = await adminTestRes.json();
    const adminPostId = adminTest.post.id;
    console.log(`✅ 테스트 게시글 생성 (ID: ${adminPostId})`);
    
    const adminDeleteRes = await fetch(`${API_URL}/api/posts/${adminPostId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin' })
    });
    
    const adminResult = await adminDeleteRes.json();
    if (!adminResult.success) {
      throw new Error('❌ 오류: 관리자 비밀번호로 삭제 실패!');
    }
    console.log(`✅ 관리자 비밀번호로 삭제 성공!`);
    
    console.log('\n✨ 모든 테스트 통과! 삭제 기능이 정상 작동합니다.\n');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('\n💡 해결 방법:');
    console.error('1. 서버가 실행 중인지 확인하세요');
    console.error('2. 프로덕션 테스트: PROD=1 node test-deletion.js');
    console.error('3. 로컬 테스트: node test-deletion.js');
    process.exit(1);
  }
}

// 테스트 실행
testDeletion();