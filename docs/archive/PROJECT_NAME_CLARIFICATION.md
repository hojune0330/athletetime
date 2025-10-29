# 🏷️ 프로젝트 이름 명확화

**작성일**: 2025-10-24  
**작성자**: Claude Sonnet 4.5

---

## 🎯 결정 사항

### 공식 프로젝트 이름
**`athlete-time`** (하이픈 있음)

### 이유
1. Netlify 사이트 주소: `athlete-time.netlify.app`
2. 일관성 유지
3. 사용자 요청

---

## 🔧 현재 상태

### Netlify (프론트엔드)
- ✅ **올바름**: `https://athlete-time.netlify.app`

### Render (백엔드) - 수정 필요
- ❌ **현재**: `https://athlete-time-backend.onrender.com` (하이픈 없음)
- ⚠️ **게시글 2개 저장되어 있음**
- 📝 **주의**: 이 URL을 당분간 계속 사용해야 함

### 또 다른 백엔드 (미사용)
- ❓ `https://athlete-time-backend.onrender.com` (하이픈 있음)
- 게시글 0개 (빈 서버)

---

## 📝 수정 필요 항목

### 1. 코드에서 수정
- ✅ `community-new/src/api/client.ts` - API URL 수정 완료

### 2. 문서에서 수정
- 모든 `athlete-time` → 실제 사용 중인 URL로 명확히 표기
- 혼란 방지를 위해 명확한 주석 추가

---

## 🎯 최종 결정 (2025-10-24 업데이트)

### ✅ 통일된 URL
```
프로젝트 이름: athlete-time (하이픈 있음)
프론트엔드: https://athlete-time.netlify.app
백엔드: https://athlete-time-backend.onrender.com
```

**변경 이유**:
- 사용자 요청: `athlete-time` 사용 중지
- 프로젝트 전체 이름 통일
- 혼동 방지

### ⚠️ 제거된 URL (사용 금지!)
- ❌ `athlete-time-backend.onrender.com` (하이픈 없음) - 사용 중지
- 게시글 2개는 테스트 데이터였으므로 포기
- 새로 시작하는 것이 더 깔끔함

---

## ⚠️ 주의사항

**앞으로 사용할 이름**:
- ✅ `athlete-time` (하이픈 있음) - 모든 곳에서 이것만 사용!
- ❌ `athlete-time` (하이픈 없음) - 절대 사용 금지!

**모든 URL에 하이픈(-) 포함!**

---

**작성자**: Claude Sonnet 4.5
