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
