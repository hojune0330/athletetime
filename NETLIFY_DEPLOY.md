# Netlify 배포 가이드

## 🚨 배포 오류 해결

### 문제
- `netlify.toml` 파일 파싱 오류
- 잘못된 base 디렉토리 설정 (`src/community-app` 존재하지 않음)

### 해결
1. `netlify.toml` 파일을 단순화
2. 메인 사이트와 커뮤니티 앱 분리 배포

## 📦 배포 구성

### 1. 메인 사이트 (athlete-time.netlify.app)
- **배포 방식**: 정적 HTML 직접 배포
- **설정 파일**: `netlify.toml`
- **빌드**: 불필요 (정적 파일)
- **디렉토리**: 루트 디렉토리

```toml
[build]
  publish = "."
```

### 2. 커뮤니티 앱 (별도 배포 필요)
- **배포 방식**: React 앱 빌드 후 배포
- **설정 파일**: `netlify-community.toml`
- **빌드**: `npm install && npm run build`
- **디렉토리**: `community-new`

## 🔧 Netlify 대시보드 설정

### 메인 사이트 설정
1. **Site settings** → **Build & deploy**
2. **Build settings**:
   - Base directory: (비워둠)
   - Build command: (비워둠)
   - Publish directory: `.`
3. **Deploy**

### 커뮤니티 앱 설정 (별도 사이트)
1. 새 사이트 생성
2. **Build settings**:
   - Base directory: `community-new`
   - Build command: `npm install && npm run build`
   - Publish directory: `community-new/dist`

## 📁 현재 파일 구조
```
athletetime/
├── netlify.toml           # 메인 사이트 설정 (간소화됨)
├── netlify-main.toml      # 메인 사이트 상세 설정 (백업)
├── netlify-community.toml # 커뮤니티 앱 설정
├── index.html             # 메인 페이지
├── pace-calculator.html   # 페이스 계산기
├── community-new/         # React 커뮤니티 앱
│   ├── package.json
│   ├── vite.config.ts
│   └── dist/             # 빌드 결과물
└── ...
```

## ✅ 체크리스트
- [x] `netlify.toml` 파일 수정 (파싱 오류 해결)
- [x] base 디렉토리 제거 (존재하지 않는 경로)
- [x] 단순한 정적 사이트 배포 설정
- [ ] Netlify 대시보드에서 설정 확인
- [ ] 재배포 시도

## 🎯 즉시 해결 방법
1. GitHub에 푸시된 `netlify.toml` 사용
2. Netlify 대시보드에서 "Clear cache and deploy site" 클릭
3. 배포 성공 확인

---
*Last updated: 2025-01-16*