# Athlete Time - 육상인들을 위한 커뮤니티

## 🎯 호스팅 환경 (중요!)
- **프론트엔드**: Netlify (무료 플랜)
- **백엔드**: Render (**유료 플랜** - Starter $7/month)
- **데이터베이스**: PostgreSQL (Render 유료 플랜 포함)
- **데이터 저장**: 영구 저장 (제한 없음)

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
- URL: https://athlete-time.netlify.app
- 자동 배포: GitHub main 브랜치 푸시 시

### Backend (Render)
- URL: https://athletetime-backend.onrender.com
- 자동 배포: GitHub main 브랜치 푸시 시
- 서비스: 통합 백엔드 (채팅 + 게시판)
- 포트: 환경 변수 PORT (Render가 자동 설정)

## 🌐 임시 파일 다운로드 서버 (Sandbox)

Sandbox 환경에서 최신 결과물을 내려받을 수 있도록 HTTP 파일 서버를 실행 중입니다.

- **명령어**: `cd /home/user/webapp && python3 -m http.server 8000`
- **작업 ID**: `bash_7d98a6de`
- **PID**: `3980`
- **접속 URL**: [https://8000-ie7amj0wfqyguzcld5kut-02b9cc79.sandbox.novita.ai/](https://8000-ie7amj0wfqyguzcld5kut-02b9cc79.sandbox.novita.ai/)
- **주요 제공 파일**:
  - `athletetime/` (현재 작업 디렉터리 전체)
  - `athletetime-final-deploy.zip`
  - `athletetime-deployment.tar.gz`
  - `athletetime-for-netlify.zip`
  - `athletetime-netlify.zip`
  - `athletetime-websocket.zip`
  - 기타 `/home/user/webapp` 하위 모든 문서 및 아카이브
- **종료 방법**:
  - `kill 3980` (또는 `pkill -f "python3 -m http.server 8000"`)
  - Sandbox 제어 도구에서 `bash_7d98a6de` 프로세스 종료

> ⚠️ Sandbox는 재시작 또는 종료 시 서버와 파일이 초기화되므로, 필요한 자료는 즉시 로컬에 백업하세요.

## 📁 프로젝트 구조

```
/home/user/webapp/
├── index.html           # 메인 페이지
├── community.html       # 커뮤니티 게시판
├── chat.html           # 채팅방
├── server.js           # 통합 백엔드 서버 (Render 배포용)
├── community-api.js    # 게시판 API 클라이언트
├── backend-config.js   # 백엔드 URL 설정
├── test-deletion.js    # 삭제 기능 테스트 스크립트
└── package.json        # 의존성 관리
```

## 🛠️ 주요 기능

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