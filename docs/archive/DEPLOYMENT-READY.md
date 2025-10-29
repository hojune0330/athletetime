# 🎯 Athlete Time 배포 패키지 준비 완료

## 📦 배포 패키지 정보

### 파일 위치
- **배포 디렉토리**: `/home/user/webapp/athlete-time-deployment/`
- **압축 파일**: `/home/user/webapp/athlete-time-deployment.tar.gz` (1MB)

### 포함된 파일

#### 핵심 페이지 (5개)
- ✅ `index.html` - 메인 랜딩 페이지
- ✅ `pace-calculator.html` - 페이스 계산기
- ✅ `training-calculator.html` - 훈련 계산기
- ✅ `community.html` - 익명 게시판
- ✅ `chat-real.html` - 실시간 채팅

#### 서버 및 스크립트 (2개)
- ✅ `chat-server-enhanced.js` - WebSocket 채팅 서버
- ✅ `theme-toggle.js` - 다크/라이트 모드 토글

#### 설정 파일 (8개)
- ✅ `package.json` - Node.js 의존성
- ✅ `.env.example` - 환경 변수 템플릿
- ✅ `.gitignore` - Git 제외 파일
- ✅ `README.md` - 배포 가이드
- ✅ `Dockerfile` - Docker 컨테이너 설정
- ✅ `docker-compose.yml` - Docker Compose 설정
- ✅ `start.sh` - 시작 스크립트
- ✅ `images/` - 이미지 디렉토리 (비어있음)

---

## 🚀 배포 방법

### 방법 1: 직접 서버 배포

```bash
# 1. 압축 파일 업로드
scp athlete-time-deployment.tar.gz user@your-server:/home/user/

# 2. 서버에서 압축 해제
ssh user@your-server
tar -xzf athlete-time-deployment.tar.gz
cd athlete-time-deployment

# 3. 의존성 설치 및 시작
npm install
./start.sh
```

### 방법 2: Docker 배포

```bash
# 1. Docker 이미지 빌드
cd athlete-time-deployment
docker build -t athlete-time .

# 2. 컨테이너 실행
docker run -d -p 8080:8080 -p 3004:3004 --name athlete-time athlete-time
```

### 방법 3: Vercel 배포 (정적 파일만)

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 배포
cd athlete-time-deployment
vercel
```

### 방법 4: Heroku 배포

```bash
# 1. Heroku CLI로 앱 생성
heroku create athlete-time

# 2. Git 초기화 및 푸시
cd athlete-time-deployment
git init
git add .
git commit -m "Initial deployment"
git push heroku main
```

---

## ⚙️ 환경 설정

### 필수 설정 (.env 파일)

```env
# 서버 포트
PORT=8080
WS_PORT=3004

# 도메인 (실제 도메인으로 변경)
DOMAIN=athlete-time.com
WEBSOCKET_URL=wss://chat.athlete-time.com

# 보안 설정
CORS_ORIGIN=https://athlete-time.com
NODE_ENV=production
```

### 포트 설정
- **웹 서버**: 8080 (변경 가능)
- **WebSocket**: 3004 (변경 가능)

### 방화벽 설정
```bash
# Ubuntu/Debian
sudo ufw allow 8080/tcp
sudo ufw allow 3004/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3004/tcp
sudo firewall-cmd --reload
```

---

## 🔒 보안 체크리스트

- [ ] HTTPS/SSL 인증서 설치
- [ ] WSS (WebSocket Secure) 설정
- [ ] CORS 도메인 제한
- [ ] 방화벽 규칙 설정
- [ ] DDoS 방어 설정
- [ ] 로그 모니터링 설정

---

## 📊 시스템 요구사항

### 최소 사양
- CPU: 1 Core
- RAM: 1GB
- Storage: 10GB
- OS: Ubuntu 20.04+ / CentOS 8+
- Node.js: 18.0.0+

### 권장 사양
- CPU: 2 Cores
- RAM: 2GB
- Storage: 20GB
- OS: Ubuntu 22.04 LTS
- Node.js: 20.0.0+

---

## 🎯 배포 후 확인사항

### 1. 서비스 상태 확인
```bash
# 프로세스 확인
ps aux | grep node

# 포트 확인
netstat -tuln | grep -E '8080|3004'

# 로그 확인
tail -f nohup.out
```

### 2. 웹 페이지 테스트
- 메인 페이지: http://your-domain.com:8080
- 페이스 계산기: http://your-domain.com:8080/pace-calculator.html
- 채팅: http://your-domain.com:8080/chat-real.html

### 3. WebSocket 연결 테스트
```javascript
// 브라우저 콘솔에서 실행
const ws = new WebSocket('ws://your-domain.com:3004');
ws.onopen = () => console.log('Connected!');
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues: https://github.com/hojune0330/athletetime/issues
2. 이메일: admin@athlete-time.com

---

**배포 패키지 준비 완료!** 🎉

압축 파일을 다운로드하여 원하는 서버에 배포하시면 됩니다.