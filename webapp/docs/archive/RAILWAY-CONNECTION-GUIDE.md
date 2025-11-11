# 🚀 Railway WebSocket 서버 연결 상세 가이드

## 📍 정확한 수정 위치 안내

### 1️⃣ **chat-real.html 파일 열기**

파일을 텍스트 에디터(메모장, VSCode, Sublime Text 등)로 엽니다.

### 2️⃣ **수정할 코드 찾기**

**줄 번호: 899~921 라인** (connectWebSocket 함수 내부)

찾는 방법:
- Ctrl+F (Windows) 또는 Cmd+F (Mac)로 검색창 열기
- `function connectWebSocket` 검색
- 또는 `wss://${hostname}:3004` 검색

### 3️⃣ **현재 코드 (수정 전)**

```javascript
// WebSocket 연결
function connectWebSocket() {
  // WebSocket URL 자동 감지 - 실제 호스팅 환경 지원
  let wsUrl;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // 다양한 호스팅 환경 처리
  if (hostname.includes('e2b.dev')) {
    // E2B sandbox 환경
    const sandboxId = hostname.split('.')[0].split('-').slice(1).join('-');
    wsUrl = `wss://3004-${sandboxId}.e2b.dev`;
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 로컬 개발 환경
    wsUrl = `ws://${hostname}:3004`;
  } else if (protocol === 'https:') {
    // HTTPS 호스팅 환경 (Vercel, Netlify 등)
    // 실제 배포 시 WebSocket 서버 URL로 교체 필요
    // 예: wss://your-chat-server.herokuapp.com 또는 wss://chat.yourdomain.com
    wsUrl = `wss://${hostname}:3004`;  // ← 이 줄을 수정합니다!
  } else {
    // HTTP 호스팅 환경
    wsUrl = `ws://${hostname}:3004`;
  }
```

### 4️⃣ **수정 방법**

**917번 줄**을 찾아서 다음과 같이 수정합니다:

#### 수정 전 (917번 줄):
```javascript
wsUrl = `wss://${hostname}:3004`;
```

#### 수정 후:
```javascript
wsUrl = 'wss://your-app-name.up.railway.app';  // Railway URL로 변경
```

### 5️⃣ **전체 수정된 코드**

```javascript
// WebSocket 연결
function connectWebSocket() {
  // WebSocket URL 자동 감지 - 실제 호스팅 환경 지원
  let wsUrl;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // 다양한 호스팅 환경 처리
  if (hostname.includes('e2b.dev')) {
    // E2B sandbox 환경
    const sandboxId = hostname.split('.')[0].split('-').slice(1).join('-');
    wsUrl = `wss://3004-${sandboxId}.e2b.dev`;
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 로컬 개발 환경
    wsUrl = `ws://${hostname}:3004`;
  } else if (protocol === 'https:') {
    // Railway WebSocket 서버 URL
    wsUrl = 'wss://athlete-time-chat.up.railway.app';  // ✅ 여기가 변경된 부분!
  } else {
    // HTTP 호스팅 환경
    wsUrl = `ws://${hostname}:3004`;
  }
```

## 📝 단계별 실행 가이드

### Railway에서 WebSocket 서버 배포 후:

1. **Railway 대시보드에서 URL 복사**
   - Railway 프로젝트 페이지로 이동
   - Settings → Domains 섹션에서 생성된 URL 확인
   - 예: `athlete-time-chat.up.railway.app`

2. **chat-real.html 수정**
   - 텍스트 에디터로 파일 열기
   - 917번 줄로 이동 (Ctrl+G로 줄 이동)
   - 아래 코드 복사 & 붙여넣기:
   ```javascript
   wsUrl = 'wss://your-railway-url.up.railway.app';
   ```
   - `your-railway-url`를 실제 Railway URL로 변경

3. **파일 저장**
   - Ctrl+S (Windows) 또는 Cmd+S (Mac)로 저장

4. **Netlify에 재배포**
   - 수정된 `athlete-time-netlify` 폴더를 다시 압축
   - Netlify 대시보드에서 새 ZIP 파일 업로드

## ⚠️ 주의사항

### Railway URL 형식:
- ✅ 올바른 형식: `wss://your-app.up.railway.app`
- ❌ 틀린 형식: `https://your-app.up.railway.app` (https 아님!)
- ❌ 틀린 형식: `ws://your-app.up.railway.app` (ws 아니고 wss!)

### 확인 방법:
1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 확인
3. "🔌 WebSocket 연결 시도:" 메시지 확인
4. 정상 연결 시 "온라인" 상태 표시

## 🔧 문제 해결

### "오프라인" 상태가 계속되는 경우:

1. **Railway 서버 상태 확인**
   - Railway 대시보드에서 서버가 "Active" 상태인지 확인
   - Logs에서 "WebSocket server running" 메시지 확인

2. **URL 오타 확인**
   - `wss://` (두 개의 s) 로 시작하는지 확인
   - Railway에서 복사한 URL과 정확히 일치하는지 확인

3. **브라우저 캐시 삭제**
   - Ctrl+Shift+R (강제 새로고침)
   - 또는 개발자 도구 → Network → Disable cache 체크

## 📌 요약

**핵심: chat-real.html 파일의 917번 줄만 수정하면 됩니다!**

```javascript
// 이 한 줄만 변경:
wsUrl = 'wss://your-railway-app.up.railway.app';
```

Railway에서 받은 실제 URL로 교체하고, Netlify에 재업로드하면 완료!