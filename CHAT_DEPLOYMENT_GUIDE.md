# 🚀 실시간 채팅 시스템 배포 가이드

## 📋 배포 개요

애슬리트 타임의 실시간 채팅 시스템은 **Render.com**에 배포됩니다.
- **커뮤니티 백엔드**: `athlete-time-backend` (HTTP)
- **채팅 WebSocket 서버**: `athlete-time-chat` (WebSocket)

---

## 🔧 Render.com 배포 설정

### 1️⃣ 채팅 WebSocket 서버 배포

#### Render Dashboard 설정:

1. **New Web Service** 생성
2. **Repository 연결**: GitHub repository 선택
3. **서비스 이름**: `athlete-time-chat`
4. **Runtime**: Node
5. **Build Command**: `npm install`
6. **Start Command**: `npm run start:chat`

#### 환경변수 설정:

```bash
NODE_ENV=production
PORT=3006
```

#### 서비스 URL:
```
wss://athlete-time-chat.onrender.com
```

---

### 2️⃣ 프론트엔드 설정

`chat-improved-chzzk.html` 파일에서 WebSocket URL이 자동으로 환경을 감지합니다:

```javascript
// 로컬 환경
ws://localhost:3006

// 프로덕션 환경  
wss://athlete-time-chat.onrender.com
```

---

## 📱 모바일 최적화 기능

### ✅ 구현된 기능:

1. **반응형 디자인**
   - 768px 이하: 모바일 레이아웃
   - 375px 이하: 소형 스마트폰 최적화
   - 가로 모드 지원

2. **터치 최적화**
   - 더블탭 줌 방지
   - 스와이프 제스처 (사이드바 닫기)
   - 터치 하이라이트 제거
   - 부드러운 스크롤 (-webkit-overflow-scrolling)

3. **모바일 UX**
   - iOS 키보드 자동 스크롤
   - Safe area inset 지원
   - 주소창 숨김 대응 (dvh 단위)
   - 오버레이 배경 블러

4. **입력 최적화**
   - iOS 16px 폰트 사이즈 (자동 줌 방지)
   - 키보드 올라올 때 스크롤 유지
   - 터치 액션 최적화

---

## 🧪 배포 전 테스트 체크리스트

### ✅ WebSocket 연결
- [ ] 로컬 환경에서 `ws://localhost:3006` 연결 확인
- [ ] 프로덕션 환경에서 `wss://athlete-time-chat.onrender.com` 연결 확인

### ✅ 채팅 기능
- [ ] 메시지 전송/수신
- [ ] 방 전환
- [ ] 사용자 수 카운트
- [ ] 메시지 히스토리 로드
- [ ] 재연결 자동 시도

### ✅ 모바일 테스트
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] 가로/세로 모드 전환
- [ ] 키보드 올라올 때 레이아웃
- [ ] 스와이프 제스처

---

## 📊 배포 후 모니터링

### Render.com 로그 확인:

```bash
# 채팅 서버 로그
https://dashboard.render.com/web/athlete-time-chat/logs

# 커뮤니티 백엔드 로그  
https://dashboard.render.com/web/athlete-time-backend/logs
```

### 모니터링 포인트:

1. **연결 상태**
   - WebSocket 연결 성공률
   - 재연결 시도 빈도

2. **성능**
   - 메시지 전송 지연시간
   - 동시 접속자 수

3. **에러 로그**
   - 연결 실패 원인
   - 서버 오류 메시지

---

## 🔐 보안 설정

### CORS 허용 도메인:

```javascript
// community-server.js & chat-websocket-server.js
cors({
  origin: [
    'https://athlete-time.netlify.app',
    'https://www.athlete-time.com',
    'http://localhost:5173'
  ]
})
```

### Rate Limiting:

채팅 서버에 구현된 제한:
- 메시지: 3개/분
- 댓글: 10개/분

---

## 🆘 트러블슈팅

### 1. WebSocket 연결 실패

**증상**: "WebSocket 연결 실패" 메시지

**해결책**:
1. Render 서비스 상태 확인
2. 환경변수 `PORT` 설정 확인
3. HTTPS/WSS 프로토콜 확인

### 2. 모바일에서 키보드 문제

**증상**: 키보드 올라올 때 화면 깨짐

**해결책**:
- `viewport` 메타태그 확인
- `dvh` 단위 사용 확인
- `safe-area-inset` 적용 확인

### 3. 메시지 히스토리 안 보임

**증상**: 방 입장 시 이전 메시지 없음

**해결책**:
1. `/chat-data/` 디렉토리 확인
2. 파일 권한 확인
3. 서버 로그에서 메시지 로드 확인

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 생성
2. 서버 로그 첨부
3. 브라우저 콘솔 로그 첨부

---

**배포 완료 후 사용자에게 공유할 URL:**
```
https://athlete-time.netlify.app/chat-improved-chzzk.html
```

🏃‍♂️ 육상인들의 실시간 소통을 응원합니다! 🎯
