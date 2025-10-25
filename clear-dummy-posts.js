#!/usr/bin/env node
// 더미 게시글 삭제 스크립트

const fetch = require('node-fetch');

const API_URL = 'https://athlete-time-backend.onrender.com';

async function clearDummyPosts() {
  try {
    // 현재 게시글 가져오기
    const response = await fetch(`${API_URL}/api/posts`);
    const data = await response.json();
    
    console.log(`현재 게시글 수: ${data.posts.length}개`);
    
    // 공지사항 제외하고 모든 더미 게시글 삭제
    const dummyPosts = data.posts.filter(post => 
      post.password === 'sample' || 
      post.password === 'run123' || 
      post.password === 'qna456' || 
      post.password === 'free789' || 
      post.password === 'crew321' || 
      post.password === 'race111' ||
      post.password === 'test3' ||
      post.password === 'test456' ||
      post.password === 'coach123'
    );
    
    console.log(`삭제할 더미 게시글: ${dummyPosts.length}개`);
    
    for (const post of dummyPosts) {
      const deleteRes = await fetch(`${API_URL}/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: post.password })
      });
      
      const result = await deleteRes.json();
      if (result.success) {
        console.log(`✅ 삭제: "${post.title}"`);
      } else {
        // admin 비밀번호로 재시도
        const adminDeleteRes = await fetch(`${API_URL}/api/posts/${post.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'admin' })
        });
        const adminResult = await adminDeleteRes.json();
        if (adminResult.success) {
          console.log(`✅ (admin) 삭제: "${post.title}"`);
        } else {
          console.log(`❌ 삭제 실패: "${post.title}"`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 최종 확인
    const finalRes = await fetch(`${API_URL}/api/posts`);
    const finalData = await finalRes.json();
    console.log(`\n최종 게시글 수: ${finalData.posts.length}개`);
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

clearDummyPosts();