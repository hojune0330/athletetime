# ✅ 올바른 URL 사용 가이드

**최종 업데이트**: 2025-10-24  
**작성자**: Claude Sonnet 4.5

---

## 🎯 올바른 URL (반드시 사용!)

```
프로젝트 이름: athlete-time
프론트엔드: https://athlete-time.netlify.app
백엔드: https://athlete-time-backend.onrender.com
GitHub: https://github.com/hojune0330/athletetime
```

**핵심**: 모든 URL에 **하이픈(-) 포함!**

---

## ❌ 잘못된 URL (절대 사용 금지!)

```
❌ athlete-time-backend.onrender.com (하이픈 없음)
❌ athlete-time.netlify.app (하이픈 없음)
```

---

## 🔧 현재 코드 상태

### ✅ 올바르게 설정된 파일들

1. **community-new/src/api/client.ts**
   ```typescript
   const API_BASE_URL = import.meta.env.PROD 
     ? 'https://athlete-time-backend.onrender.com'
     : 'http://localhost:3000';
   ```

2. **render.yaml**
   ```yaml
   name: athlete-time-backend
   ```

3. **test_api_connection.html**
   ```javascript
   const API_URL = 'https://athlete-time-backend.onrender.com';
   ```

---

## 📝 테스트 방법

### 1. 백엔드 서버 확인
```bash
curl https://athlete-time-backend.onrender.com/
```

**예상 결과**:
```json
{
  "status": "ok",
  "message": "Athletic Time Backend is running",
  "posts": 0
}
```

### 2. 게시글 API 확인
```bash
curl https://athlete-time-backend.onrender.com/api/posts
```

**예상 결과**:
```json
{
  "success": true,
  "posts": []
}
```

### 3. 프론트엔드 확인
브라우저에서:
```
https://athlete-time.netlify.app
```

---

## 🚀 다음 단계

1. **React 앱 빌드 & 배포**
   ```bash
   cd community-new
   npm run build
   # Netlify에 자동 배포
   ```

2. **테스트 게시글 작성**
   - 프론트엔드에서 글쓰기
   - 백엔드에 저장되는지 확인

3. **전체 기능 테스트**
   - 게시글 목록
   - 게시글 작성
   - 댓글
   - 좋아요

---

## ⚠️ 주의사항

- 오래된 문서(83개 파일)에는 여전히 `athlete-time-backend`가 있을 수 있음
- **무시하세요!** 실제 코드는 이미 수정됨
- 새 문서를 참고: `CORRECT_URLS.md` (이 파일)

---

## 📞 문제 발생 시

1. 이 문서 확인
2. `community-new/src/api/client.ts` 확인
3. 브라우저 개발자 도구에서 Network 탭 확인
4. `https://athlete-time-backend.onrender.com` 정상 작동하는지 확인

---

**기억하세요**: `athlete-time` (하이픈 있음) ✅
