#!/bin/bash

echo "🔌 WebSocket 서버 패키지 준비 (Heroku/Railway용)..."

WS_DIR="/home/user/webapp/athletetime-websocket-server"
rm -rf $WS_DIR
mkdir -p $WS_DIR

# 1. 서버 파일 복사
cp chat-server-enhanced.js $WS_DIR/

# 2. package.json 생성
cat > $WS_DIR/package.json << 'EOF'
{
  "name": "athletetime-websocket",
  "version": "1.0.0",
  "description": "WebSocket server for Athlete Time chat",
  "main": "chat-server-enhanced.js",
  "scripts": {
    "start": "node chat-server-enhanced.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5"
  }
}
EOF

# 3. Procfile 생성 (Heroku용)
cat > $WS_DIR/Procfile << 'EOF'
web: node chat-server-enhanced.js
EOF

# 4. README 생성
cat > $WS_DIR/README.md << 'EOF'
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
EOF

# 5. .gitignore
cat > $WS_DIR/.gitignore << 'EOF'
node_modules/
.env
*.log
EOF

# ZIP 생성
cd /home/user/webapp
zip -r athletetime-websocket.zip athletetime-websocket-server/*

echo "✅ WebSocket 서버 패키지 준비 완료!"
echo "📦 athletetime-websocket.zip 생성됨"