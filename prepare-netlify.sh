#!/bin/bash

echo "🌐 Netlify 배포 준비 시작..."

# Netlify 배포 디렉토리 생성
NETLIFY_DIR="/home/user/webapp/athletetime-netlify"
rm -rf $NETLIFY_DIR
mkdir -p $NETLIFY_DIR

echo "📁 Netlify 디렉토리 생성: $NETLIFY_DIR"

# 1. HTML 파일 복사 (정적 파일만)
echo "📄 HTML 파일 복사 중..."
cp index.html $NETLIFY_DIR/
cp pace-calculator.html $NETLIFY_DIR/
cp training-calculator.html $NETLIFY_DIR/
cp community.html $NETLIFY_DIR/
cp chat-real.html $NETLIFY_DIR/

# 2. JavaScript 파일 복사 (클라이언트 사이드만)
echo "📜 클라이언트 JavaScript 복사 중..."
cp theme-toggle.js $NETLIFY_DIR/

# 3. Netlify 설정 파일 생성
echo "⚙️ Netlify 설정 파일 생성 중..."

# netlify.toml 생성
cat > $NETLIFY_DIR/netlify.toml << 'EOF'
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = {Role = ["admin", "user"]}

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
EOF

# 4. _redirects 파일 생성 (SPA 라우팅용)
cat > $NETLIFY_DIR/_redirects << 'EOF'
# SPA 라우팅
/*    /index.html   200
EOF

# 5. 환경 변수 설정 파일
cat > $NETLIFY_DIR/.env.production << 'EOF'
# Netlify 환경에서는 외부 WebSocket 서버 필요
# 예: Heroku, Railway, Render 등에 chat-server-enhanced.js 배포
VITE_WEBSOCKET_URL=wss://your-websocket-server.herokuapp.com
EOF

# 6. chat-real.html 수정 (외부 WebSocket 서버 연결용)
echo "🔧 chat-real.html WebSocket URL 수정 중..."
sed -i.bak "s|wsUrl = 'wss://3004-.*\.e2b\.dev'|wsUrl = window.WEBSOCKET_URL || 'wss://your-websocket-server.herokuapp.com'|g" $NETLIFY_DIR/chat-real.html
rm $NETLIFY_DIR/chat-real.html.bak 2>/dev/null

# 7. README 생성
cat > $NETLIFY_DIR/README.md << 'EOF'
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
EOF

# 8. index.html에 WebSocket 서버 상태 표시 추가
echo "📝 index.html 수정 중..."
sed -i.bak '/<div id="chatWidget"/a\
        <!-- WebSocket 서버 안내 -->\
        <div id="websocket-notice" style="position: fixed; bottom: 20px; right: 20px; background: rgba(255, 193, 7, 0.9); color: #000; padding: 10px 15px; border-radius: 8px; font-size: 0.85rem; display: none; z-index: 1000;">\
            <strong>⚠️ 채팅 서버 연결 필요</strong><br>\
            <small>Netlify는 WebSocket을 지원하지 않습니다.</small>\
        </div>' $NETLIFY_DIR/index.html
rm $NETLIFY_DIR/index.html.bak 2>/dev/null

echo ""
echo "📊 Netlify 배포 준비 완료!"
echo "  - HTML 파일: $(ls -1 $NETLIFY_DIR/*.html 2>/dev/null | wc -l)개"
echo "  - JS 파일: $(ls -1 $NETLIFY_DIR/*.js 2>/dev/null | wc -l)개"
echo "  - 설정 파일: $(ls -1 $NETLIFY_DIR/.* 2>/dev/null | grep -v "^\.$" | grep -v "^\.\.$" | wc -l)개"
echo ""
echo "📁 Netlify 디렉토리: $NETLIFY_DIR"