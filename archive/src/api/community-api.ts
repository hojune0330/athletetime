// Community API endpoints for server-side storage
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const api = new Hono();

// Enable CORS
api.use('/*', cors());

// In-memory storage (will reset on server restart)
// In production, use a database like D1 or KV
let posts: any[] = [
  {
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
• 부적절한 댓글은 10명 이상 신고 시 자동 블라인드 처리됩니다
• 베타 기간 후 정식 서비스는 회원제로 운영됩니다

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
  }
];

// Get all posts
api.get('/posts', (c) => {
  return c.json({
    success: true,
    posts: posts
  });
});

// Get single post
api.get('/posts/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  // Increment views
  post.views++;
  
  return c.json({
    success: true,
    post: post
  });
});

// Create new post
api.post('/posts', async (c) => {
  const body = await c.req.json();
  
  if (!body.title || !body.content || !body.password) {
    return c.json({ 
      success: false, 
      error: '제목, 내용, 비밀번호는 필수입니다.' 
    }, 400);
  }
  
  const newPost = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    category: body.category || '일반',
    title: body.title,
    author: body.author || 'ㅇㅇ',
    content: body.content,
    password: body.password,
    date: new Date().toISOString(),
    views: 0,
    likes: [],
    dislikes: [],
    comments: [],
    reports: [],
    attachments: body.attachments || [],
    isBlinded: false,
    isAdmin: false,
    isNotice: false
  };
  
  posts.unshift(newPost);
  
  return c.json({
    success: true,
    post: newPost
  });
});

// Update post
api.put('/posts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const postIndex = posts.findIndex(p => p.id === id);
  
  if (postIndex === -1) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  const post = posts[postIndex];
  
  // Check password (skip for admin actions)
  if (!body.isAdmin && body.password !== post.password) {
    return c.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, 403);
  }
  
  // Update fields
  if (body.content !== undefined) post.content = body.content;
  if (body.title !== undefined) post.title = body.title;
  if (body.isBlinded !== undefined) post.isBlinded = body.isBlinded;
  if (body.reports !== undefined) post.reports = body.reports;
  if (body.likes !== undefined) post.likes = body.likes;
  if (body.dislikes !== undefined) post.dislikes = body.dislikes;
  
  post.editedAt = new Date().toISOString();
  
  return c.json({
    success: true,
    post: post
  });
});

// Delete post
api.delete('/posts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const postIndex = posts.findIndex(p => p.id === id);
  
  if (postIndex === -1) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  const post = posts[postIndex];
  
  // Check password (skip for admin actions)
  if (!body.isAdmin && body.password !== post.password) {
    return c.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, 403);
  }
  
  posts.splice(postIndex, 1);
  
  return c.json({
    success: true,
    message: '게시물이 삭제되었습니다.'
  });
});

// Add comment
api.post('/posts/:id/comments', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  if (!body.content) {
    return c.json({ success: false, error: '댓글 내용을 입력하세요.' }, 400);
  }
  
  const newComment = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    author: body.author || 'ㅇㅇ',
    content: body.content,
    date: new Date().toISOString(),
    reports: [],
    isBlinded: false
  };
  
  if (!post.comments) post.comments = [];
  post.comments.push(newComment);
  
  return c.json({
    success: true,
    comment: newComment
  });
});

// Delete comment
api.delete('/posts/:postId/comments/:commentId', async (c) => {
  const postId = parseInt(c.req.param('postId'));
  const commentId = parseInt(c.req.param('commentId'));
  const body = await c.req.json();
  
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  const commentIndex = post.comments.findIndex((c: any) => c.id === commentId);
  
  if (commentIndex === -1) {
    return c.json({ success: false, error: 'Comment not found' }, 404);
  }
  
  // Only admin can delete comments
  if (!body.isAdmin) {
    return c.json({ success: false, error: '권한이 없습니다.' }, 403);
  }
  
  post.comments.splice(commentIndex, 1);
  
  return c.json({
    success: true,
    message: '댓글이 삭제되었습니다.'
  });
});

// Report post
api.post('/posts/:id/report', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  const userId = body.userId || Math.random().toString(36).substr(2, 9);
  
  if (!post.reports) post.reports = [];
  
  if (post.reports.includes(userId)) {
    return c.json({ 
      success: false, 
      error: '이미 신고한 게시물입니다.' 
    }, 400);
  }
  
  post.reports.push(userId);
  
  if (post.reports.length >= 10) {
    post.isBlinded = true;
  }
  
  return c.json({
    success: true,
    reportCount: post.reports.length,
    isBlinded: post.isBlinded
  });
});

// Like/Dislike post
api.post('/posts/:id/vote', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  const userId = body.userId;
  const voteType = body.voteType; // 'like', 'dislike', or 'cancel'
  
  if (!post.likes) post.likes = [];
  if (!post.dislikes) post.dislikes = [];
  
  // Remove from both arrays first
  post.likes = post.likes.filter(id => id !== userId);
  post.dislikes = post.dislikes.filter(id => id !== userId);
  
  // Add to appropriate array if not canceling
  if (voteType === 'like') {
    post.likes.push(userId);
  } else if (voteType === 'dislike') {
    post.dislikes.push(userId);
  }
  // If voteType is 'cancel' or null, just remove (already done above)
  
  return c.json({
    success: true,
    likes: post.likes.length,
    dislikes: post.dislikes.length
  });
});

// Report comment
api.post('/posts/:postId/comments/:commentId/report', async (c) => {
  const postId = parseInt(c.req.param('postId'));
  const commentId = parseInt(c.req.param('commentId'));
  const body = await c.req.json();
  
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  const comment = post.comments.find((c: any) => c.id === commentId);
  
  if (!comment) {
    return c.json({ success: false, error: 'Comment not found' }, 404);
  }
  
  const userId = body.userId || Math.random().toString(36).substr(2, 9);
  
  if (!comment.reports) comment.reports = [];
  
  if (comment.reports.includes(userId)) {
    return c.json({ 
      success: false, 
      error: '이미 신고한 댓글입니다.' 
    }, 400);
  }
  
  comment.reports.push(userId);
  
  if (comment.reports.length >= 10) {
    comment.isBlinded = true;
  }
  
  return c.json({
    success: true,
    reportCount: comment.reports.length,
    isBlinded: comment.isBlinded
  });
});

export default api;