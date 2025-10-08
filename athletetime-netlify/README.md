# Athlete Time - Netlify 배포

## ⚠️ 중요 사항

Netlify는 정적 사이트 호스팅만 지원하므로:
- ✅ HTML, CSS, JavaScript (클라이언트) 작동
- ❌ Node.js 서버 (chat-server-enhanced.js) 작동 안 함
- ❌ WebSocket 서버 작동 안 함

## 🔧 해결 방법

### 채팅 기능을 위한 별도 서버 필요

1. **Heroku에 WebSocket 서버 배포**
```bash
# 별도 폴더에서
mkdir athletetime-websocket
cd athletetime-websocket
cp ../chat-server-enhanced.js .
cp ../package.json .

# Heroku 배포
heroku create athletetime-chat
git init
git add .
git commit -m "WebSocket server"
git push heroku main
```

2. **chat-real.html에서 WebSocket URL 변경**
```javascript
// 기존
wsUrl = 'ws://localhost:3004';

// 변경
wsUrl = 'wss://athletetime-chat.herokuapp.com';
```

## 📦 Netlify 배포 방법

### 방법 1: Drag & Drop
1. https://app.netlify.com 접속
2. 이 폴더를 드래그 & 드롭

### 방법 2: Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy
netlify deploy --prod
```

### 방법 3: GitHub 연동
1. GitHub 저장소 연결
2. 자동 배포 설정

## 🌟 작동하는 기능
- ✅ 페이스 계산기
- ✅ 훈련 계산기
- ✅ 익명 게시판 (localStorage)
- ✅ 다크/라이트 모드
- ⚠️ 채팅 (외부 서버 필요)

## 📝 환경 변수 설정
Netlify 대시보드 > Site settings > Environment variables:
- `WEBSOCKET_URL`: wss://your-websocket-server.com
