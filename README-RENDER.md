# Athletic Time 백엔드 서버 - Render 배포 가이드

## 🚀 Render.com 배포 방법

### 1. GitHub 저장소에 푸시
```bash
git add .
git commit -m "Add unified backend server for Render deployment"
git push origin main
```

### 2. Render.com에서 새 서비스 생성

1. [Render.com](https://render.com) 로그인
2. Dashboard에서 "New +" → "Web Service" 클릭
3. GitHub 저장소 연결
4. 설정:
   - **Name**: `athlete-time-backend` (또는 원하는 이름)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (무료)

### 3. 환경 변수 설정 (선택사항)

Render Dashboard → Environment에서:
- `NODE_ENV`: `production`
- `PORT`: (Render가 자동 설정)

### 4. 배포 확인

배포 완료 후 제공되는 URL:
```
https://your-app-name.onrender.com
```

### 5. 프론트엔드 설정 업데이트

`community-api.js` 파일에서 Render URL 설정:

```javascript
// Render 백엔드 URL로 변경
return 'https://your-app-name.onrender.com';
```

## 📡 API 엔드포인트

### WebSocket (채팅)
- **연결**: `wss://your-app-name.onrender.com/ws`

### REST API (게시판)
- **게시글 목록**: `GET https://your-app-name.onrender.com/api/posts`
- **게시글 작성**: `POST https://your-app-name.onrender.com/api/posts`
- **게시글 수정**: `PUT https://your-app-name.onrender.com/api/posts/:id`
- **게시글 삭제**: `DELETE https://your-app-name.onrender.com/api/posts/:id`
- **댓글 추가**: `POST https://your-app-name.onrender.com/api/posts/:id/comments`
- **투표**: `POST https://your-app-name.onrender.com/api/posts/:id/vote`

## ⚙️ 통합 서버 기능

1. **채팅 서버** (WebSocket)
   - 실시간 메시지
   - 메시지 영구 저장
   - 다중 채팅방 지원

2. **게시판 API** (REST)
   - CRUD 작업
   - 댓글 시스템
   - 좋아요/싫어요
   - 데이터 영구 저장

3. **데이터 저장**
   - 5분마다 자동 저장
   - 서버 종료 시 저장
   - JSON 파일 기반 저장

## 🔧 로컬 테스트

```bash
# 의존성 설치
npm install

# 서버 시작
npm start

# 개발 모드 (nodemon 사용)
npm run dev
```

## 📝 주의사항

1. **무료 플랜 제한**:
   - 15분 동안 요청이 없으면 서버가 일시 중지됨
   - 첫 요청 시 재시작되므로 약간의 지연 발생
   - 디스크 저장소는 임시적 (재배포 시 초기화)

2. **데이터 영속성**:
   - 무료 플랜에서는 재배포 시 데이터 손실
   - 중요한 데이터는 외부 데이터베이스 사용 권장
   - PostgreSQL, MongoDB 등 Render의 데이터베이스 서비스 활용 가능

3. **CORS 설정**:
   - 모든 도메인 허용으로 설정됨
   - 프로덕션에서는 특정 도메인만 허용하도록 변경 권장

## 🚨 문제 해결

### 연결 오류
- Render URL이 정확한지 확인
- HTTPS/WSS 프로토콜 사용 확인
- CORS 설정 확인

### 데이터 손실
- 정기적인 백업 권장
- 외부 데이터베이스 사용 고려

### 성능 문제
- 무료 플랜의 제한 이해
- 유료 플랜 업그레이드 고려