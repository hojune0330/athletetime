// Render용 최소 서버 - 에러 없이 실행되는 버전
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// 간단한 메모리 저장소
let posts = [];

// 헬스체크
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Athletic Time Backend is running',
    posts: posts.length 
  });
});

// 게시글 목록
app.get('/api/posts', (req, res) => {
  res.json({ success: true, posts: posts });
});

// 게시글 작성
app.post('/api/posts', (req, res) => {
  const post = {
    ...req.body,
    id: Date.now(),
    date: new Date().toISOString(),
    views: 0,
    likes: [],
    dislikes: [],
    comments: []
  };
  posts.unshift(post);
  res.json({ success: true, post: post });
});

// 조회수 증가
app.put('/api/posts/:id/views', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  
  if (post) {
    post.views = (post.views || 0) + 1;
    res.json({ success: true, views: post.views });
  } else {
    res.status(404).json({ success: false, message: 'Post not found' });
  }
});

// 게시글 삭제
app.delete('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = posts.findIndex(p => p.id === id);
  
  if (index !== -1) {
    posts.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Post not found' });
  }
});

// 댓글 추가
app.post('/api/posts/:id/comments', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  
  if (post) {
    const comment = {
      ...req.body,
      id: Date.now(),
      date: new Date().toISOString()
    };
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    res.json({ success: true, comment: comment });
  } else {
    res.status(404).json({ success: false, message: 'Post not found' });
  }
});

// 투표
app.post('/api/posts/:id/vote', (req, res) => {
  const id = parseInt(req.params.id);
  const { userId, type } = req.body;
  const post = posts.find(p => p.id === id);
  
  if (post) {
    post.likes = post.likes.filter(uid => uid !== userId);
    post.dislikes = post.dislikes.filter(uid => uid !== userId);
    
    if (type === 'like') {
      post.likes.push(userId);
    } else if (type === 'dislike') {
      post.dislikes.push(userId);
    }
    
    res.json({ success: true, post: post });
  } else {
    res.status(404).json({ success: false, message: 'Post not found' });
  }
});

// 통계
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalPosts: posts.length,
      totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0)
    }
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});