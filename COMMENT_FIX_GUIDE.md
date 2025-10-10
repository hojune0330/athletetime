# 🔧 댓글 문제 해결 가이드

## 📅 수정 일자: 2025-10-10

## 🚨 발견된 문제
- **증상**: 댓글 작성 후 페이지 새로고침하면 댓글이 사라짐
- **원인**: 
  1. JavaScript에서 `Date.now()`로 생성한 ID (예: 1760080171788)
  2. PostgreSQL의 SERIAL 타입은 1부터 시작하는 정수
  3. ID 타입 불일치로 댓글이 저장되지만 조회되지 않음

## ✅ 해결 방법

### 1단계: 서버 재배포 대기
- GitHub에 푸시 완료 ✅
- Render가 자동 재배포 중 (3-5분 소요)

### 2단계: 데이터베이스 스키마 마이그레이션

#### Render Shell에서 실행:
```bash
# Render 대시보드 → Shell 탭 → 명령어 입력

# 스키마 마이그레이션 실행
node migrate-schema.js

# 기존 비밀번호 암호화 (선택사항)
node migrate-passwords.js
```

#### 또는 로컬에서 실행:
```bash
# DATABASE_URL 환경변수 설정 후 실행
DATABASE_URL="your-database-url" node migrate-schema.js
```

### 3단계: 확인 테스트

1. **웹사이트에서 테스트**:
   - 새 게시글 작성
   - 댓글 추가
   - 페이지 새로고침
   - ✅ 댓글이 유지되는지 확인

2. **터미널에서 테스트**:
```bash
# 댓글 기능 전체 테스트
PROD=1 node test-comments.js
```

## 📊 변경 내용

### 데이터베이스 스키마 변경
| 테이블 | 컬럼 | 이전 | 현재 |
|--------|------|------|------|
| posts | id | SERIAL (1, 2, 3...) | BIGINT (1760080171788...) |
| comments | id | SERIAL | BIGINT |
| comments | post_id | INTEGER | BIGINT |

### 서버 코드 수정
```javascript
// 이전 (자동 생성)
INSERT INTO posts (title, ...) VALUES (...)

// 현재 (명시적 ID)
const postId = Date.now();
INSERT INTO posts (id, title, ...) VALUES ($1, ...)
```

## 🔍 디버깅 정보

### 로그 확인 위치
Render 대시보드 → Logs 탭에서:
```
🔍 게시글 상세 조회: ID 1760080171788
✅ 게시글 찾음: "제목"
💬 댓글 3개 조회됨
📤 응답 전송: 게시글 + 댓글 3개
```

### 데이터베이스 직접 확인
```sql
-- 최근 댓글 확인
SELECT * FROM comments ORDER BY created_at DESC LIMIT 5;

-- 특정 게시글의 댓글 수
SELECT p.id, p.title, COUNT(c.id) as comments
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id
ORDER BY p.created_at DESC;
```

## ⚠️ 주의사항

1. **기존 데이터**:
   - SERIAL로 생성된 기존 게시글 (ID: 1, 2, 3...)은 유지됨
   - 새 게시글은 Date.now() ID 사용 (예: 1760080171788)

2. **마이그레이션 필수**:
   - 스키마 마이그레이션 없이는 댓글 문제 지속
   - 한 번만 실행하면 영구 해결

3. **호환성**:
   - 기존 게시글과 새 게시글 모두 정상 작동
   - 댓글도 두 가지 ID 형식 모두 지원

## 📈 결과

### Before
- 댓글 작성 ✅
- 페이지 새로고침 → 댓글 사라짐 ❌

### After
- 댓글 작성 ✅
- 페이지 새로고침 → 댓글 유지 ✅
- 영구 저장 ✅

## 🆘 문제 지속 시

1. **Render Logs 확인**:
   - 오류 메시지 캡처
   - 특히 "ERROR" 또는 "댓글" 관련 로그

2. **데이터베이스 확인**:
   ```sql
   -- 테이블 구조 확인
   \d posts
   \d comments
   ```

3. **수동 테스트**:
   ```bash
   curl -X POST https://athletetime-backend.onrender.com/api/posts/1760080171788/comments \
     -H "Content-Type: application/json" \
     -d '{"author":"테스트","content":"테스트 댓글"}'
   ```

---

💡 **예상 소요 시간**: 
- 서버 재배포: 3-5분
- 스키마 마이그레이션: 1분
- 전체 해결: 10분 이내