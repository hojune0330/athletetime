# Athlete Time WebSocket Server

## 배포 방법

### Heroku
```bash
heroku create athletetime-chat
git init
git add .
git commit -m "WebSocket server"
git push heroku main
```

### Railway
1. https://railway.app 접속
2. GitHub 연동 또는 직접 업로드
3. 환경 변수 설정: PORT=3004

### Render
1. https://render.com 접속
2. New > Web Service
3. GitHub 연동
4. Start command: npm start
