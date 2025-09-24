// Simple API simulator using localStorage for GitHub Pages
const API = {
  // Storage keys
  POSTS_KEY: 'athletetime_posts',
  USER_KEY: 'athletetime_user',
  
  // Initialize user
  initUser() {
    if (!localStorage.getItem(this.USER_KEY)) {
      localStorage.setItem(this.USER_KEY, JSON.stringify({
        id: 'user_' + Date.now(),
        createdAt: new Date().toISOString()
      }));
    }
    return JSON.parse(localStorage.getItem(this.USER_KEY));
  },
  
  // Get all posts
  getPosts() {
    const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
    return posts.filter(p => !p.isBlinded || p.reports?.length < 10);
  },
  
  // Create post
  createPost(data) {
    const posts = this.getPosts();
    const newPost = {
      id: Date.now(),
      category: data.category || '자유',
      title: data.title,
      author: data.author || '익명',
      content: data.content,
      password: data.password || '',
      date: new Date().toISOString(),
      views: 0,
      likes: [],
      dislikes: [],
      comments: [],
      isNotice: false,
      isAdmin: false,
      reports: [],
      isBlinded: false
    };
    posts.unshift(newPost);
    localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
    return newPost;
  },
  
  // Vote on post
  votePost(postId, userId, voteType) {
    const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    
    // Remove existing votes
    post.likes = post.likes.filter(id => id !== userId);
    post.dislikes = post.dislikes.filter(id => id !== userId);
    
    // Add new vote
    if (voteType === 'like') {
      post.likes.push(userId);
    } else if (voteType === 'dislike') {
      post.dislikes.push(userId);
      
      // Auto-blind if 10+ dislikes
      if (post.dislikes.length >= 10) {
        post.isBlinded = true;
      }
    }
    
    localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
    return post;
  },
  
  // Add comment
  addComment(postId, data) {
    const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    
    const newComment = {
      id: Date.now(),
      author: data.author || '익명',
      content: data.content,
      date: new Date().toISOString(),
      reports: [],
      isBlinded: false
    };
    
    post.comments.push(newComment);
    localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
    return newComment;
  },
  
  // Report post or comment
  reportItem(postId, commentId, userId) {
    const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    
    if (commentId) {
      const comment = post.comments.find(c => c.id === commentId);
      if (comment) {
        if (!comment.reports.includes(userId)) {
          comment.reports.push(userId);
          if (comment.reports.length >= 10) {
            comment.isBlinded = true;
          }
        }
      }
    } else {
      if (!post.reports.includes(userId)) {
        post.reports.push(userId);
        if (post.reports.length >= 10) {
          post.isBlinded = true;
        }
      }
    }
    
    localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
    return post;
  },
  
  // Initialize with welcome post if empty
  init() {
    const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
    if (posts.length === 0) {
      const welcomePost = {
        id: Date.now(),
        category: '공지',
        title: '🎉 애슬리트 타임 베타 테스트 오픈',
        author: '관리자',
        content: `안녕하세요, 애슬리트 타임 커뮤니티입니다.

2025년 11월 30일까지 베타 테스트 기간입니다.
현재는 회원가입 없이 누구나 익명으로 게시물을 작성할 수 있습니다.

📌 이용 규칙:
• 게시물 작성 시 비밀번호를 설정해주세요 (수정/삭제 시 필요)
• 댓글은 자유롭게 작성 가능합니다
• 부적절한 내용은 10명 이상 신고 시 자동 블라인드 처리됩니다
• 베타 이후에도 무료로 계속 운영됩니다

건전한 육상 커뮤니티 문화를 만들어주세요!`,
        date: new Date().toISOString(),
        views: 0,
        likes: [],
        dislikes: [],
        comments: [],
        isNotice: true,
        isAdmin: true,
        reports: [],
        password: 'admin',
        isBlinded: false
      };
      localStorage.setItem(this.POSTS_KEY, JSON.stringify([welcomePost]));
    }
  }
};

// Initialize API
API.init();

// Make API globally available
window.API = API;