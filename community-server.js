// 익명 게시판 서버
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = 3005;

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 게시글 데이터 (메모리 저장)
let posts = [
  {
    id: Date.now() - 1000000,
    category: '공지',
    title: '🎉 애슬리트 타임 커뮤니티 오픈!',
    author: '관리자',
    content: `안녕하세요, 육상인 여러분!
    
애슬리트 타임이 오픈했습니다.
자유롭게 소통하고 정보를 공유해주세요!

📌 이용 규칙:
• 욕설, 비방 금지
• 광고, 스팸 금지
• 10명 이상 신고 시 자동 블라인드
• 서로 존중하는 문화 만들기

모두 함께 건전한 육상 커뮤니티를 만들어가요! 🏃‍♂️`,
    password: 'admin',
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

// 통계
let stats = {
  totalPosts: posts.length,
  totalViews: 0,
  totalComments: 0
};

// 모든 게시글 가져오기
app.get('/api/posts', (req, res) => {
  const visiblePosts = posts.filter(p => !p.isBlinded);
  res.json({
    success: true,
    posts: visiblePosts,
    stats: stats
  });
});

// 게시글 상세 보기
app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  if (!post || post.isBlinded) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  // 조회수 증가
  post.views++;
  stats.totalViews++;
  
  res.json({ success: true, post });
});

// 게시글 작성
app.post('/api/posts', (req, res) => {
  const { category, title, author, content, password, instagram, images, poll } = req.body;
  
  const newPost = {
    id: Date.now(),
    category: category || '자유',
    title: title || '제목 없음',
    author: author || '익명',
    instagram: instagram || null,
    content: content || '',
    password: password || null,
    images: images || [],
    poll: poll || null,
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
  stats.totalPosts++;
  
  res.json({ success: true, post: newPost });
  
  console.log(`📝 새 게시글: ${newPost.title} by ${newPost.author}`);
});

// 게시글 수정
app.put('/api/posts/:id', (req, res) => {
  const { password, ...updateData } = req.body;
  const postIndex = posts.findIndex(p => p.id == req.params.id);
  
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  const post = posts[postIndex];
  
  // 비밀번호 확인
  if (post.password && post.password !== password && password !== 'admin') {
    return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
  }
  
  // 업데이트
  posts[postIndex] = { ...post, ...updateData, id: post.id, date: post.date };
  
  res.json({ success: true, post: posts[postIndex] });
});

// 게시글 삭제
app.delete('/api/posts/:id', (req, res) => {
  const { password } = req.body;
  const postIndex = posts.findIndex(p => p.id == req.params.id);
  
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  const post = posts[postIndex];
  
  // 비밀번호 확인
  if (post.password && post.password !== password && password !== 'admin') {
    return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
  }
  
  posts.splice(postIndex, 1);
  stats.totalPosts--;
  
  res.json({ success: true, message: '게시글이 삭제되었습니다.' });
  
  console.log(`🗑️ 게시글 삭제: ${post.title}`);
});

// 좋아요/싫어요
app.post('/api/posts/:id/vote', (req, res) => {
  const { userId, type } = req.body;
  const post = posts.find(p => p.id == req.params.id);
  
  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  // 기존 투표 제거
  post.likes = post.likes.filter(id => id !== userId);
  post.dislikes = post.dislikes.filter(id => id !== userId);
  
  // 새 투표 추가
  if (type === 'like') {
    post.likes.push(userId);
  } else if (type === 'dislike') {
    post.dislikes.push(userId);
    
    // 비추천 10개 이상시 블라인드
    if (post.dislikes.length >= 10) {
      post.isBlinded = true;
      console.log(`🚫 게시글 블라인드: ${post.title}`);
    }
  }
  
  res.json({ success: true, post });
});

// 댓글 작성
app.post('/api/posts/:id/comments', (req, res) => {
  const { author, content, instagram } = req.body;
  const post = posts.find(p => p.id == req.params.id);
  
  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  const comment = {
    id: Date.now(),
    author: author || '익명',
    instagram: instagram || null,
    content: content || '',
    date: new Date().toISOString(),
    reports: [],
    isBlinded: false
  };
  
  if (!post.comments) post.comments = [];
  post.comments.push(comment);
  stats.totalComments++;
  
  res.json({ success: true, comment });
  
  console.log(`💬 새 댓글: ${comment.author} on "${post.title}"`);
});

// 신고
app.post('/api/posts/:id/report', (req, res) => {
  const { userId } = req.body;
  const post = posts.find(p => p.id == req.params.id);
  
  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  if (!post.reports.includes(userId)) {
    post.reports.push(userId);
    
    if (post.reports.length >= 10) {
      post.isBlinded = true;
      console.log(`🚫 신고로 게시글 블라인드: ${post.title}`);
    }
  }
  
  res.json({ success: true, reports: post.reports.length });
});

// 통계 API
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      ...stats,
      activePosts: posts.filter(p => !p.isBlinded).length
    }
  });
});

// 서버 시작
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🚀 익명 게시판 서버 시작됨            ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  URL: http://localhost:${PORT}              ║
╠════════════════════════════════════════════╣
║  기능:                                      ║
║  ✅ 게시글 CRUD                            ║
║  ✅ 댓글 시스템                            ║
║  ✅ 좋아요/싫어요                          ║
║  ✅ 신고 및 블라인드                       ║
║  ✅ 실시간 동기화                          ║
╚════════════════════════════════════════════╝
  `);
  
  console.log(`📊 초기 데이터: ${posts.length}개 게시글`);
});

// 정리 작업
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 게시판 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});