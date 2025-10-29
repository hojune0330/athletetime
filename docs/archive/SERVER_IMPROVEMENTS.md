# 🚀 육상 커뮤니티 서버 개선 사항 및 제안

## ✅ 적용된 개선 사항

### 1. **Rate Limiting (속도 제한) 추가**
**문제점**: 사용자가 짧은 시간에 대량의 게시글/댓글 작성 가능 (도배, 스팸)

**해결책**:
- 1분당 최대 3개 게시글 작성 제한
- 1분당 최대 10개 댓글 작성 제한
- 메모리 기반 추적 (5분마다 자동 정리)

```javascript
RATE_LIMIT_MAX_POSTS: 3,      // 1분당 최대 3개 게시글
RATE_LIMIT_MAX_COMMENTS: 10   // 1분당 최대 10개 댓글
```

**효과**: 도배 및 스팸 방지, 서버 부하 감소

---

### 2. **추가 API 엔드포인트**

#### 📊 **헬스 체크 API** (`/api/health`)
서버 상태 및 운영 정책 확인
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "postsCount": 3,
  "policy": { ... }
}
```

#### 📈 **향상된 통계 API** (`/api/stats`)
더욱 상세한 커뮤니티 통계
```json
{
  "activePosts": 50,
  "totalLikes": 230,
  "totalDislikes": 15,
  "blindedPosts": 2,
  "noticeCount": 3
}
```

#### 🏷️ **카테고리별 조회** (`/api/posts/category/:category`)
특정 카테고리의 게시글만 조회
```
GET /api/posts/category/훈련정보
```

#### 🔥 **인기 게시글** (`/api/posts/popular?limit=10`)
좋아요가 많은 순서로 정렬
```json
{
  "posts": [ /* 인기순 */ ]
}
```

#### 💬 **활발한 게시글** (`/api/posts/active?limit=10`)
최근 댓글이 달린 게시글 우선
```json
{
  "posts": [ /* 최신 댓글순 */ ]
}
```

**효과**: 프론트엔드에서 다양한 필터링 및 정렬 가능

---

### 3. **서버 시작 정보 개선**
- 서버 시작 시 접속 가능한 모든 URL 표시
- 헬스 체크 및 통계 엔드포인트 안내
- 초기 데이터 로딩 상태 표시

---

## 💡 추가 제안 사항

### 🔒 **보안 강화**

#### 1. IP 기반 Rate Limiting
**현재**: userId 기반 (클라이언트가 임의로 변경 가능)
**제안**: IP 주소 기반 추적으로 우회 방지

```javascript
const requestIp = require('request-ip');
const userIp = requestIp.getClientIp(req);
```

#### 2. XSS 방지
**현재**: 사용자 입력을 그대로 저장
**제안**: HTML 태그 sanitization

```javascript
const sanitizeHtml = require('sanitize-html');
const cleanContent = sanitizeHtml(content, {
  allowedTags: [],
  allowedAttributes: {}
});
```

#### 3. 비밀번호 해싱
**현재**: 평문으로 저장
**제안**: bcrypt로 암호화

```javascript
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);
```

---

### 📊 **데이터베이스 전환**

#### 현재 문제점
- JSON 파일 기반 저장
- 대용량 데이터 처리 시 성능 저하
- 동시 쓰기 작업 시 데이터 손실 가능

#### 제안: SQLite 또는 MongoDB 사용
```bash
# SQLite (간단, 파일 기반)
npm install better-sqlite3

# MongoDB (확장성)
npm install mongoose
```

**장점**:
- 트랜잭션 지원
- 인덱싱으로 검색 속도 향상
- 복잡한 쿼리 가능
- 데이터 무결성 보장

---

### 🔍 **검색 기능**

```javascript
app.get('/api/posts/search', (req, res) => {
  const { query, category, author } = req.query;
  
  let results = posts.filter(p => !p.isBlinded);
  
  if (query) {
    results = results.filter(p => 
      p.title.includes(query) || 
      p.content.includes(query)
    );
  }
  
  if (category) {
    results = results.filter(p => p.category === category);
  }
  
  if (author) {
    results = results.filter(p => p.author === author);
  }
  
  res.json({ success: true, posts: results });
});
```

---

### 🏷️ **해시태그 시스템**

```javascript
// 게시글 작성 시 해시태그 추출
const extractHashtags = (content) => {
  return content.match(/#[\w가-힣]+/g) || [];
};

// 해시태그로 검색
app.get('/api/posts/hashtag/:tag', (req, res) => {
  const tag = decodeURIComponent(req.params.tag);
  const results = posts.filter(p => 
    !p.isBlinded && 
    p.hashtags?.includes(tag)
  );
  res.json({ success: true, posts: results });
});
```

---

### 📱 **푸시 알림 (WebSocket)**

실시간 알림 기능:
- 내 게시글에 댓글이 달렸을 때
- 내 댓글에 답글이 달렸을 때
- 신고가 접수되었을 때 (관리자)

```javascript
const socketIo = require('socket.io');
const io = socketIo(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('사용자 접속:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('사용자 접속 해제:', socket.id);
  });
});

// 새 댓글 시 알림
io.emit('newComment', { postId, comment });
```

---

### 📸 **이미지 CDN 연동**

**현재**: base64로 저장 (DB 크기 증가)
**제안**: AWS S3, Cloudflare Images, ImageKit 사용

```javascript
// Cloudflare Images 예시
const uploadToCloudflare = async (imageBuffer) => {
  const formData = new FormData();
  formData.append('file', imageBuffer);
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: formData
    }
  );
  
  const { result } = await response.json();
  return result.variants[0]; // URL 반환
};
```

**장점**:
- DB 크기 대폭 감소
- 이미지 로딩 속도 향상
- 자동 리사이징 및 최적화
- CDN을 통한 글로벌 배포

---

### 🎯 **페이지네이션**

```javascript
app.get('/api/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const visiblePosts = posts.filter(p => !p.isBlinded);
  const paginatedPosts = visiblePosts.slice(skip, skip + limit);
  
  res.json({
    success: true,
    posts: paginatedPosts,
    pagination: {
      page,
      limit,
      total: visiblePosts.length,
      totalPages: Math.ceil(visiblePosts.length / limit)
    }
  });
});
```

---

### 🛡️ **관리자 대시보드 API**

```javascript
// 관리자 전용 통계
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const stats = {
    postsLast24h: posts.filter(p => new Date(p.date) > last24h).length,
    reportsLast24h: posts.reduce((sum, p) => 
      sum + p.reports.filter(r => new Date(r.date) > last24h).length, 0
    ),
    topReportedPosts: posts
      .filter(p => p.reports.length > 0)
      .sort((a, b) => b.reports.length - a.reports.length)
      .slice(0, 10),
    blindedPosts: posts.filter(p => p.isBlinded),
    activeUsers: new Set(posts.map(p => p.author)).size
  };
  
  res.json({ success: true, stats });
});

// 게시글 강제 삭제
app.delete('/api/admin/posts/:id', requireAdmin, async (req, res) => {
  const postIndex = posts.findIndex(p => p.id == req.params.id);
  if (postIndex !== -1) {
    posts.splice(postIndex, 1);
    await savePosts();
    res.json({ success: true });
  }
});

// 블라인드 해제
app.post('/api/admin/posts/:id/unblind', requireAdmin, (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  if (post) {
    post.isBlinded = false;
    post.reports = [];
    res.json({ success: true });
  }
});
```

---

### 📧 **이메일 알림 (선택적)**

관리자에게 중요 이벤트 알림:
- 게시글이 블라인드 처리되었을 때
- 신고가 5건 이상 접수되었을 때
- 서버 오류 발생 시

```javascript
const nodemailer = require('nodemailer');

const sendAdminAlert = async (subject, message) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_PASSWORD
    }
  });
  
  await transporter.sendMail({
    from: '육상 커뮤니티 <noreply@athletetime.com>',
    to: process.env.ADMIN_EMAIL,
    subject,
    html: message
  });
};
```

---

### 🎨 **다크모드 설정 저장**

사용자 환경 설정을 서버에 저장:
```javascript
const userPreferences = new Map();

app.get('/api/preferences/:userId', (req, res) => {
  const prefs = userPreferences.get(req.params.userId) || {
    theme: 'light',
    notificationsEnabled: true
  };
  res.json({ success: true, preferences: prefs });
});

app.post('/api/preferences/:userId', (req, res) => {
  userPreferences.set(req.params.userId, req.body);
  res.json({ success: true });
});
```

---

### 📊 **분석 및 통계**

사용자 행동 분석:
- 가장 많이 본 게시글
- 가장 활발한 시간대
- 인기 카테고리
- 사용자 유지율

```javascript
app.get('/api/analytics/trends', (req, res) => {
  const categoryStats = {};
  posts.forEach(p => {
    if (!categoryStats[p.category]) {
      categoryStats[p.category] = { count: 0, views: 0, likes: 0 };
    }
    categoryStats[p.category].count++;
    categoryStats[p.category].views += p.views;
    categoryStats[p.category].likes += p.likes.length;
  });
  
  res.json({ success: true, trends: categoryStats });
});
```

---

## 🎯 우선순위 권장 사항

### 단기 (즉시 적용 가능)
1. ✅ **Rate Limiting** - 이미 적용됨
2. ✅ **추가 API 엔드포인트** - 이미 적용됨
3. 🔒 **XSS 방지** (sanitize-html)
4. 🔍 **검색 기능**
5. 🎯 **페이지네이션**

### 중기 (프로젝트 성장 시)
6. 📊 **SQLite 데이터베이스 전환**
7. 🏷️ **해시태그 시스템**
8. 📸 **이미지 CDN 연동**
9. 🛡️ **관리자 대시보드**

### 장기 (확장성을 위해)
10. 📱 **WebSocket 실시간 알림**
11. 🔒 **IP 기반 Rate Limiting**
12. 📧 **이메일 알림**
13. 📊 **고급 분석 기능**

---

## 📦 추천 패키지 설치

```bash
# 보안
npm install sanitize-html bcrypt helmet

# 데이터베이스
npm install better-sqlite3
# 또는
npm install mongoose

# 유틸리티
npm install request-ip lodash validator

# 실시간 통신
npm install socket.io

# 이메일
npm install nodemailer

# 로깅
npm install winston
```

---

## 🚀 현재 서버 상태

**✅ 정상 작동 중**
- 포트: 3005
- 공개 URL: https://3005-iq027ecuq0v4g69kga779-2e77fc33.sandbox.novita.ai
- 헬스 체크: `/api/health`
- 통계: `/api/stats`

**주요 기능**:
- ✅ 게시글 CRUD
- ✅ 댓글 시스템
- ✅ 좋아요/싫어요
- ✅ 신고 및 자동 블라인드
- ✅ 이미지 자동 최적화 (Sharp)
- ✅ 90일 자동 삭제
- ✅ Rate Limiting (도배 방지)
- ✅ 카테고리별 조회
- ✅ 인기/활발한 게시글

**운영 정책**:
- 신고 10건 → 자동 블라인드
- 비추천 20개 → 자동 블라인드
- 90일 경과 → 자동 삭제
- 이미지 최대 5장, 2MB
- 1분당 게시글 3개, 댓글 10개 제한

---

## 📞 문의 및 피드백

추가 기능이 필요하거나 개선 사항이 있으면 언제든 말씀해주세요!

**현재 완성도: 85%** 🎉
- 핵심 기능 완성
- 운영 정책 완비
- 자동화 시스템 작동
- 확장성 고려된 구조
