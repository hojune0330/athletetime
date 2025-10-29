# 🎯 최종 URL 정리 (헷갈리지 않도록!)

**최종 업데이트**: 2025-10-24  
**작성자**: Claude Sonnet 4.5

---

## ✅ 올바른 URL (사용!)

### 프로젝트 이름
```
athlete-time (하이픈 있음!)
```

### 서비스 URL
```
프론트엔드: https://athlete-time.netlify.app
백엔드:    https://athlete-time-backend.onrender.com
```

### GitHub 저장소 (예외!)
```
https://github.com/hojune0330/athletetime
```
⚠️ **주의**: GitHub 저장소 이름만 `athletetime` (하이픈 없음)입니다.
이유: 저장소가 원래 이 이름으로 생성되었고, 변경하면 문제 발생.

---

## 📋 요약

| 항목 | URL | 하이픈 |
|------|-----|--------|
| 프로젝트 이름 | `athlete-time` | ✅ 있음 |
| Netlify | `athlete-time.netlify.app` | ✅ 있음 |
| Render 백엔드 | `athlete-time-backend.onrender.com` | ✅ 있음 |
| GitHub 저장소 | `github.com/hojune0330/athletetime` | ❌ 없음 (예외!) |

---

## ❌ 절대 사용 금지

```
❌ athletetime-backend.onrender.com
❌ athletetime.netlify.app
```

---

## 🔍 왜 GitHub만 다른가요?

**이유**:
1. GitHub 저장소는 이미 `athletetime` 이름으로 생성됨
2. 저장소 이름 변경은 위험함 (링크 다 깨짐)
3. 저장소 이름은 내부적으로만 사용
4. 외부에서는 `athlete-time`으로 부름

**결론**: GitHub URL만 예외적으로 `athletetime` 유지!

---

## 📝 개발 시 참고

### 코드에서 사용
```typescript
// ✅ 올바름
const API_URL = 'https://athlete-time-backend.onrender.com';

// ❌ 잘못됨
const API_URL = 'https://athletetime-backend.onrender.com';
```

### Git 명령어
```bash
# ✅ 올바름 (GitHub 저장소는 athletetime)
git clone https://github.com/hojune0330/athletetime.git

# 프로젝트 내부에서는 athlete-time으로 부름
cd athletetime  # 폴더명은 상관없음
```

---

## 🎯 핵심 규칙

**간단 정리**:
1. **모든 URL**: `athlete-time` (하이픈 있음)
2. **GitHub만**: `athletetime` (하이픈 없음)
3. **끝!**

---

**헷갈리지 마세요!** 😊
