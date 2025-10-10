# 🔧 Athlete Time 백엔드 통합 문서

## 📍 백엔드 서버 정보
- **URL**: `https://athletetime-backend.onrender.com`
- **플랜**: Render Starter (유료) - 24/7 운영
- **GitHub**: https://github.com/hojune0330/athletetime
- **자동 배포**: GitHub push 시 자동 배포

## 🌐 백엔드 서비스 엔드포인트

### 1. 채팅 서비스 (WebSocket)
- **WebSocket URL**: `wss://athletetime-backend.onrender.com/ws`
- **기능**: 실시간 채팅, 메시지 영구 저장

### 2. 익명 게시판 API (REST)
- **Base URL**: `https://athletetime-backend.onrender.com`
- **엔드포인트**:
  - `GET /api/posts` - 게시글 목록
  - `POST /api/posts` - 게시글 작성
  - `PUT /api/posts/:id` - 게시글 수정
  - `DELETE /api/posts/:id` - 게시글 삭제
  - `POST /api/posts/:id/comments` - 댓글 추가
  - `POST /api/posts/:id/vote` - 좋아요/싫어요

## 📁 백엔드 연동이 필요한 파일들

### 핵심 파일 (실제 사용)
1. **community-api.js** - 익명 게시판 API 연동
2. **chat-real.html** - 실시간 채팅
3. **js/api-config.js** - API 설정 통합 파일

### HTML 파일들의 백엔드 연동
- `index.html` - 메인 페이지
- `community.html` - 익명 게시판
- `chat-real.html` - 채팅방

## 🔄 백엔드 URL 업데이트 가이드

### 1. community-api.js 수정
```javascript
getAPIUrl() {
  if (window.location.hostname.includes('localhost')) {
    return 'http://localhost:3000';
  } else {
    // 모든 프로덕션 환경에서 Render 백엔드 사용
    return 'https://athletetime-backend.onrender.com';
  }
}
```

### 2. WebSocket 연결 (chat-real.html)
```javascript
// WebSocket URL 설정
const wsUrl = window.location.hostname === 'localhost'
  ? 'ws://localhost:3000/ws'
  : 'wss://athletetime-backend.onrender.com/ws';
```

### 3. API Config (js/api-config.js)
```javascript
const API_CONFIG = {
  baseURL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://athletetime-backend.onrender.com',
    
  wsURL: window.location.hostname === 'localhost'
    ? 'ws://localhost:3000/ws'
    : 'wss://athletetime-backend.onrender.com/ws'
};
```

## 🚨 문제 해결 체크리스트

### 게시판이 비어 보이는 문제
- [ ] community-api.js의 API URL 확인
- [ ] CORS 설정 확인
- [ ] 서버 로그 확인 (Render Dashboard)
- [ ] 브라우저 콘솔 에러 확인

### 채팅 연결 안되는 문제
- [ ] WebSocket URL에 `/ws` 경로 포함 확인
- [ ] wss:// 프로토콜 사용 확인 (프로덕션)
- [ ] 서버 WebSocket 핸들러 작동 확인

### 데이터가 저장 안되는 문제
- [ ] 서버의 파일 쓰기 권한 확인
- [ ] JSON 파일 경로 확인
- [ ] 서버 재시작 시 데이터 로드 확인

## 📝 로컬 테스트 방법

```bash
# 1. 로컬에서 백엔드 서버 실행
npm install
npm start

# 2. 브라우저에서 테스트
# http://localhost:3000 - 서버 상태 확인
# http://localhost:3000/api/posts - 게시글 API 확인

# 3. 프론트엔드 테스트
# index.html 열어서 기능 확인
```

## 🔐 환경별 설정

### 로컬 개발 (localhost)
- HTTP/WS 프로토콜 사용
- 포트 3000 사용

### Netlify 배포 (athlete-time.netlify.app)
- HTTPS/WSS 프로토콜 사용
- Render 백엔드 연결

### Render 백엔드
- 자동 HTTPS 인증서
- 환경변수 PORT 자동 설정
- 데이터 파일 저장 (주의: 재배포 시 초기화될 수 있음)

## 📊 모니터링

### Render Dashboard
1. https://dashboard.render.com 접속
2. athletetime-backend 서비스 선택
3. Logs 탭에서 실시간 로그 확인
4. Metrics 탭에서 성능 모니터링

### 브라우저 개발자 도구
1. Network 탭에서 API 요청 확인
2. Console 탭에서 에러 확인
3. WS 탭에서 WebSocket 연결 확인

## 🆘 긴급 대응

### 서버 다운 시
1. Render Dashboard에서 서비스 상태 확인
2. Manual Deploy로 재배포
3. 로그 확인하여 에러 원인 파악

### 데이터 손실 시
1. 로컬 백업 확인
2. GitHub 저장소의 이전 커밋 확인
3. 필요시 외부 데이터베이스 마이그레이션 고려

## 📅 유지보수 계획

### 정기 점검
- 매주: 서버 로그 확인
- 매월: 데이터 백업
- 분기별: 성능 최적화 검토

### 업그레이드 고려사항
- PostgreSQL 데이터베이스 추가 (데이터 영구 저장)
- Redis 캐시 추가 (성능 향상)
- CDN 적용 (정적 파일 배포)

## 📞 지원 연락처
- GitHub Issues: https://github.com/hojune0330/athletetime/issues
- Render Support: https://render.com/support

---
마지막 업데이트: 2025-10-10