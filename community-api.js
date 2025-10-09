// 익명 게시판 API 연동 스크립트
const CommunityAPI = {
  // API 엔드포인트
  getAPIUrl() {
    // 환경에 따라 URL 변경
    if (window.location.hostname.includes('localhost')) {
      return 'http://localhost:3005';
    } else if (window.location.hostname.includes('e2b.dev')) {
      return 'https://3005-' + window.location.hostname.split('-')[1];
    } else {
      // 실제 배포 서버 URL (나중에 설정)
      return 'https://your-api-server.com';
    }
  },

  // 모든 게시글 가져오기
  async getPosts() {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts`);
      const data = await response.json();
      return data.success ? data.posts : [];
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      // localStorage 폴백
      const saved = localStorage.getItem('athletetime_posts');
      return saved ? JSON.parse(saved) : [];
    }
  },

  // 게시글 상세 보기
  async getPost(id) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${id}`);
      const data = await response.json();
      return data.success ? data.post : null;
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      return null;
    }
  },

  // 게시글 작성
  async createPost(postData) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message);
      
      // localStorage에도 저장 (백업)
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      posts.unshift(data.post);
      localStorage.setItem('athletetime_posts', JSON.stringify(posts));
      
      return data.post;
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      
      // 오프라인 폴백: localStorage에만 저장
      const newPost = {
        ...postData,
        id: Date.now(),
        date: new Date().toISOString(),
        views: 0,
        likes: [],
        dislikes: [],
        comments: [],
        reports: [],
        isBlinded: false
      };
      
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      posts.unshift(newPost);
      localStorage.setItem('athletetime_posts', JSON.stringify(posts));
      
      return newPost;
    }
  },

  // 게시글 수정
  async updatePost(id, updateData) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message);
      
      // localStorage도 업데이트
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      const index = posts.findIndex(p => p.id === id);
      if (index !== -1) {
        posts[index] = data.post;
        localStorage.setItem('athletetime_posts', JSON.stringify(posts));
      }
      
      return data.post;
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      throw error;
    }
  },

  // 게시글 삭제
  async deletePost(id, password) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message);
      
      // localStorage에서도 삭제
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      const filtered = posts.filter(p => p.id !== id);
      localStorage.setItem('athletetime_posts', JSON.stringify(filtered));
      
      return true;
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      throw error;
    }
  },

  // 좋아요/싫어요
  async vote(postId, userId, type) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type })
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message);
      
      // localStorage 업데이트
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      const index = posts.findIndex(p => p.id === postId);
      if (index !== -1) {
        posts[index] = data.post;
        localStorage.setItem('athletetime_posts', JSON.stringify(posts));
      }
      
      return data.post;
    } catch (error) {
      console.error('투표 실패:', error);
      
      // 오프라인 폴백
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      const post = posts.find(p => p.id === postId);
      if (post) {
        // 기존 투표 제거
        post.likes = post.likes.filter(id => id !== userId);
        post.dislikes = post.dislikes.filter(id => id !== userId);
        
        // 새 투표 추가
        if (type === 'like') {
          post.likes.push(userId);
        } else if (type === 'dislike') {
          post.dislikes.push(userId);
        }
        
        localStorage.setItem('athletetime_posts', JSON.stringify(posts));
        return post;
      }
      
      throw error;
    }
  },

  // 댓글 작성
  async addComment(postId, commentData) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message);
      
      // localStorage 업데이트
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      const post = posts.find(p => p.id === postId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(data.comment);
        localStorage.setItem('athletetime_posts', JSON.stringify(posts));
      }
      
      return data.comment;
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      
      // 오프라인 폴백
      const comment = {
        id: Date.now(),
        ...commentData,
        date: new Date().toISOString(),
        reports: [],
        isBlinded: false
      };
      
      const posts = JSON.parse(localStorage.getItem('athletetime_posts') || '[]');
      const post = posts.find(p => p.id === postId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(comment);
        localStorage.setItem('athletetime_posts', JSON.stringify(posts));
      }
      
      return comment;
    }
  },

  // 신고
  async reportPost(postId, userId) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message);
      
      return data.reports;
    } catch (error) {
      console.error('신고 실패:', error);
      throw error;
    }
  },

  // 통계 가져오기
  async getStats() {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/stats`);
      const data = await response.json();
      return data.success ? data.stats : null;
    } catch (error) {
      console.error('통계 로드 실패:', error);
      return null;
    }
  }
};

// 전역 객체로 등록
window.CommunityAPI = CommunityAPI;