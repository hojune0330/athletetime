# 🚀 Athlete Time 배포 가이드

## 📋 시스템 요구사항

- Node.js 18+ 
- npm 또는 yarn
- 포트: 8080 (웹서버), 3004 (WebSocket)

## 🔧 로컬 개발 환경 설정

```bash
# 1. 의존성 설치
npm install

# 2. 웹 서버 시작 (포트 8080)
python3 -m http.server 8080
# 또는
npx serve -p 8080

# 3. 채팅 서버 시작 (포트 3004)
node chat-server-enhanced.js
```

## 🌐 프로덕션 배포

### 옵션 1: Vercel + Heroku

#### Vercel (정적 파일)
1. Vercel CLI 설치: `npm i -g vercel`
2. 배포: `vercel`
3. 환경 변수 설정 불필요 (정적 파일만)

#### Heroku (WebSocket 서버)
1. `Procfile` 생성:
```
web: node chat-server-enhanced.js
```

2. 배포:
```bash
heroku create your-app-name
git push heroku main
```

3. WebSocket URL 업데이트:
- `chat-real.html`의 WebSocket URL을 Heroku 앱 주소로 변경
```javascript
// 예시
wsUrl = 'wss://your-app-name.herokuapp.com';
```

### 옵션 2: AWS EC2 / DigitalOcean

1. **서버 설정**:
```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 앱 복사 및 의존성 설치
git clone your-repo
cd webapp
npm install

# PM2로 프로세스 관리
npm install -g pm2
pm2 start chat-server-enhanced.js --name chat-server
pm2 start "python3 -m http.server 8080" --name web-server
pm2 save
pm2 startup
```

2. **Nginx 리버스 프록시 설정**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 정적 파일
    location / {
        proxy_pass http://localhost:8080;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

3. **SSL 설정 (Let's Encrypt)**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 옵션 3: Docker 배포

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./:/usr/share/nginx/html
  
  chat:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./:/app
    command: node chat-server-enhanced.js
    ports:
      - "3004:3004"
```

## 📝 환경별 WebSocket URL 설정

`chat-real.html`의 WebSocket 연결 부분을 환경에 맞게 수정:

```javascript
// 프로덕션 환경 예시
if (hostname === 'athletetime.com') {
    // 실제 도메인
    wsUrl = 'wss://chat.athletetime.com';
} else if (hostname.includes('herokuapp.com')) {
    // Heroku
    wsUrl = `wss://${hostname}`;
} else if (hostname === 'localhost') {
    // 로컬 개발
    wsUrl = 'ws://localhost:3004';
}
```

## ⚠️ 중요 체크리스트

- [ ] WebSocket URL이 배포 환경에 맞게 설정되었는지 확인
- [ ] CORS 설정이 올바른지 확인
- [ ] 방화벽에서 필요한 포트가 열려있는지 확인
- [ ] SSL 인증서가 설정되었는지 확인 (프로덕션)
- [ ] 환경 변수가 올바르게 설정되었는지 확인
- [ ] 로그 모니터링 설정 확인

## 🔍 문제 해결

### WebSocket 연결 실패
- 방화벽 설정 확인
- WSS 프로토콜 사용 여부 확인 (HTTPS 환경)
- 프록시 설정 확인

### 메시지 중복
- 클라이언트에서 자체 메시지 표시 제거됨
- 서버에서만 메시지 브로드캐스트

### 30분 자동 삭제 미작동
- 서버 시간 설정 확인
- Node.js 타이머 정상 작동 확인

## 📊 모니터링

- 실시간 통계: `http://your-domain.com/api/stats`
- 서버 로그: PM2 사용 시 `pm2 logs chat-server`
- 시스템 모니터링: `pm2 monit`