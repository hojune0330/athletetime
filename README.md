# Athlete Time (애타) - 육상인들을 위한 커뮤니티 플랫폼

<div align="center">
  
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-orange.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**🏃‍♂️ 육상을 사랑하는 모든 사람들을 위한 커뮤니티 플랫폼 🏃‍♀️**

[메인 페이지](#) | [커뮤니티](#) | [문서](./docs)

</div>

---

## 📋 목차
- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [설치 및 실행](#-설치-및-실행)
- [배포](#-배포)
- [API 문서](#-api-문서)
- [개발 가이드](#-개발-가이드)
- [기여하기](#-기여하기)

## 🎯 프로젝트 소개

**Athlete Time (애타)**는 육상 선수와 동호인들을 위한 종합 커뮤니티 플랫폼입니다.

### 핵심 가치
- **소통**: 익명 게시판을 통한 자유로운 의견 교환
- **정보 공유**: 대회 일정, 훈련 팁, 장비 리뷰
- **도구 제공**: 페이스 계산기, 훈련 계산기 등 실용적인 도구
- **커뮤니티**: 실시간 채팅, 중고 거래, 모임 조직

### 타겟 사용자
- 🏃‍♂️ 육상 선수 및 동호인
- 🎽 트랙&필드 종목 참가자
- 🏫 학생 선수
- 🏆 육상에 관심있는 모든 분들

## ✨ 주요 기능

### 1. 커뮤니티 (React + TypeScript)
- **익명 게시판**: 자유로운 소통 공간
- **투표 시스템**: 의견 수렴 및 설문
- **이미지 업로드**: 사진 공유 기능
- **모바일 최적화**: 반응형 디자인

### 2. 계산기 도구
- **페이스 계산기**: 목표 기록별 구간 스플릿 계산
- **훈련 계산기**: VDOT 기반 맞춤 훈련 페이스
- **트랙 레인 계산기**: 레인별 거리 차이 계산

### 3. 대회 정보
- **대회 일정**: 전국 육상 대회 일정 확인
- **경기 결과**: 대회 기록 조회 (준비 중)

### 4. 실시간 기능
- **채팅**: 종목별 실시간 대화
- **알림**: 중요 공지 및 업데이트

## 🛠 기술 스택

### Frontend
```json
{
  "framework": ["React 18", "TypeScript", "Vite"],
  "styling": ["Tailwind CSS", "CSS Modules"],
  "routing": ["React Router v6"],
  "state": ["Zustand", "React Query"],
  "ui": ["Heroicons", "Font Awesome"]
}
```

### Backend (준비 중)
```json
{
  "runtime": "Node.js",
  "framework": "Express.js",
  "database": "PostgreSQL",
  "realtime": "WebSocket"
}
```

### DevOps
- **Hosting**: Render (백엔드 $7/월), 프론트엔드 배포 준비 중
- **Version Control**: GitHub
- **개발 환경**: E2B Sandbox

## 📁 프로젝트 구조

```
athletetime/
├── community-new/           # React 커뮤니티 앱
│   ├── src/
│   │   ├── components/     # 재사용 가능한 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── utils/         # 유틸리티 함수
│   │   └── styles/        # 글로벌 스타일
│   ├── dist/              # 빌드 결과물
│   └── package.json       # 의존성 관리
├── index.html             # 메인 랜딩 페이지
├── pace-calculator.html   # 페이스 계산기
├── training-calculator.html # 훈련 계산기
├── chat.html              # 실시간 채팅
├── server.js              # Express 서버
├── README.md              # 프로젝트 문서
└── GITHUB_SETUP.md        # GitHub 설정 가이드
```

## 🚀 설치 및 실행

### 필요 사항
- Node.js 18.0 이상
- npm 또는 yarn
- Git

### 설치 단계

1. **저장소 클론**
```bash
git clone https://github.com/hojune0330/athletetime.git
cd athletetime
```

2. **의존성 설치**
```bash
# 메인 프로젝트
npm install

# 커뮤니티 앱
cd community-new
npm install
```

3. **개발 서버 실행**
```bash
# 메인 페이지 (포트 8080)
npm run dev:main

# 커뮤니티 (포트 5173)
cd community-new
npm run dev

# 백엔드 서버 (포트 3000)
npm run server
```

4. **빌드**
```bash
# 커뮤니티 빌드
cd community-new
npm run build

# 프로덕션 실행
npm run preview
```

## 🌐 배포

### Frontend (Netlify)
1. Netlify 대시보드에서 새 사이트 생성
2. GitHub 저장소 연결
3. 빌드 설정:
   - Build command: `cd community-new && npm run build`
   - Publish directory: `community-new/dist`

### Backend (Render)
1. Render 대시보드에서 새 웹 서비스 생성
2. GitHub 저장소 연결
3. 환경 변수 설정:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   PORT=3000
   ```

## 📚 API 문서

### 주요 엔드포인트

#### 게시글 API
```http
GET    /api/posts          # 게시글 목록
GET    /api/posts/:id      # 게시글 상세
POST   /api/posts          # 게시글 작성
PUT    /api/posts/:id      # 게시글 수정
DELETE /api/posts/:id      # 게시글 삭제
```

#### 댓글 API
```http
GET    /api/posts/:id/comments  # 댓글 목록
POST   /api/posts/:id/comments  # 댓글 작성
DELETE /api/comments/:id         # 댓글 삭제
```

#### 사용자 API
```http
POST   /api/auth/register   # 회원가입
POST   /api/auth/login      # 로그인
GET    /api/users/profile   # 프로필 조회
```

## 👨‍💻 개발 가이드

### 브랜치 전략
- `main`: 프로덕션 배포
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정

### 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드 업무 수정
```

### 코드 스타일
- ESLint + Prettier 사용
- TypeScript strict mode
- 함수형 컴포넌트 + Hooks

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 👥 팀

- **Frontend**: Claude AI
- **Backend**: GPT AI
- **Project Owner**: @hojune0330

## 📞 문의

- GitHub Issues: [이슈 트래커](https://github.com/hojune0330/athletetime/issues)
- GitHub: @hojune0330

---

<div align="center">
  
**Made with ❤️ for Athletes**

[⬆ 맨 위로](#athlete-time-애타---육상인들을-위한-커뮤니티-플랫폼)

</div>