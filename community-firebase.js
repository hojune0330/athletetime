// 커뮤니티 Firebase 연동
class CommunityFirebase {
  constructor() {
    this.posts = [];
    this.currentPost = null;
    this.currentCategory = '전체';
    this.listeners = [];
    this.isOnline = false;
    this.useLocalStorage = true; // Firebase 연결 실패 시 localStorage 폴백
  }

  // 초기화
  async init() {
    // Firebase 초기화 시도
    if (typeof initializeFirebase !== 'undefined' && initializeFirebase()) {
      this.isOnline = true;
      console.log('Firebase mode activated');
      await this.setupRealtimeListeners();
    } else {
      this.isOnline = false;
      console.log('Offline mode - using localStorage');
      this.loadFromLocalStorage();
    }
    
    this.updateUI();
  }

  // 실시간 리스너 설정
  async setupRealtimeListeners() {
    // 게시글 리스너
    const postsRef = FirebaseDB.listen('/posts', (data) => {
      if (data) {
        this.posts = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        this.updateUI();
        this.saveToLocalStorage(); // 로컬 백업
      }
    });
    
    this.listeners.push(postsRef);
  }

  // 게시글 작성
  async createPost(postData) {
    const post = {
      ...postData,
      id: Date.now(),
      timestamp: Date.now(),
      userId: this.getUserId(),
      likes: 0,
      views: 0,
      comments: [],
      reports: [],
      isBlinded: false
    };

    if (this.isOnline) {
      try {
        // Firebase에 저장
        await FirebaseDB.push('/posts', post);
        this.showToast('게시글이 작성되었습니다');
      } catch (error) {
        console.error('Firebase error:', error);
        // 오프라인 폴백
        this.savePostOffline(post);
      }
    } else {
      this.savePostOffline(post);
    }
  }

  // 오프라인 게시글 저장
  savePostOffline(post) {
    this.posts.unshift(post);
    this.saveToLocalStorage();
    this.updateUI();
    this.showToast('게시글이 작성되었습니다 (오프라인 모드)');
  }

  // 댓글 작성
  async addComment(postId, comment) {
    const commentData = {
      ...comment,
      id: Date.now(),
      timestamp: Date.now(),
      userId: this.getUserId(),
      reports: [],
      isBlinded: false
    };

    if (this.isOnline) {
      try {
        const postPath = `/posts/${postId}/comments`;
        await FirebaseDB.push(postPath, commentData);
        this.showToast('댓글이 등록되었습니다');
      } catch (error) {
        console.error('Firebase error:', error);
        this.addCommentOffline(postId, commentData);
      }
    } else {
      this.addCommentOffline(postId, commentData);
    }
  }

  // 오프라인 댓글 추가
  addCommentOffline(postId, comment) {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push(comment);
      this.saveToLocalStorage();
      this.updateUI();
      this.showToast('댓글이 등록되었습니다 (오프라인 모드)');
    }
  }

  // 좋아요
  async toggleLike(postId) {
    const userId = this.getUserId();
    
    if (this.isOnline) {
      try {
        const likePath = `/posts/${postId}/likes/${userId}`;
        const currentLike = await FirebaseDB.read(likePath);
        
        if (currentLike) {
          await FirebaseDB.remove(likePath);
        } else {
          await FirebaseDB.write(likePath, true);
        }
      } catch (error) {
        console.error('Firebase error:', error);
        this.toggleLikeOffline(postId);
      }
    } else {
      this.toggleLikeOffline(postId);
    }
  }

  // 오프라인 좋아요
  toggleLikeOffline(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      if (!post.likedBy) post.likedBy = [];
      const userId = this.getUserId();
      const index = post.likedBy.indexOf(userId);
      
      if (index > -1) {
        post.likedBy.splice(index, 1);
        post.likes = Math.max(0, post.likes - 1);
      } else {
        post.likedBy.push(userId);
        post.likes = (post.likes || 0) + 1;
      }
      
      this.saveToLocalStorage();
      this.updateUI();
    }
  }

  // 이미지 업로드
  async uploadImage(base64String, filename) {
    if (this.isOnline && typeof FirebaseStorage !== 'undefined') {
      try {
        const path = `images/${Date.now()}_${filename}`;
        await FirebaseStorage.uploadBase64(path, base64String);
        const url = await FirebaseStorage.getDownloadURL(path);
        return url;
      } catch (error) {
        console.error('Image upload error:', error);
        // Base64 그대로 반환 (오프라인 모드)
        return `data:image/jpeg;base64,${base64String}`;
      }
    } else {
      // 오프라인 모드: Base64 그대로 사용
      return `data:image/jpeg;base64,${base64String}`;
    }
  }

  // 신고
  async reportPost(postId, reason) {
    const report = {
      userId: this.getUserId(),
      reason: reason,
      timestamp: Date.now()
    };

    if (this.isOnline) {
      try {
        await FirebaseDB.push(`/posts/${postId}/reports`, report);
        this.showToast('신고가 접수되었습니다');
      } catch (error) {
        console.error('Report error:', error);
        this.reportOffline(postId, report);
      }
    } else {
      this.reportOffline(postId, report);
    }
  }

  // 오프라인 신고
  reportOffline(postId, report) {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      if (!post.reports) post.reports = [];
      post.reports.push(report);
      
      // 신고 3개 이상이면 블라인드
      if (post.reports.length >= 3) {
        post.isBlinded = true;
      }
      
      this.saveToLocalStorage();
      this.updateUI();
      this.showToast('신고가 접수되었습니다 (오프라인 모드)');
    }
  }

  // 투표
  async vote(postId, pollId, optionIndex) {
    const userId = this.getUserId();
    
    if (this.isOnline) {
      try {
        const votePath = `/posts/${postId}/polls/${pollId}/votes/${userId}`;
        await FirebaseDB.write(votePath, optionIndex);
        this.showToast('투표했습니다');
      } catch (error) {
        console.error('Vote error:', error);
        this.voteOffline(postId, pollId, optionIndex);
      }
    } else {
      this.voteOffline(postId, pollId, optionIndex);
    }
  }

  // 오프라인 투표
  voteOffline(postId, pollId, optionIndex) {
    const post = this.posts.find(p => p.id === postId);
    if (post && post.poll) {
      if (!post.poll.votes) post.poll.votes = {};
      post.poll.votes[this.getUserId()] = optionIndex;
      
      this.saveToLocalStorage();
      this.updateUI();
      this.showToast('투표했습니다 (오프라인 모드)');
    }
  }

  // 검색
  searchPosts(query) {
    if (!query) return this.posts;
    
    const lowercaseQuery = query.toLowerCase();
    return this.posts.filter(post => {
      if (post.isBlinded) return false;
      
      const titleMatch = post.title?.toLowerCase().includes(lowercaseQuery);
      const contentMatch = post.content?.toLowerCase().includes(lowercaseQuery);
      const authorMatch = post.author?.toLowerCase().includes(lowercaseQuery);
      
      return titleMatch || contentMatch || authorMatch;
    });
  }

  // 카테고리 필터
  filterByCategory(category) {
    if (category === '전체') return this.posts;
    return this.posts.filter(post => post.category === category);
  }

  // 정렬
  sortPosts(posts, sortBy = 'latest') {
    const sorted = [...posts];
    
    switch(sortBy) {
      case 'latest':
        return sorted.sort((a, b) => b.timestamp - a.timestamp);
      case 'popular':
        return sorted.sort((a, b) => (b.views + b.likes * 2) - (a.views + a.likes * 2));
      case 'comments':
        return sorted.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
      default:
        return sorted;
    }
  }

  // localStorage 저장
  saveToLocalStorage() {
    try {
      localStorage.setItem('athletetime_posts', JSON.stringify(this.posts));
    } catch (e) {
      console.error('localStorage save error:', e);
    }
  }

  // localStorage 로드
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('athletetime_posts');
      if (saved) {
        this.posts = JSON.parse(saved);
      }
    } catch (e) {
      console.error('localStorage load error:', e);
    }
  }

  // 사용자 ID 가져오기
  getUserId() {
    let userId = localStorage.getItem('athletetime_user');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('athletetime_user', userId);
    }
    return userId;
  }

  // UI 업데이트 (구현은 각 페이지에서)
  updateUI() {
    // 각 페이지에서 오버라이드
    if (typeof updatePostsList === 'function') {
      updatePostsList(this.posts);
    }
  }

  // 토스트 메시지
  showToast(message) {
    if (typeof showToast === 'function') {
      window.showToast(message);
    } else {
      console.log(message);
    }
  }

  // 정리
  cleanup() {
    // 리스너 제거
    this.listeners.forEach(ref => {
      if (ref && typeof ref.off === 'function') {
        ref.off();
      }
    });
    this.listeners = [];
  }
}

// 전역 인스턴스
const communityFirebase = new CommunityFirebase();

// 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => communityFirebase.init());
} else {
  communityFirebase.init();
}