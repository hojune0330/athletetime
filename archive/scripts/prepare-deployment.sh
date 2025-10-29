#!/bin/bash

echo "🚀 배포 준비 시작..."

# 배포 디렉토리 생성
DEPLOY_DIR="/home/user/webapp/athletetime-deployment"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo "📁 배포 디렉토리 생성: $DEPLOY_DIR"

# 1. 핵심 HTML 파일 복사
echo "📄 HTML 파일 복사 중..."
cp index.html $DEPLOY_DIR/
cp pace-calculator.html $DEPLOY_DIR/
cp training-calculator.html $DEPLOY_DIR/
cp community.html $DEPLOY_DIR/
cp chat-real.html $DEPLOY_DIR/

# 2. JavaScript 파일 복사 (서버 및 클라이언트)
echo "📜 JavaScript 파일 복사 중..."
cp chat-server-enhanced.js $DEPLOY_DIR/
cp theme-toggle.js $DEPLOY_DIR/
cp -r node_modules $DEPLOY_DIR/ 2>/dev/null || echo "  ⚠️ node_modules는 나중에 npm install로 설치"

# 3. 이미지 및 리소스 파일
echo "🖼️ 리소스 파일 복사 중..."
mkdir -p $DEPLOY_DIR/images
cp *.png $DEPLOY_DIR/images/ 2>/dev/null || echo "  ℹ️ PNG 이미지 없음"
cp *.jpg $DEPLOY_DIR/images/ 2>/dev/null || echo "  ℹ️ JPG 이미지 없음"
cp *.svg $DEPLOY_DIR/images/ 2>/dev/null || echo "  ℹ️ SVG 이미지 없음"

# 4. 설정 파일
echo "⚙️ 설정 파일 생성 중..."

# package.json 생성
cat > $DEPLOY_DIR/package.json << 'EOF'
{
  "name": "athletetime",
  "version": "1.0.0",
  "description": "Athlete Time - Running Calculator & Community Platform",
  "main": "chat-server-enhanced.js",
  "scripts": {
    "start": "node chat-server-enhanced.js",
    "serve": "python3 -m http.server 8080",
    "dev": "concurrently \"npm run start\" \"npm run serve\"",
    "production": "NODE_ENV=production npm run dev"
  },
  "keywords": [
    "running",
    "calculator",
    "pace",
    "training",
    "marathon"
  ],
  "author": "Athlete Time Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 5. 환경 설정 파일
cat > $DEPLOY_DIR/.env.example << 'EOF'
# 서버 설정
PORT=8080
WS_PORT=3004
NODE_ENV=production

# 도메인 설정
DOMAIN=athletetime.com
WEBSOCKET_URL=wss://chat.athletetime.com

# 보안 설정
CORS_ORIGIN=https://athletetime.com
EOF

# 6. README 파일
cat > $DEPLOY_DIR/README.md << 'EOF'
# Athlete Time - 배포 가이드

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 열어 실제 값으로 수정
```

### 3. 서버 시작

#### 개발 모드
```bash
npm run dev
```

#### 프로덕션 모드
```bash
npm run production
```

## 📦 파일 구조
```
athletetime-deployment/
├── index.html              # 메인 페이지
├── pace-calculator.html    # 페이스 계산기
├── training-calculator.html # 훈련 계산기
├── community.html          # 익명 게시판
├── chat-real.html         # 실시간 채팅
├── chat-server-enhanced.js # WebSocket 서버
├── theme-toggle.js        # 다크/라이트 모드
├── package.json           # 의존성 관리
└── .env.example          # 환경 변수 예제
```

## 🌐 배포 옵션

### Vercel (정적 파일)
```bash
npm i -g vercel
vercel
```

### Heroku (전체 앱)
```bash
heroku create athletetime
git push heroku main
```

### Docker
```bash
docker build -t athletetime .
docker run -p 8080:8080 -p 3004:3004 athletetime
```

## ⚙️ 포트 설정
- 웹 서버: 8080
- WebSocket: 3004

## 📝 주의사항
- HTTPS 환경에서는 WSS 프로토콜 사용 필수
- CORS 설정 확인 필요
- 방화벽에서 포트 3004 열기 필요
EOF

# 7. .gitignore 파일
cat > $DEPLOY_DIR/.gitignore << 'EOF'
node_modules/
.env
*.log
.DS_Store
dist/
build/
*.bak
*.tmp
EOF

# 8. Dockerfile (옵션)
cat > $DEPLOY_DIR/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080 3004

CMD ["npm", "run", "production"]
EOF

# 9. docker-compose.yml (옵션)
cat > $DEPLOY_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:8080"
      - "3004:3004"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
EOF

# 10. 시작 스크립트
cat > $DEPLOY_DIR/start.sh << 'EOF'
#!/bin/bash

echo "🚀 Athlete Time 서버 시작..."

# Node.js 체크
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    exit 1
fi

# 의존성 설치
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

# 환경 변수 확인
if [ ! -f ".env" ]; then
    echo "⚠️ .env 파일이 없습니다. .env.example을 복사합니다."
    cp .env.example .env
fi

# 서버 시작
echo "✅ 서버 시작..."
npm run production
EOF

chmod +x $DEPLOY_DIR/start.sh

# 파일 개수 확인
echo ""
echo "📊 배포 준비 완료!"
echo "  - HTML 파일: $(ls -1 $DEPLOY_DIR/*.html 2>/dev/null | wc -l)개"
echo "  - JS 파일: $(ls -1 $DEPLOY_DIR/*.js 2>/dev/null | wc -l)개"
echo "  - 설정 파일: $(ls -1 $DEPLOY_DIR/.* 2>/dev/null | grep -v "^\.$" | grep -v "^\.\.$" | wc -l)개"
echo ""
echo "📁 배포 디렉토리: $DEPLOY_DIR"
echo ""
echo "다음 명령으로 시작하세요:"
echo "  cd $DEPLOY_DIR"
echo "  ./start.sh"