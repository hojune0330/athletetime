# 🚂 Railway 채팅 연결 - 초보자도 따라하는 상세 가이드

## 📌 우리가 할 일
1. Railway에서 채팅 서버 주소 받기
2. chat-real.html 파일 수정하기
3. Netlify에 다시 올리기

---

## 🔍 Step 1: Railway에서 내 서버 주소 확인하기

### 1-1. Railway 대시보드 가기
1. https://railway.app 접속
2. 로그인
3. 내 프로젝트 클릭

### 1-2. 도메인 생성하기
```
Settings 탭 클릭
    ↓
Networking 섹션 찾기
    ↓
"Generate Domain" 버튼 클릭
    ↓
생성된 주소 확인
```

### 1-3. 생성된 주소 예시
```
athletetime-chat-production-up.railway.app
    ↑ 이런 형태의 주소가 생성됩니다
```

### 📝 중요: 이 주소를 메모장에 복사해두세요!

---

## 📝 Step 2: chat-real.html 파일 수정하기

### 2-1. 파일 위치 찾기
```
📁 athletetime-netlify 폴더
  └── 📄 chat-real.html  ← 이 파일!
```

### 2-2. 파일 열기

#### Windows 사용자:
1. chat-real.html 파일에 **마우스 우클릭**
2. **"연결 프로그램"** → **"메모장"** 선택
3. 또는 **"편집"** 클릭

#### Mac 사용자:
1. chat-real.html 파일에 **우클릭**
2. **"다음으로 열기"** → **"텍스트 편집기"**

### 2-3. 수정할 부분 찾기

**방법 1: 검색으로 찾기**
1. 메모장에서 **Ctrl+F** (Mac: Cmd+F)
2. 검색창에 입력: `localhost:3004`
3. **"다음 찾기"** 클릭

**방법 2: 직접 찾기**
- 파일의 **780번째 줄** 근처
- `function connectWebSocket()` 함수 안

### 2-4. 찾아야 할 코드 (정확한 위치)

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
    wsUrl = `ws://${hostname}:3004`;  ← 여기를 수정!
  } else if (protocol === 'https:') {
    // HTTPS 호스팅 환경 (Vercel, Netlify 등)
    wsUrl = `wss://${hostname}:3004`;  ← 이것도 수정!
  } else {
    // HTTP 호스팅 환경
    wsUrl = `ws://${hostname}:3004`;   ← 이것도 수정!
  }
```

### 2-5. 수정하기

#### ❌ 수정 전 (원본):
```javascript
} else if (hostname === 'localhost' || hostname === '127.0.0.1') {
  // 로컬 개발 환경
  wsUrl = `ws://${hostname}:3004`;
} else if (protocol === 'https:') {
  // HTTPS 호스팅 환경 (Vercel, Netlify 등)
  wsUrl = `wss://${hostname}:3004`;
} else {
  // HTTP 호스팅 환경
  wsUrl = `ws://${hostname}:3004`;
}
```

#### ✅ 수정 후 (Railway 주소로 변경):
```javascript
} else if (hostname === 'localhost' || hostname === '127.0.0.1') {
  // 로컬 개발 환경
  wsUrl = `ws://${hostname}:3004`;
} else if (protocol === 'https:') {
  // HTTPS 호스팅 환경 (Vercel, Netlify 등)
  // Railway 서버 주소로 직접 연결
  wsUrl = 'wss://athletetime-chat-production-up.railway.app';
} else {
  // HTTP 호스팅 환경
  wsUrl = 'wss://athletetime-chat-production-up.railway.app';
}
```

### 🎯 더 간단한 방법: 모든 경우에 Railway 사용

전체 함수를 이렇게 수정:

```javascript
// WebSocket 연결
function connectWebSocket() {
  // Railway 서버로 직접 연결
  let wsUrl = 'wss://athletetime-chat-production-up.railway.app';
  
  // localhost에서 테스트할 때만 로컬 사용
  if (window.location.hostname === 'localhost') {
    wsUrl = 'ws://localhost:3004';
  }
  
  console.log('🔌 WebSocket 연결 시도:', wsUrl);
  
  try {
    ws = new WebSocket(wsUrl);
    // ... 나머지 코드는 그대로
```

### 2-6. 저장하기
1. **Ctrl+S** (Mac: Cmd+S) 눌러서 저장
2. 메모장 닫기

---

## 📦 Step 3: 수정된 파일 다시 압축하기

### 3-1. 폴더 선택
```
📁 athletetime-netlify 폴더 전체 선택
   (chat-real.html이 들어있는 폴더)
```

### 3-2. ZIP 파일 만들기

#### Windows:
1. 폴더 **우클릭**
2. **"보내기"** → **"압축(ZIP) 폴더"**

#### Mac:
1. 폴더 **우클릭**
2. **"압축하기"**

### 3-3. 파일명
```
athletetime-netlify-updated.zip (또는 아무 이름)
```

---

## 🚀 Step 4: Netlify에 다시 올리기

### 4-1. Netlify 대시보드
1. https://app.netlify.com 접속
2. 내 사이트 클릭

### 4-2. 재배포 방법

#### 방법 A: Drag & Drop (쉬움)
1. **Deploys** 탭 클릭
2. 페이지 하단 점선 박스 찾기
3. **athletetime-netlify-updated.zip** 드래그 & 드롭

#### 방법 B: 덮어쓰기
1. 사이트 메인 페이지
2. 새 ZIP 파일 드래그 & 드롭
3. 자동으로 업데이트됨

---

## ✅ Step 5: 테스트하기

### 5-1. 사이트 열기
```
https://your-site.netlify.app/chat-real.html
```

### 5-2. 확인 포인트
```
✅ "온라인" 표시 확인
✅ 메시지 전송 테스트
✅ 다른 브라우저에서도 접속해서 테스트
```

---

## 🔧 문제 해결

### 🔴 여전히 "오프라인"일 때

#### 1. Railway 서버 확인
```
Railway 대시보드 → Deployments 탭
상태가 "Active"인지 확인
```

#### 2. 주소 확인
```
wss:// (s 있어야 함!)
railway.app (철자 확인)
포트 번호 없어야 함 (:3004 ❌)
```

#### 3. 브라우저 개발자 도구
```
F12 → Console 탭
빨간색 에러 메시지 확인
```

### 흔한 실수들

#### ❌ 실수 1: ws vs wss
```javascript
// 틀림
wsUrl = 'ws://athletetime-chat.railway.app';

// 맞음
wsUrl = 'wss://athletetime-chat.railway.app';
        ↑ s 꼭 넣기!
```

#### ❌ 실수 2: 포트 번호
```javascript
// 틀림
wsUrl = 'wss://athletetime-chat.railway.app:3004';
                                            ↑ 빼기!
// 맞음
wsUrl = 'wss://athletetime-chat.railway.app';
```

#### ❌ 실수 3: 따옴표
```javascript
// 틀림
wsUrl = wss://athletetime-chat.railway.app;  // 따옴표 없음

// 맞음
wsUrl = 'wss://athletetime-chat.railway.app';  // 따옴표 있음
        ↑                                   ↑
```

---

## 💡 꿀팁

### 테스트용 간단 수정
chat-real.html 맨 위에 이것만 추가:
```html
<script>
  // Railway 서버 주소 설정
  window.WEBSOCKET_URL = 'wss://athletetime-chat-production-up.railway.app';
</script>
```

그리고 connectWebSocket 함수에서:
```javascript
let wsUrl = window.WEBSOCKET_URL || 'ws://localhost:3004';
```

---

## 📱 모바일에서 확인하기

1. 핸드폰으로 Netlify 사이트 접속
2. 채팅 페이지 열기
3. 메시지 보내기 테스트
4. PC와 핸드폰 간 채팅 테스트

---

## 🎉 축하합니다!

이제 실시간 채팅이 작동합니다!

**확인사항:**
- ✅ Railway 서버 주소를 정확히 입력했나요?
- ✅ wss:// 프로토콜을 사용했나요?
- ✅ 파일을 저장했나요?
- ✅ Netlify에 재업로드했나요?

모두 했다면 채팅이 작동해야 합니다! 🚀