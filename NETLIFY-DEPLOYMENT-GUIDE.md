# 📦 Netlify 배포 가이드

## 준비된 파일

### 1. **athletetime-netlify.zip** (82KB)
Netlify에 직접 업로드할 수 있는 정적 파일 패키지

### 2. **athletetime-websocket.zip** (6KB)
채팅 기능을 위한 WebSocket 서버 (별도 배포 필요)

---

## 🚀 Netlify 배포 방법

### 방법 1: Drag & Drop (가장 쉬움) ✨

1. **Netlify 접속**: https://app.netlify.com
2. **로그인** (GitHub, GitLab, 이메일 등)
3. **Sites 탭**에서 하단의 점선 박스 찾기
4. **athletetime-netlify.zip** 파일을 드래그 & 드롭
5. 자동 배포 완료! (1-2분 소요)

### 방법 2: Netlify CLI

```bash
# CLI 설치
npm install -g netlify-cli

# 압축 해제
unzip athletetime-netlify.zip
cd athletetime-netlify

# 배포
netlify deploy
netlify deploy --prod
```

---

## ⚠️ 중요: 채팅 기능 설정

Netlify는 정적 호스팅만 지원하므로 채팅을 위해 **별도 WebSocket 서버**가 필요합니다.

### 옵션 1: Heroku (무료 크레딧)

1. **Heroku 계정 생성**: https://heroku.com
2. **athletetime-websocket.zip** 압축 해제
3. 배포:
```bash
cd athletetime-websocket-server
heroku create your-app-name
git init
git add .
git commit -m "Initial commit"
git push heroku main
```
4. WebSocket URL 확인: `wss://your-app-name.herokuapp.com`

### 옵션 2: Railway (무료 $5 크레딧)

1. **Railway 접속**: https://railway.app
2. **New Project** → **Deploy from GitHub** 또는 **Deploy Local Directory**
3. **athletetime-websocket.zip** 내용 업로드
4. 자동 배포 완료
5. Settings에서 도메인 생성

### 옵션 3: Render (무료 플랜)

1. **Render 접속**: https://render.com
2. **New** → **Web Service**
3. GitHub 연동 또는 직접 업로드
4. **Start Command**: `npm start`
5. 배포 완료

---

## 🔧 WebSocket URL 연결

WebSocket 서버 배포 후:

1. **Netlify 대시보드** → **Site settings** → **Environment variables**
2. 추가:
   - Key: `WEBSOCKET_URL`
   - Value: `wss://your-websocket-server.herokuapp.com`

또는 chat-real.html 직접 수정:
```javascript
// 기존
wsUrl = 'ws://localhost:3004';

// 변경 (예시)
wsUrl = 'wss://athletetime-chat.herokuapp.com';
```

---

## ✅ 작동하는 기능 (Netlify)

| 기능 | 상태 | 비고 |
|------|------|------|
| 메인 페이지 | ✅ 정상 | |
| 페이스 계산기 | ✅ 정상 | |
| 훈련 계산기 | ✅ 정상 | |
| 익명 게시판 | ✅ 정상 | localStorage 사용 |
| 다크/라이트 모드 | ✅ 정상 | |
| 실시간 채팅 | ⚠️ 조건부 | WebSocket 서버 필요 |

---

## 🌟 배포 완료 후

### 사이트 URL 예시
- Netlify: `https://amazing-athlete-123456.netlify.app`
- 커스텀 도메인 설정 가능

### 커스텀 도메인 설정
1. Netlify 대시보드 → Domain settings
2. Add custom domain
3. DNS 설정 안내 따르기

---

## 📝 체크리스트

- [ ] athletetime-netlify.zip을 Netlify에 업로드
- [ ] WebSocket 서버 배포 (Heroku/Railway/Render)
- [ ] chat-real.html에 WebSocket URL 업데이트
- [ ] 모든 페이지 테스트
- [ ] 커스텀 도메인 설정 (선택)

---

## 🆘 문제 해결

### 페이지가 안 열려요
- index.html이 루트에 있는지 확인
- _redirects 파일 확인

### 채팅이 안 돼요
- WebSocket 서버가 실행 중인지 확인
- wss:// 프로토콜 사용 확인
- CORS 설정 확인

### 스타일이 깨져요
- 브라우저 캐시 삭제
- 강제 새로고침 (Ctrl+F5)

---

**준비 완료!** 🎉

이제 **athletetime-netlify.zip**을 Netlify에 드래그 & 드롭하면 즉시 배포됩니다!