// community.html API 연동 코드
// 이 스크립트를 community.html에 추가하세요

// API 설정
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://athletetime-backend.onrender.com';

// localStorage 대신 API 사용하도록 함수 오버라이드
const originalLoadPosts = window.loadPosts;
const originalSavePosts = window.savePosts;

// 게시물 불러오기 (API)
window.loadPosts = async function() {
  try {
    const response = await fetch(`${API_BASE}/api/posts`);
    if (response.ok) {
      const data = await response.json();
      posts = data;
      console.log('Posts loaded from API:', posts.length);
    } else {
      // API 실패시 localStorage 폴백
      originalLoadPosts();
    }
  } catch (error) {
    console.error('API error, falling back to localStorage:', error);
    originalLoadPosts();
  }
};

// 게시물 저장 (API)
window.savePosts = async function() {
  // 새 게시물이면 API로 전송
  const lastPost = posts[0]; // 가장 최근 게시물
  
  if (!lastPost.id || lastPost.id > Date.now() - 1000) {
    try {
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastPost)
      });
      
      if (response.ok) {
        const savedPost = await response.json();
        posts[0] = savedPost;
        console.log('Post saved to API');
      }
    } catch (error) {
      console.error('API save failed, using localStorage:', error);
    }
  }
  
  // localStorage에도 백업
  originalSavePosts();
};

// 댓글 작성 API 연동
const originalSubmitComment = window.confirmSubmitComment;

window.confirmSubmitComment = async function() {
  if (!pendingComment || !currentPost) return;
  
  try {
    // API로 댓글 전송
    const response = await fetch(`${API_BASE}/api/posts/${currentPost.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingComment)
    });
    
    if (response.ok) {
      const savedComment = await response.json();
      pendingComment = savedComment;
    }
  } catch (error) {
    console.error('Comment API error:', error);
  }
  
  // 원래 함수 실행
  originalSubmitComment();
};

// 투표 API 연동
const originalVote = window.vote;

window.vote = async function(type) {
  if (!currentPost) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/posts/${currentPost.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, userId })
    });
    
    if (response.ok) {
      const result = await response.json();
      currentPost.likes = new Array(result.likes);
      currentPost.dislikes = new Array(result.dislikes);
      currentPost.isBlinded = result.isBlinded;
    }
  } catch (error) {
    console.error('Vote API error:', error);
  }
  
  // 원래 함수도 실행 (UI 업데이트)
  originalVote(type);
};

// 페이지 로드시 API 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // API 연결 테스트
  try {
    const response = await fetch(`${API_BASE}/api/posts?limit=1`);
    if (response.ok) {
      console.log('✅ API connected successfully');
      document.getElementById('apiStatus')?.classList.add('text-green-500');
    }
  } catch (error) {
    console.log('⚠️ API not available, using localStorage');
    document.getElementById('apiStatus')?.classList.add('text-yellow-500');
  }
});