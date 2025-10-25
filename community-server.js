// 육상 커뮤니티 서버 (Athlete Time Community)
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp'); // 이미지 최적화

const app = express();
const PORT = 3005;
const DATA_FILE = path.join(__dirname, 'community-posts.json');

// 운영 정책 설정
const POLICY = {
  IMAGE_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  IMAGE_MAX_WIDTH: 1920,
  IMAGE_MAX_HEIGHT: 1920,
  IMAGE_QUALITY: 85,
  AUTO_DELETE_DAYS: 90, // 90일 이상 된 게시글 자동 삭제
  BLIND_REPORT_COUNT: 10, // 신고 10개 이상 블라인드
  BLIND_DISLIKE_COUNT: 20, // 비추천 20개 이상 블라인드
  MAX_IMAGES_PER_POST: 5, // 게시글당 최대 이미지 5개
  MAX_CONTENT_LENGTH: 10000, // 최대 글자 수 10,000자
  COMMENT_MAX_LENGTH: 500, // 댓글 최대 500자
  RATE_LIMIT_WINDOW: 60 * 1000, // 1분
  RATE_LIMIT_MAX_POSTS: 3, // 1분당 최대 3개 게시글
  RATE_LIMIT_MAX_COMMENTS: 10 // 1분당 최대 10개 댓글
};

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // 제한 축소
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 게시글 데이터 (메모리 저장)
let posts = [];

// 데이터 저장 함수
async function savePosts() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(posts, null, 2));
    console.log(`💾 ${posts.length}개 게시글 저장 완료`);
  } catch (error) {
    console.error('❌ 게시글 저장 실패:', error);
  }
}

// 데이터 로드 함수
async function loadPosts() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    posts = JSON.parse(data);
    console.log(`📂 ${posts.length}개 게시글 로드 완료`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 저장된 게시글 없음 - 육상 커뮤니티 공지사항 생성');
      // 육상 커뮤니티 공지사항
      posts = [
        {
          id: Date.now() - 3000000,
          category: '공지',
          title: '📢 [필독] 육상 커뮤니티 운영 정책',
          author: '관리자',
          content: `🏃 애슬리트 타임 육상 커뮤니티 운영 정책

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 커뮤니티 목적
• 육상인들의 건전한 정보 교류
• 훈련 노하우 및 경기 정보 공유
• 선수, 코치, 동호인 간 소통
• 육상 문화 발전 및 저변 확대

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 이용 규칙

1. 금지 행위
   • 욕설, 비방, 명예훼손
   • 성적 수치심을 주는 표현
   • 개인정보 무단 공개
   • 상업적 광고 및 홍보
   • 도배, 스팸성 게시글
   • 타 커뮤니티 비방

2. 게시글 관리
   • 신고 ${POLICY.BLIND_REPORT_COUNT}건 이상 → 자동 블라인드
   • 비추천 ${POLICY.BLIND_DISLIKE_COUNT}개 이상 → 자동 블라인드
   • ${POLICY.AUTO_DELETE_DAYS}일 이상 경과 → 자동 삭제
   • 부적절한 게시글은 관리자가 삭제

3. 이미지 업로드
   • 최대 ${POLICY.MAX_IMAGES_PER_POST}장
   • 용량 ${POLICY.IMAGE_MAX_SIZE / 1024 / 1024}MB 이하
   • 자동 최적화 (${POLICY.IMAGE_MAX_WIDTH}x${POLICY.IMAGE_MAX_HEIGHT})
   • 저작권 위반 이미지 금지

4. 댓글
   • 최대 ${POLICY.COMMENT_MAX_LENGTH}자
   • 악플, 인신공격 금지
   • 건설적인 토론 문화

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 권장 게시글
• 훈련 방법 및 팁
• 대회 후기 및 정보
• 장비 리뷰
• 부상 예방 및 관리
• 기록 향상 노하우
• 육상 관련 질문

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 문의 및 건의
• 부적절한 게시글 발견 시 신고 기능 이용
• 기타 문의사항은 관리자에게 연락

모두 함께 건전한 육상 커뮤니티를 만들어가요! 🏃‍♂️🏃‍♀️`,
          password: 'admin',
          date: new Date().toISOString(),
          views: 0,
          likes: [],
          dislikes: [],
          comments: [],
          reports: [],
          isNotice: true,
          isAdmin: true,
          isBlinded: false,
          isPinned: true
        },
        {
          id: Date.now() - 2000000,
          category: '공지',
          title: '🎉 애슬리트 타임 육상 커뮤니티 오픈!',
          author: '관리자',
          content: `안녕하세요, 육상인 여러분! 👋

대한민국 육상인을 위한 전문 커뮤니티,
**애슬리트 타임**이 오픈했습니다! 🎊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏃 이런 분들을 위한 공간입니다:

✅ 육상 선수 (초중고, 대학, 실업)
✅ 육상 코치 및 지도자
✅ 육상 동호인 (마스터즈)
✅ 육상에 관심 있는 모든 분

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💪 주요 기능:

📝 자유 게시판
   • 일상, 훈련 일지, 잡담

🏆 대회 정보
   • 일정, 결과, 참가 후기

💡 훈련 정보
   • 기록 향상 팁, 부상 예방

⚡ 질문 게시판
   • 궁금한 점 자유롭게 질문

🔧 장비 리뷰
   • 스파이크, 러닝화, 웨어 정보

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 추가 기능:

• 페이스 계산기 (정밀 분석)
• 훈련 계산기 (Jack Daniels)
• 대회 일정 캘린더
• 트랙 레인 계산기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

함께 성장하는 육상 커뮤니티를 만들어가요!
많은 참여와 관심 부탁드립니다. 🙏

화이팅! 💪🔥`,
          password: 'admin',
          date: new Date().toISOString(),
          views: 0,
          likes: [],
          dislikes: [],
          comments: [],
          reports: [],
          isNotice: true,
          isAdmin: true,
          isBlinded: false,
          isPinned: true
        },
        {
          id: Date.now() - 1000000,
          category: '공지',
          title: '❓ 자주 묻는 질문 (FAQ)',
          author: '관리자',
          content: `📚 애슬리트 타임 FAQ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q1. 회원가입이 필요한가요?
→ 아니요! 익명으로 자유롭게 이용 가능합니다.

Q2. 게시글 수정/삭제는 어떻게 하나요?
→ 작성 시 설정한 비밀번호로 수정/삭제 가능합니다.

Q3. 이미지는 몇 장까지 올릴 수 있나요?
→ 게시글당 최대 ${POLICY.MAX_IMAGES_PER_POST}장, ${POLICY.IMAGE_MAX_SIZE / 1024 / 1024}MB 이하입니다.

Q4. 게시글은 얼마나 보관되나요?
→ ${POLICY.AUTO_DELETE_DAYS}일 이후 자동 삭제됩니다.

Q5. 부적절한 게시글은 어떻게 신고하나요?
→ 게시글 하단의 신고 버튼을 눌러주세요.
   ${POLICY.BLIND_REPORT_COUNT}건 이상 신고 시 자동 블라인드됩니다.

Q6. 페이스 계산기는 어디에 있나요?
→ 상단 메뉴의 '⏱️ 페이스' 버튼을 클릭하세요.

Q7. 대회 정보는 어떻게 확인하나요?
→ 상단 메뉴의 '📅 대회' 버튼에서 확인 가능합니다.

Q8. 코칭이나 개인 레슨 문의는?
→ 해당 게시글에 댓글로 문의하거나
   작성자가 남긴 인스타그램으로 연락하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

더 궁금한 점이 있으시면 자유롭게 질문해주세요! 🙋`,
          password: 'admin',
          date: new Date().toISOString(),
          views: 0,
          likes: [],
          dislikes: [],
          comments: [],
          reports: [],
          isNotice: true,
          isAdmin: true,
          isBlinded: false,
          isPinned: false
        }
      ];
      await savePosts();
    } else {
      console.error('❌ 게시글 로드 실패:', error);
    }
  }
}

// 서버 시작 시 데이터 로드
loadPosts();

// 통계
let stats = {
  totalPosts: posts.length,
  totalViews: 0,
  totalComments: 0
};

// Rate limiting 추적
const rateLimitMap = new Map();

// Rate limit 체크 함수
function checkRateLimit(userId, action) {
  const key = `${userId}_${action}`;
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  
  const timestamps = rateLimitMap.get(key);
  const recentTimestamps = timestamps.filter(t => now - t < POLICY.RATE_LIMIT_WINDOW);
  
  const maxAllowed = action === 'post' ? POLICY.RATE_LIMIT_MAX_POSTS : POLICY.RATE_LIMIT_MAX_COMMENTS;
  
  if (recentTimestamps.length >= maxAllowed) {
    return false;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(key, recentTimestamps);
  return true;
}

// Rate limit 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(t => now - t < POLICY.RATE_LIMIT_WINDOW * 5);
    if (recent.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recent);
    }
  }
}, 5 * 60 * 1000);

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

// 이미지 최적화 함수
async function optimizeImage(base64Image) {
  try {
    // base64 헤더 제거
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 이미지 최적화
    const optimized = await sharp(buffer)
      .resize(POLICY.IMAGE_MAX_WIDTH, POLICY.IMAGE_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: POLICY.IMAGE_QUALITY })
      .toBuffer();
    
    // 크기 확인
    if (optimized.length > POLICY.IMAGE_MAX_SIZE) {
      throw new Error(`이미지가 ${POLICY.IMAGE_MAX_SIZE / 1024 / 1024}MB를 초과합니다.`);
    }
    
    return `data:image/jpeg;base64,${optimized.toString('base64')}`;
  } catch (error) {
    console.error('이미지 최적화 실패:', error);
    throw error;
  }
}

// 게시글 작성
app.post('/api/posts', async (req, res) => {
  try {
    const { category, title, author, content, password, instagram, images, poll, userId } = req.body;
    
    // Rate limiting 체크
    if (userId && !checkRateLimit(userId, 'post')) {
      return res.status(429).json({ 
        success: false, 
        message: '너무 많은 게시글을 작성했습니다. 잠시 후 다시 시도해주세요.' 
      });
    }
    
    // 유효성 검사
    if (content && content.length > POLICY.MAX_CONTENT_LENGTH) {
      return res.status(400).json({ 
        success: false, 
        message: `게시글은 최대 ${POLICY.MAX_CONTENT_LENGTH}자까지 작성 가능합니다.` 
      });
    }
    
    if (images && images.length > POLICY.MAX_IMAGES_PER_POST) {
      return res.status(400).json({ 
        success: false, 
        message: `이미지는 최대 ${POLICY.MAX_IMAGES_PER_POST}장까지 업로드 가능합니다.` 
      });
    }
    
    // 이미지 최적화
    let optimizedImages = [];
    if (images && images.length > 0) {
      try {
        optimizedImages = await Promise.all(
          images.map(img => optimizeImage(img))
        );
        console.log(`🖼️ ${optimizedImages.length}개 이미지 최적화 완료`);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: '이미지 최적화 실패: ' + error.message 
        });
      }
    }
    
    const newPost = {
      id: Date.now(),
      category: category || '자유',
      title: title || '제목 없음',
      author: author || '익명',
      instagram: instagram || null,
      content: content || '',
      password: password || null,
      images: optimizedImages,
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
    
    // 데이터 저장
    await savePosts();
    
    res.json({ success: true, post: newPost });
    
    console.log(`📝 새 게시글: ${newPost.title} by ${newPost.author}`);
  } catch (error) {
    console.error('게시글 작성 실패:', error);
    res.status(500).json({ success: false, message: '게시글 작성에 실패했습니다.' });
  }
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
app.delete('/api/posts/:id', async (req, res) => {
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
  
  // 데이터 저장
  await savePosts();
  
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
    
    // 비추천 정책 개수 이상시 블라인드
    if (post.dislikes.length >= POLICY.BLIND_DISLIKE_COUNT) {
      post.isBlinded = true;
      console.log(`🚫 비추천으로 게시글 블라인드: ${post.title} (${post.dislikes.length}개)`);
    }
  }
  
  res.json({ success: true, post });
});

// 댓글 작성
app.post('/api/posts/:id/comments', (req, res) => {
  const { author, content, instagram, userId } = req.body;
  
  // Rate limiting 체크
  if (userId && !checkRateLimit(userId, 'comment')) {
    return res.status(429).json({ 
      success: false, 
      message: '너무 많은 댓글을 작성했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
  const post = posts.find(p => p.id == req.params.id);
  
  if (!post) {
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
  }
  
  // 댓글 길이 검증
  if (content && content.length > POLICY.COMMENT_MAX_LENGTH) {
    return res.status(400).json({ 
      success: false, 
      message: `댓글은 최대 ${POLICY.COMMENT_MAX_LENGTH}자까지 작성 가능합니다.` 
    });
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
    
    if (post.reports.length >= POLICY.BLIND_REPORT_COUNT) {
      post.isBlinded = true;
      console.log(`🚫 신고로 게시글 블라인드: ${post.title} (${post.reports.length}건)`);
    }
  }
  
  res.json({ success: true, reports: post.reports.length });
});

// 통계 API
app.get('/api/stats', (req, res) => {
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
  const totalDislikes = posts.reduce((sum, p) => sum + (p.dislikes?.length || 0), 0);
  const blindedPosts = posts.filter(p => p.isBlinded).length;
  
  res.json({
    success: true,
    stats: {
      ...stats,
      activePosts: posts.filter(p => !p.isBlinded).length,
      totalLikes,
      totalDislikes,
      blindedPosts,
      noticeCount: posts.filter(p => p.isNotice).length
    }
  });
});

// 헬스 체크 API
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    postsCount: posts.length,
    policy: POLICY
  });
});

// 카테고리별 게시글 조회
app.get('/api/posts/category/:category', (req, res) => {
  const category = decodeURIComponent(req.params.category);
  const categoryPosts = posts.filter(p => !p.isBlinded && p.category === category);
  
  res.json({
    success: true,
    posts: categoryPosts,
    count: categoryPosts.length
  });
});

// 인기 게시글 (좋아요 많은 순)
app.get('/api/posts/popular', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const popularPosts = posts
    .filter(p => !p.isBlinded)
    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    .slice(0, limit);
  
  res.json({
    success: true,
    posts: popularPosts
  });
});

// 최신 댓글이 달린 게시글
app.get('/api/posts/active', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const activePosts = posts
    .filter(p => !p.isBlinded && p.comments?.length > 0)
    .sort((a, b) => {
      const aLastComment = a.comments[a.comments.length - 1]?.date || a.date;
      const bLastComment = b.comments[b.comments.length - 1]?.date || b.date;
      return new Date(bLastComment) - new Date(aLastComment);
    })
    .slice(0, limit);
  
  res.json({
    success: true,
    posts: activePosts
  });
});

// 서버 시작
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🏃 육상 커뮤니티 서버 시작됨 (ATHLETE TIME) ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  URL: http://localhost:${PORT}              ║
╠════════════════════════════════════════════╣
║  주요 기능:                                 ║
║  ✅ 게시글 CRUD (육상 전문)                ║
║  ✅ 댓글 시스템                            ║
║  ✅ 좋아요/싫어요 투표                     ║
║  ✅ 신고 및 자동 블라인드                  ║
║  ✅ 이미지 자동 최적화                     ║
║  ✅ 오래된 게시글 자동 삭제                ║
╠════════════════════════════════════════════╣
║  운영 정책:                                 ║
║  📌 신고 ${POLICY.BLIND_REPORT_COUNT}건 → 블라인드                   ║
║  📌 비추천 ${POLICY.BLIND_DISLIKE_COUNT}개 → 블라인드                  ║
║  📌 ${POLICY.AUTO_DELETE_DAYS}일 경과 → 자동 삭제                  ║
║  📌 이미지 최대 ${POLICY.MAX_IMAGES_PER_POST}장, ${POLICY.IMAGE_MAX_SIZE / 1024 / 1024}MB              ║
╚════════════════════════════════════════════╝
  `);
  
  console.log(`📊 초기 데이터: ${posts.length}개 게시글`);
  console.log(`🏃 육상 커뮤니티 준비 완료!`);
  console.log(`\n🔗 서버 접속: http://localhost:${PORT}`);
  console.log(`🔗 헬스 체크: http://localhost:${PORT}/api/health`);
  console.log(`🔗 통계: http://localhost:${PORT}/api/stats\n`);
});

// 오래된 게시글 자동 삭제 함수
async function autoDeleteOldPosts() {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - POLICY.AUTO_DELETE_DAYS * 24 * 60 * 60 * 1000);
  
  const beforeCount = posts.length;
  posts = posts.filter(post => {
    // 공지사항은 삭제하지 않음
    if (post.isNotice || post.isAdmin) return true;
    
    const postDate = new Date(post.date);
    return postDate > cutoffDate;
  });
  
  const deletedCount = beforeCount - posts.length;
  
  if (deletedCount > 0) {
    await savePosts();
    console.log(`🗑️ 자동 삭제: ${deletedCount}개 게시글 (${POLICY.AUTO_DELETE_DAYS}일 이상 경과)`);
  }
  
  return deletedCount;
}

// 5분마다 자동 저장
setInterval(() => {
  savePosts().catch(err => console.error('자동 저장 실패:', err));
}, 5 * 60 * 1000);

// 1시간마다 오래된 게시글 자동 삭제
setInterval(() => {
  autoDeleteOldPosts().catch(err => console.error('자동 삭제 실패:', err));
}, 60 * 60 * 1000);

// 서버 시작 시 한 번 실행
autoDeleteOldPosts().catch(err => console.error('초기 자동 삭제 실패:', err));

// 정리 작업
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');
  await savePosts(); // 종료 전 저장
  server.close(() => {
    console.log('✅ 게시판 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버 종료 중...');
  await savePosts(); // 종료 전 저장
  server.close(() => {
    console.log('✅ 게시판 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});