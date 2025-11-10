// Render 전용 간단한 백엔드 서버
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 - 모든 도메인 허용
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// 메모리 저장소 (Render 재배포 시 초기화됨)
let posts = [
  {
    id: Date.now(),
    category: '공지',
    title: '🎉 Athletic Time 커뮤니티 오픈!',
    author: '관리자',
    content: 'Athletic Time 커뮤니티가 오픈했습니다. 자유롭게 이용해주세요!',
    date: new Date().toISOString(),
    views: 0,
    likes: [],
    dislikes: [],
    comments: [],
    reports: [],
    isNotice: true,
    isAdmin: true,
    isBlinded: false
  }
];

// ============================================
// API 엔드포인트
// ============================================

// 헬스체크
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Athletic Time Backend (Render)',
    posts: posts.length,
    timestamp: new Date().toISOString()
  });
});

// 모든 게시글 조회
app.get('/api/posts', (req, res) => {
  console.log(`📋 게시글 조회 요청 - 총 ${posts.length}개`);
  res.json({
    success: true,
    posts: posts.filter(p => !p.isBlinded)
  });
});

// 게시글 작성
app.post('/api/posts', (req, res) => {
  const newPost = {
    ...req.body,
    id: Date.now(),
    date: new Date().toISOString(),
    views: 0,
    likes: [],
    dislikes: [],
    comments: [],
    reports: [],
    isNotice: false,
    isAdmin: false,
    isBlinded: false
  };
  
  posts.unshift(newPost);
  console.log(`✅ 게시글 작성: ${newPost.title}`);
  
  res.json({
    success: true,
    post: newPost
  });
});

// 조회수 증가
app.put('/api/posts/:id/views', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: '게시글을 찾을 수 없습니다'
    });
  }
  
  post.views = (post.views || 0) + 1;
  console.log(`👁️ 조회수 증가: ${postId} → ${post.views}회`);
  
  res.json({
    success: true,
    views: post.views
  });
});

// 게시글 삭제
app.delete('/api/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  const { password } = req.body;
  
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '게시글을 찾을 수 없습니다'
    });
  }
  
  // 간단한 비밀번호 체크 (실제로는 해시 비교 필요)
  const post = posts[postIndex];
  if (post.password && post.password !== password) {
    return res.status(401).json({
      success: false,
      message: '비밀번호가 일치하지 않습니다'
    });
  }
  
  posts.splice(postIndex, 1);
  console.log(`🗑️ 게시글 삭제: ${postId}`);
  
  res.json({
    success: true,
    message: '게시글이 삭제되었습니다'
  });
});

// 댓글 작성
app.post('/api/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: '게시글을 찾을 수 없습니다'
    });
  }
  
  const newComment = {
    ...req.body,
    id: Date.now(),
    date: new Date().toISOString(),
    reports: [],
    isBlinded: false
  };
  
  if (!post.comments) post.comments = [];
  post.comments.push(newComment);
  
  console.log(`💬 댓글 작성: ${postId}`);
  
  res.json({
    success: true,
    comment: newComment
  });
});

// 투표
app.post('/api/posts/:id/vote', (req, res) => {
  const postId = parseInt(req.params.id);
  const { userId, type } = req.body;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: '게시글을 찾을 수 없습니다'
    });
  }
  
  // 기존 투표 제거
  post.likes = post.likes.filter(id => id !== userId);
  post.dislikes = post.dislikes.filter(id => id !== userId);
  
  // 새 투표 추가
  if (type === 'like') {
    post.likes.push(userId);
  } else if (type === 'dislike') {
    post.dislikes.push(userId);
  }
  
  console.log(`👍 투표: ${postId} - ${type}`);
  
  res.json({
    success: true,
    post: post
  });
});

// 통계
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalPosts: posts.length,
      totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0),
      totalComments: posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0)
    }
  });
});

// ============================================
// 서버 시작
// ============================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🚀 Athletic Time Backend (Render)      ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  환경: ${process.env.NODE_ENV || 'development'}           ║
║  시작: ${new Date().toLocaleString()}      ║
╠════════════════════════════════════════════╣
║  ⚠️  메모리 저장 (재배포 시 초기화)        ║
╚════════════════════════════════════════════╝
  `);
});