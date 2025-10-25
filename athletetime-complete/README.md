# 애슬리트 타임 - Netlify 배포 가이드

## 📦 포함된 파일들

### 메인 페이지
- `index.html` - 랜딩 페이지
- `pace-calculator.html` - 페이스 계산기
- `training-calculator.html` - 훈련 계산기  
- `community.html` - 익명 게시판
- `chat-real.html` - 실시간 채팅

### 지원 파일
- `theme-toggle.js` - 다크/라이트 모드 전환
- `favicon.svg` - 사이트 아이콘
- `404.html` - 404 에러 페이지
- `netlify.toml` - Netlify 설정
- `_redirects` - 리다이렉트 규칙

## 🚀 배포 방법

### 1. Netlify Drop으로 배포
1. https://app.netlify.com/drop 접속
2. `athlete-time-complete` 폴더를 드래그 & 드롭
3. 자동으로 사이트 생성 및 배포

### 2. 기존 사이트 업데이트
1. Netlify 대시보드 접속
2. Site Overview → Deploys 탭
3. athlete-time-complete.zip 파일 드래그 & 드롭

## ⚙️ WebSocket 서버 연결

채팅 기능을 위해서는 별도의 WebSocket 서버가 필요합니다.

### Railway에 WebSocket 서버 배포 후:
1. chat-real.html 파일 열기
2. 917번 줄 찾기 (또는 `wss://${hostname}:3004` 검색)
3. Railway URL로 변경:
   ```javascript
   wsUrl = 'wss://your-app.up.railway.app';
   ```
4. 파일 저장 후 Netlify에 재배포

## 📝 주의사항

- 모든 CSS는 Tailwind CDN을 사용 (프로덕션에서는 빌드 권장)
- Font Awesome 아이콘 CDN 사용
- Chart.js CDN 사용
- 실시간 채팅은 WebSocket 서버 필요

## 🔗 유용한 링크

- [Netlify Drop](https://app.netlify.com/drop)
- [Railway](https://railway.app)
- [Tailwind CSS](https://tailwindcss.com)