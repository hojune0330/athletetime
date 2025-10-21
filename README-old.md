# Athlete Time - 육상인들을 위한 커뮤니티

## 🎯 호스팅 환경 (중요!)
- **프론트엔드**: Netlify (무료 플랜)
- **백엔드**: Render (**유료 플랜** - Starter $7/month)
- **데이터베이스**: PostgreSQL (Render 유료 플랜 포함)
- **데이터 저장**: 영구 저장 (제한 없음)

## 🤝 협업 규칙

- **프론트엔드 UI/UX**: Claude가 전담합니다.
- **백엔드/디버깅**: ChatGPT가 오류 분석, 서버 로직, 환경 설정을 담당합니다.
- **작업 순서**:
  1. 백엔드/디버깅 변경을 먼저 커밋 & 푸시합니다.
  2. 프론트엔드 담당자가 최신 변경 사항을 `git pull` 후 UI 작업을 진행합니다.
  3. 각자 작업 전 `git pull origin main`, 작업 후 `git push` 규칙을 지킵니다.
- **중복 질의 방지**: 위 역할 분담과 순서는 고정이며, 재확인 없이 이 절차를 기본으로 따릅니다.
- **협업 참여자**: ChatGPT(백엔드/디버깅), Claude(프론트엔드 UI/UX)

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

> ℹ️ **베타 프론트엔드 안내**: `src/community-app/` 이하의 Vite 애플리케이션이 새로운 베타 커뮤니티 경험을 제공합니다. 현재 Netlify 배포는 기존 정적 페이지를 사용하고 있으므로 점진적으로 전환 예정입니다.

### 익명 게시판
- ✅ 게시글 CRUD (생성, 읽기, 수정, 삭제)
- ✅ 비밀번호 기반 수정/삭제
- ✅ 댓글 기능
- ✅ 좋아요/싫어요
- ✅ 신고 및 자동 블라인드 (10회 이상)
- ✅ 서버 기반 데이터 저장

### 실시간 채팅
- ✅ WebSocket 기반 실시간 통신
- ✅ 모든 메시지 영구 저장
- ✅ 입장 시 전체 메시지 히스토리 표시
- ✅ 닉네임 및 아바타 설정

## 📝 개발 노트

### 데이터 저장
- 게시판: `community-posts.json`
- 채팅: `chat-messages.json`
- 자동 저장: 5분마다 + 서버 종료 시

### CORS 설정
- 모든 도메인 허용 (`*`)
- Netlify ↔ Render 통신 가능

### 에러 처리
- 네트워크 오류 시 localStorage 폴백
- 서버 오류 시 사용자 친화적 메시지 표시

## 📧 문의

- Instagram: @athletic_time
- GitHub: https://github.com/hojune0330/athletetime