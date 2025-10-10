# 🚀 Athletic Time 프로덕션 환경 설정 가이드

## 📌 아키텍처 구성

```
[Netlify - 프론트엔드]  ←→  [Render - 백엔드]  ←→  [PostgreSQL - DB]
    (무료 플랜)              (유료 플랜)           (Render 내장)
```

## 🌐 프로덕션 URL

- **프론트엔드 (Netlify)**: https://athlete-time.netlify.app
- **백엔드 API (Render)**: https://athletetime-backend.onrender.com
- **WebSocket**: wss://athletetime-backend.onrender.com

## 🔧 Render 백엔드 설정

### 1. 환경 변수 (Environment Variables)
Render 대시보드에서 설정해야 할 환경 변수:

```bash
# 필수 환경 변수
DATABASE_URL=<Render가 자동 제공>
NODE_ENV=production
PORT=<Render가 자동 설정>

# CORS 설정
CORS_ORIGIN=https://athlete-time.netlify.app

# 선택적 (보안 강화)
JWT_SECRET=<랜덤 문자열>
SESSION_SECRET=<랜덤 문자열>
```

### 2. Build & Start Commands

```yaml
Build Command: npm install
Start Command: npm start
```

### 3. 서비스 구성

- **Web Service**: Express.js 서버 (server-postgres.js)
- **Database**: PostgreSQL (Render 내장)
- **Auto-Deploy**: GitHub 연동으로 자동 배포

## 📦 package.json 설정

```json
{
  "scripts": {
    "start": "node server-postgres.js",  // Render에서 실행
    "dev": "nodemon server.js",          // 로컬 개발용
    "chat": "node chat-server-enhanced.js",
    "community": "node community-server.js"
  }
}
```

## 🗄️ PostgreSQL 데이터베이스 스키마

```sql
-- posts 테이블
CREATE TABLE posts (
    id BIGINT PRIMARY KEY,
    category VARCHAR(50),
    title VARCHAR(255),
    author VARCHAR(100),
    instagram VARCHAR(100),
    content TEXT,
    password_hash VARCHAR(255),
    images JSONB,
    poll JSONB,
    date TIMESTAMP DEFAULT NOW(),
    views INTEGER DEFAULT 0,
    likes TEXT[],
    dislikes TEXT[],
    comments JSONB DEFAULT '[]',
    reports TEXT[],
    is_notice BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_blinded BOOLEAN DEFAULT false
);

-- 인덱스
CREATE INDEX idx_posts_date ON posts(date DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_views ON posts(views DESC);
```

## 🔐 보안 설정

### 1. 적용된 보안 기능
- ✅ **Helmet.js**: 보안 헤더 설정
- ✅ **bcrypt**: 비밀번호 해시화 (SALT_ROUNDS=10)
- ✅ **DOMPurify**: XSS 방지
- ✅ **Rate Limiting**: API 요청 제한
  - 일반 API: 15분당 100회
  - 게시글 작성: 15분당 5회
  - 조회수 증가: 1분당 30회
- ✅ **CORS**: Netlify 도메인만 허용

### 2. 조회수 중복 방지
- IP 기반 1시간 캐시
- 동일 IP에서 1시간 이내 재조회 시 조회수 미증가

## 🔄 API 엔드포인트

### 게시글 관련
- `GET /api/posts` - 모든 게시글 조회
- `GET /api/posts/:id` - 특정 게시글 조회
- `POST /api/posts` - 게시글 작성
- `PUT /api/posts/:id` - 게시글 수정
- `DELETE /api/posts/:id` - 게시글 삭제
- `PUT /api/posts/:id/views` - 조회수 증가

### 댓글 관련
- `POST /api/posts/:id/comments` - 댓글 작성
- `DELETE /api/posts/:postId/comments/:commentId` - 댓글 삭제

### 투표 관련
- `POST /api/posts/:id/vote` - 좋아요/싫어요

### WebSocket
- `ws://localhost:3004` (개발)
- `wss://athletetime-backend.onrender.com` (프로덕션)

## 🐛 문제 해결

### 1. CORS 오류
```javascript
// community-api.js에서 API URL 확인
getAPIUrl() {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3005';
  }
  return 'https://athletetime-backend.onrender.com';
}
```

### 2. 조회수가 증가하지 않음
- Render 대시보드에서 서버 로그 확인
- PostgreSQL 연결 상태 확인
- Rate limiting 설정 확인

### 3. 데이터가 사라짐
- PostgreSQL 백업 설정 확인
- Render 유료 플랜 상태 확인
- 데이터베이스 크기 제한 확인

## 📊 모니터링

### Render 대시보드에서 확인할 사항
1. **Metrics**: CPU, Memory 사용량
2. **Logs**: 실시간 서버 로그
3. **Database**: PostgreSQL 상태 및 쿼리 성능
4. **Deploy**: 배포 상태 및 이력

## 🔄 배포 프로세스

1. **개발**: 로컬에서 개발 및 테스트
2. **커밋**: GitHub에 push
3. **자동 배포**: 
   - Netlify: main 브랜치 push 시 자동 배포
   - Render: main 브랜치 push 시 자동 배포
4. **확인**: 프로덕션 사이트에서 동작 확인

## ⚠️ 주의사항

1. **localStorage 사용 금지**: 모든 데이터는 Render PostgreSQL에 저장
2. **API 호출 필수**: 프론트엔드는 항상 백엔드 API 사용
3. **환경 변수 관리**: 민감한 정보는 절대 코드에 포함하지 않음
4. **백업**: PostgreSQL 정기 백업 설정 권장

## 📞 지원

- **Render Status**: https://status.render.com
- **Netlify Status**: https://www.netlifystatus.com
- **GitHub Repository**: https://github.com/hojune0330/athletetime