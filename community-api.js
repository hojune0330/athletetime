// 익명 게시판 API - Render 백엔드 전용
const CommunityAPI = {
  // API 엔드포인트 - Render 백엔드만 사용
  getAPIUrl() {
    // 프로덕션 환경 - 항상 Render 백엔드 사용
    return 'https://athletetime-backend.onrender.com';
  },

  // 모든 게시글 가져오기
  async getPosts() {
    const apiUrl = this.getAPIUrl();
    
    try {
      const response = await fetch(`${apiUrl}/api/posts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.posts : [];
    } catch (error) {
      console.error('❌ 게시글 로드 실패:', error);
      throw error;
    }
  },

  // 게시글 상세 보기
  async getPost(id) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.post : null;
    } catch (error) {
      console.error('❌ 게시글 로드 실패:', error);
      throw error;
    }
  },

  // 조회수 증가
  async increaseViews(id) {
    const apiUrl = this.getAPIUrl();
    
    try {
      const response = await fetch(`${apiUrl}/api/posts/${id}/views`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ 조회수 증가 실패:', error);
      throw error;
    }
  },

  // 게시글 작성
  async createPost(postData) {
    try {
      const apiUrl = this.getAPIUrl();
      
      const response = await fetch(`${apiUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      return data.post;
    } catch (error) {
      console.error('❌ 게시글 작성 실패:', error);
      throw error;
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      return data.post;
    } catch (error) {
      console.error('❌ 게시글 수정 실패:', error);
      throw error;
    }
  },

  // 게시글 삭제
  async deletePost(id, password) {
    try {
      const apiUrl = this.getAPIUrl();
      
      const response = await fetch(`${apiUrl}/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '게시글 삭제에 실패했습니다');
      }
      
      return true;
    } catch (error) {
      console.error('❌ 게시글 삭제 실패:', error);
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      return data.post;
    } catch (error) {
      console.error('❌ 투표 실패:', error);
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      return data.comment;
    } catch (error) {
      console.error('❌ 댓글 작성 실패:', error);
      throw error;
    }
  },

  // 댓글 삭제
  async deleteComment(postId, commentId, password) {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      return true;
    } catch (error) {
      console.error('❌ 댓글 삭제 실패:', error);
      throw error;
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      return data.reports;
    } catch (error) {
      console.error('❌ 신고 실패:', error);
      throw error;
    }
  },

  // 통계 가져오기
  async getStats() {
    try {
      const response = await fetch(`${this.getAPIUrl()}/api/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.stats : null;
    } catch (error) {
      console.error('❌ 통계 로드 실패:', error);
      throw error;
    }
  }
};

// 전역 객체로 등록
window.CommunityAPI = CommunityAPI;