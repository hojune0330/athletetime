# Athlete Time - 육상인들을 위한 커뮤니티

## 🎯 호스팅 환경 (중요!)
- **프론트엔드**: Netlify (무료 플랜)
- **백엔드**: Render (Starter 유료 플랜, 월 $7) – 실서버 상시 기동 + 콜드스타트 완화
- **데이터베이스**: Render PostgreSQL (Starter 플랜 포함, 영구 디스크)
- **데이터 저장**: 백엔드 API가 Render 영구 스토리지를 직접 사용 (클라이언트 더미/로컬 폴백 없음)

## 🤝 협업 규칙

- **프론트엔드 UI/UX**: 외부 협업 도구(Claude)가 전담합니다.
- **백엔드/디버깅**: 이 저장소 작업자(= ChatGPT)가 오류 분석, 서버 로직, 환경 설정을 담당합니다.
- **작업 순서**:
  1. 백엔드/디버깅 변경을 먼저 커밋 & 푸시합니다.
  2. 프론트엔드 담당자가 최신 변경 사항을 `git pull` 후 UI 작업을 진행합니다.
  3. 각자 작업 전 `git pull origin main`, 작업 후 `git push` 규칙을 지킵니다.
- **중복 질의 방지**: 위 역할 분담과 순서는 고정이며, 재확인 없이 이 절차를 기본으로 따릅니다.
- **협업 참여자**: ChatGPT(백엔드/디버깅), Claude(UI/UX)

## 🔧 최근 수정 사항 (2025-10-10)

### ✅ 게시글 삭제 기능 수정 완료
- **문제**: "러닝 정보" 게시물 등을 비밀번호를 입력해도 삭제할 수 없었던 문제
- **원인**: 
  1. 클라이언트에서 API 호출 대신 로컬 배열만 수정
  2. 서버에서 비밀번호 검증 없이 삭제 처리
- **해결**:
  1. `community.html`의 `deletePost()` 함수를 API 기반으로 변경
  2. `server.js`의 DELETE 엔드포인트에 비밀번호 검증 추가
  3. 에러 처리 및 사용자 피드백 개선

### 테스트 방법
```bash
# 로컬 테스트
node test-deletion.js

# 프로덕션(Render) 테스트
PROD=1 node test-deletion.js
```

## 🚀 배포 정보

### Frontend (Netlify)
- URL: https://athletetime.netlify.app
- 자동 배포: GitHub main 브랜치 푸시 시

### Backend (Render)
- URL: https://athletetime-backend.onrender.com
- 자동 배포: GitHub main 브랜치 푸시 시
- 서비스: 통합 백엔드 (채팅 + 게시판)
- 포트: 환경 변수 PORT (Render가 자동 설정)

## 📁 프로젝트 구조

```
/home/user/webapp/
├── src/community-app/   # 신규 Vite 기반 커뮤니티 프론트엔드 (chimhaha 스타일)
├── community.html       # 기존 레거시 커뮤니티 페이지 (추후 제거 예정)
├── index.html           # 메인 페이지
├── chat.html            # 채팅방
├── server.js            # 통합 백엔드 서버 (Render 배포용)
├── community-api.js     # 게시판 API 클라이언트 (레거시)
├── backend-config.js    # 백엔드 URL 설정
├── test-deletion.js     # 삭제 기능 테스트 스크립트
└── package.json         # 의존성 관리
```

## 🛠️ 주요 기능

> ℹ️ **프론트엔드 안내**: `src/community-app/` 이하의 Vite 애플리케이션이 침하하(chimhaha) UX를 재현하면서도 실서비스 API에 직접 연결되도록 전면 리디자인되었습니다. 기본 API 엔드포인트는 Render Starter 플랜에서 상시 운영 중인 실서버(`https://athletetime-backend.onrender.com/community`)이며, 더미 데이터 없이 실시간 게시판/통계 정보를 불러옵니다. Express 서버는 Vite 빌드 산출물을 자동으로 서빙하므로 별도 정적 서버가 필요하지 않습니다.

### 익명 게시판
- ✅ 게시글 CRUD (생성, 읽기, 수정, 삭제)
- ✅ 비밀번호 기반 수정/삭제
- ✅ 댓글 기능 (익명 작성/비밀번호 기반 관리)
- ✅ 좋아요/싫어요
- ✅ 신고 및 자동 블라인드 (10회 이상)
- ✅ 서버 기반 데이터 저장

### 실시간 채팅
- ✅ WebSocket 기반 실시간 통신
- ✅ 모든 메시지 영구 저장
- ✅ 입장 시 전체 메시지 히스토리 표시
- ✅ 닉네임 및 아바타 설정

## 📝 개발 노트

### 프런트엔드 빌드 & 배포 파이프라인
- 루트에서 `npm install`을 실행하면 `postinstall` 훅을 통해 `src/community-app` 의 의존성까지 자동으로 설치됩니다.
- `npm run build:web` 명령은 Vite 앱을 빌드하여 `src/community-app/dist`에 산출물을 생성합니다.
- Render 배포는 `render.yaml`에 정의된 `npm install && npm run build:web` 빌드 커맨드를 사용하며, Express 서버가 빌드 결과물을 자동으로 서빙합니다.
- 로컬 확인 시에는 프런트엔드 `npm run dev --prefix src/community-app`, 백엔드 `npm run start:postgres`를 각각 사용하세요.
- Vite dev/preview 서버는 `.sandbox.novita.ai`/`.e2b.dev` 등 샌드박스 도메인을 허용하도록 `vite.config.ts`의 `allowedHosts` 설정이 와일드카드로 구성돼 있습니다.

### 최신 커뮤니티 UI 주요 특징
- 침하하 UX를 기반으로 한 반응형 레이아웃과 브랜드 톤에 맞춘 라이트 테마를 제공합니다.
- 실시간 공지 배너, 공지 사이드바, 인기글·게시판 통계 등 모든 주요 위젯이 API 데이터로 구동됩니다.
- 게시판 정렬/검색, 페이징, 다중 카테고리 라우팅, 태그/댓글 요약을 지원합니다.
- 우측 패널은 인기글·통계·주요 게시판 안내를 동시에 제공하도록 카드형 레이아웃으로 구성했습니다.

### 데이터 저장
- 게시판: Render PostgreSQL `posts` 테이블 (영구 디스크)
- 댓글: Render PostgreSQL `comments` 테이블
- 채팅: Render PostgreSQL `chat_messages` 테이블 (최근 100개 히스토리 제공)

### CORS 및 환경 변수
- 모든 도메인 허용 (`*`)
- Netlify ↔ Render 통신 가능
- 프론트엔드 `.env` 기본값은 Render Starter 실서버 URL을 가리키며, 별도 설정이 없으면 항상 실서비스 API가 사용됩니다.

### 에러 처리
- 네트워크 오류 시 localStorage 폴백
- 서버 오류 시 사용자 친화적 메시지 표시

## 🐛 알려진 이슈

### Render 인프라 특성
- Starter 플랜은 최초 요청 시 콜드 스타트가 발생할 수 있으며 최대 30초까지 지연될 수 있습니다.
- 지속적인 트래픽이 없는 시간대에는 워밍업 요청을 통해 응답 속도를 안정화할 수 있습니다.
- 백엔드 장애 시 프론트엔드는 최소한의 기본 게시판 정보만 노출하며, 공지/인기글 영역에는 오류 메시지가 표기됩니다.

## 📧 문의

- Instagram: @athletic_time
- GitHub: https://github.com/hojune0330/athletetime