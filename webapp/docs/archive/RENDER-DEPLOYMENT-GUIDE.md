# 🚀 Render.com 배포 가이드 (10분 완료)

## 📋 체크리스트
- ✅ GitHub 저장소 준비 완료 (방금 푸시함)
- ✅ render.yaml 파일 생성 완료
- ✅ server.js 백엔드 서버 준비 완료
- ✅ package.json 의존성 설정 완료

---

## 🎯 Step 1: Render 계정 생성 (2분)

### 1.1 가입하기
👉 **[https://render.com](https://render.com)** 접속

### 1.2 GitHub으로 가입
- "Get Started for Free" 클릭
- "Sign up with GitHub" 선택
- GitHub 권한 승인

---

## 🔗 Step 2: GitHub 저장소 연결 (2분)

### 2.1 Dashboard 접속
- 로그인 후 Dashboard로 이동
- 우측 상단 "New +" 버튼 클릭

### 2.2 Blueprint 선택
- **"Blueprint"** 선택 (중요!)
- "Connect GitHub repository" 클릭

### 2.3 저장소 선택
- "hojune0330/athlete-time" 저장소 선택
- "Connect" 클릭

---

## ⚡ Step 3: 자동 배포 시작 (3분)

### 3.1 Blueprint 감지
Render가 자동으로 `render.yaml` 파일을 감지합니다.

### 3.2 서비스 확인
자동 생성될 서비스들:
- ✅ athlete-time-backend (Node.js 서버)
- ✅ athlete-time-frontend (정적 사이트)
- ✅ athlete-time-db (PostgreSQL)
- ✅ athlete-time-redis (Redis 캐시)

### 3.3 배포 시작
- "Apply" 버튼 클릭
- 약 5-10분 대기

---

## 🔧 Step 4: 환경 변수 설정 (2분)

### 4.1 Backend 서비스 설정
Dashboard → athlete-time-backend → Environment

추가할 환경 변수:
```
NODE_ENV=production
CORS_ORIGIN=https://athlete-time.netlify.app
FRONTEND_URL=https://athlete-time.netlify.app
```

### 4.2 데이터베이스 연결 확인
- DATABASE_URL: 자동 설정됨
- REDIS_URL: 자동 설정됨

---

## 🌐 Step 5: 프론트엔드 연결 (1분)

### 5.1 백엔드 URL 확인
- athlete-time-backend 서비스 클릭
- URL 복사: `https://athlete-time-backend.onrender.com`

### 5.2 프론트엔드 코드 업데이트
`js/api-config.js` 파일에서:
```javascript
baseURL: 'https://athlete-time-backend.onrender.com'
wsURL: 'wss://athlete-time-backend.onrender.com'
```

### 5.3 GitHub 푸시
```bash
git add .
git commit -m "Update API endpoints for production"
git push origin main
```

---

## ✅ Step 6: 테스트 (2분)

### 6.1 서비스 상태 확인
Dashboard에서 모든 서비스가 "Live" 상태인지 확인

### 6.2 API 테스트
브라우저에서 접속:
```
https://athlete-time-backend.onrender.com/api/posts
```

### 6.3 채팅 테스트
WebSocket 연결 테스트:
```javascript
const ws = new WebSocket('wss://athlete-time-backend.onrender.com');
ws.onopen = () => console.log('Connected!');
```

---

## 💰 요금 정보

### 월 요금 (자동 청구)
| 서비스 | 플랜 | 가격 |
|--------|------|------|
| Backend | Starter | $7/월 |
| PostgreSQL | Starter | $7/월 |
| Redis | Starter | $10/월 |
| Frontend | Free | $0 |
| **총합** | | **$24/월** |

### 무료 사용 가능
- 처음 가입시 $7 크레딧 제공
- 약 1주일 무료 사용 가능

---

## 🆘 문제 해결

### 배포 실패시
1. Logs 탭에서 에러 확인
2. package.json 의존성 확인
3. Node 버전 확인 (18+ 필요)

### 데이터베이스 연결 실패
1. DATABASE_URL 환경변수 확인
2. SSL 설정 확인
3. 방화벽 설정 확인

### WebSocket 연결 실패
1. wss:// 프로토콜 사용 확인
2. CORS 설정 확인
3. 포트 설정 확인

---

## 📱 최종 URL

배포 완료 후 접속 가능한 URL:

### Backend API
```
https://athlete-time-backend.onrender.com
```

### WebSocket
```
wss://athlete-time-backend.onrender.com
```

### 프론트엔드 (Netlify)
```
https://athlete-time.netlify.app
```

---

## 🎉 완료!

축하합니다! 이제 실제 운영 가능한 서비스가 배포되었습니다.

### 다음 단계
1. 커스텀 도메인 연결
2. 모니터링 설정
3. 백업 정책 수립
4. 스케일링 계획

---

## 📞 지원

### Render 지원
- 문서: https://render.com/docs
- 지원: support@render.com
- 상태: https://status.render.com

### 커뮤니티
- Discord: https://discord.gg/render
- Reddit: r/render

---

*작성일: 2025년 1월 8일*
*작성자: Athlete Time Team*