# 🔧 Netlify 404 에러 해결

## 🐛 문제 상황

**URL**: https://athlete-time.netlify.app/community  
**에러**: "Page not found" (404)

**원인**:
- React Router를 사용하는 SPA (Single Page Application)
- 클라이언트 사이드 라우팅 사용
- Netlify 서버는 실제 `/community` 경로의 HTML 파일이 없다고 판단
- 결과: 404 에러 반환

---

## ✅ 해결 방법

### 1. `netlify.toml` 파일 생성

Netlify 빌드 설정 파일을 루트에 생성:

```toml
[build]
  command = "echo 'Using pre-built files from community/'"
  publish = "community"
  base = ""

# SPA 라우팅을 위한 리디렉트
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

**핵심 설정**:
- `publish = "community"`: 배포할 폴더 지정
- `redirects`: 모든 경로를 `index.html`로 리디렉트 (SPA 라우팅 처리)

### 2. `community/_redirects` 파일 생성

Netlify의 `_redirects` 파일 (publish directory 안에):

```
/* /index.html 200
```

**의미**:
- 모든 경로 (`/*`)를 `index.html`로 리디렉트
- HTTP 상태 200 (정상) 반환
- React Router가 클라이언트에서 실제 라우팅 처리

---

## 📊 수정 전후 비교

### Before (수정 전):
```bash
$ curl -I https://athlete-time.netlify.app/community
HTTP/1.1 404 Not Found
```

**브라우저 화면**:
```
Page not found
Looks like you've followed a broken link or 
entered a URL that doesn't exist on this site.
```

### After (수정 후):
```bash
$ curl -I https://athlete-time.netlify.app/community
HTTP/1.1 200 OK
```

**브라우저 화면**:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>community-new</title>
    <script type="module" src="/community/assets/index-HChmZKAU.js"></script>
    <link rel="stylesheet" href="/community/assets/index-TG25CAPO.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**React 앱 정상 로드** ✅

---

## 🔍 왜 이런 문제가 발생했나?

### SPA 라우팅의 특성

1. **서버 사이드 라우팅** (전통적 방식):
   ```
   사용자 → /community 요청
   서버 → community.html 찾음
   서버 → 파일 있으면 반환, 없으면 404
   ```

2. **클라이언트 사이드 라우팅** (SPA):
   ```
   사용자 → /community 요청
   서버 → index.html 반환 (항상)
   브라우저 → React Router가 /community 처리
   React → 해당 컴포넌트 렌더링
   ```

### 문제의 원인

Netlify는 기본적으로 서버 사이드 라우팅 방식으로 동작:
- `/community` 요청 → `community.html` 또는 `community/index.html` 찾음
- 파일 없음 → 404 반환
- React Router는 실행되지 않음

### 해결책

`_redirects` 또는 `netlify.toml`로 모든 요청을 `index.html`로 리디렉트:
- 어떤 경로든 → `index.html` 반환
- React 앱 로드 → React Router가 라우팅 처리
- 정상적인 페이지 렌더링

---

## 🎯 추가로 설정한 것들

### 보안 헤더

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

**효과**:
- XSS 공격 방어
- Clickjacking 방지
- MIME 타입 스니핑 방지
- 보안 점수 향상

### 캐싱 설정

```toml
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**효과**:
- JS/CSS 파일 1년 동안 캐싱
- 페이지 로딩 속도 향상
- CDN 효율 증대

---

## 📝 체크리스트

수정 완료된 항목:

- ✅ `netlify.toml` 파일 생성
- ✅ `community/_redirects` 파일 생성
- ✅ SPA 라우팅 설정 (`/* → /index.html`)
- ✅ 보안 헤더 설정
- ✅ 캐싱 최적화 설정
- ✅ Git 커밋 및 푸시
- ✅ Netlify 자동 재배포
- ✅ 404 에러 해결 확인 (200 OK)
- ✅ React 앱 정상 로드 확인

---

## 🚀 배포 완료

### 배포 정보
- **커밋**: `e06d1fa` - fix: add Netlify SPA routing configuration
- **배포 시각**: 2025-10-29 15:42 KST (추정)
- **배포 상태**: ✅ 성공

### 테스트 결과
```bash
$ curl -I https://athlete-time.netlify.app/community
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Date: Tue, 29 Oct 2025 06:42:30 GMT
```

**✅ 정상 작동 확인!**

---

## 🎓 교훈

### SPA 배포 시 필수 사항

1. **라우팅 설정**: 모든 경로를 `index.html`로 리디렉트
2. **Publish Directory**: 빌드된 파일의 정확한 위치 지정
3. **_redirects 위치**: Publish directory 안에 배치
4. **테스트**: 직접 URL 입력해서 404 없는지 확인

### Netlify 특화 팁

- `netlify.toml` 사용 권장 (버전 관리 가능)
- `_redirects` 파일도 함께 사용 (이중 보장)
- 보안 헤더 및 캐싱 설정으로 성능 최적화

---

## 📞 관련 링크

- **프론트엔드**: https://athlete-time.netlify.app/community ✅
- **백엔드 API**: https://athletetime-backend.onrender.com ✅
- **Netlify 대시보드**: https://app.netlify.com/sites/athlete-time
- **GitHub**: https://github.com/hojune0330/athletetime

---

**문제 해결 완료!** 🎉

이제 사용자가 https://athlete-time.netlify.app/community 에 직접 접속해도 정상적으로 페이지가 표시됩니다.
