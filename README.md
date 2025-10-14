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

> ℹ️ **베타 프론트엔드 안내**: `src/community-app/` 이하의 Vite 애플리케이션이 침하하(chimhaha) UX를 거의 동일하게 재현하도록 전면 리디자인되었습니다. 기본 API 엔드포인트는 Render Starter 유료 플랜에서 운영 중인 실서버(`https://athletetime-backend.onrender.com/community`)로 고정되어 있으며, 베타 UI에서도 더미 데이터를 사용하지 않습니다. 현재 Netlify 배포는 기존 정적 페이지를 사용하고 있으므로 점진적으로 전환 예정입니다.

### 익명 게시판
- ✅ 게시글 CRUD (생성, 읽기, 수정, 삭제)
- ✅ 비밀번호 기반 수정/삭제
- ✅ 댓글 기능 (베타에서는 단계적 오픈)
- ✅ 좋아요/싫어요
- ✅ 신고 및 자동 블라인드 (10회 이상)
- ✅ 서버 기반 데이터 저장

### 실시간 채팅
- ✅ WebSocket 기반 실시간 통신
- ✅ 모든 메시지 영구 저장
- ✅ 입장 시 전체 메시지 히스토리 표시
- ✅ 닉네임 및 아바타 설정

## 📝 개발 노트

### 프론트엔드 프리뷰/검수 방법
- `src/community-app` 기준으로 **`npm run build` → Python 정적 서버** 조합이 가장 안정적인 미리보기 방식입니다.
  ```bash
  cd src/community-app
  npm run build
  cd dist
  python3 -m http.server 4000
  ```
- 위 서버는 호스트 화이트리스트 검사 없이 동작하므로, 다음 URL로 바로 접속할 수 있습니다.
  - Novita: https://4000-ilair62djyh3cmtl13rke-b9b802c4.sandbox.novita.ai
  - e2b: https://4000-iyqwm3hj0cgb3tlwwo7v5-6532622b.e2b.dev
- Vite `npm run preview`의 경우 포트(5173) + 도메인이 자주 바뀌며 `vite.config.ts` 의 `allowedHosts` 업데이트가 매번 필요하여, 샌드박스에서는 Python 정적 서버 방식을 기본으로 사용합니다.

### 최신 커뮤니티 UI 주요 특징
- 다크 테마(배경 `#0a0a0a`)와 청록색 헤더를 사용해 침하하 UX를 재현했습니다.
- 반응형 레이아웃으로 모바일/태블릿/PC 환경을 모두 지원합니다.
- 게시판/카테고리, 썸네일 미리보기, 댓글 UI, 검색, 즐겨찾기 사이드바, 실시간 인기글·최근 댓글·통계 위젯을 포함합니다.
- 우측 배너는 광고 및 커뮤니티 공지/통계 노출 용도로 설계했습니다.

### 데이터 저장
- 게시판: `community-posts.json` (Render Starter 플랜 서버에서 영구 저장)
- 채팅: `chat-messages.json`
- 자동 저장: 5분마다 + 서버 종료 시

### CORS 및 환경 변수
- 모든 도메인 허용 (`*`)
- Netlify ↔ Render 통신 가능
- 프론트엔드 `.env` 기본값은 Render Starter 실서버 URL을 가리키며, 별도 설정이 없으면 항상 실서비스 API가 사용됩니다.

### 에러 처리
- 네트워크 오류 시 localStorage 폴백
- 서버 오류 시 사용자 친화적 메시지 표시

## 🐛 알려진 이슈

### 베타 서비스 안내
- 간헐적인 서버 연결 지연 (Render Starter 플랜이라도 초기 접근 시 지연 가능)
- 첫 요청 시 서버 콜드 스타트 (최대 30초)
- 익명 게시판 베타 UI는 필수 공지 외 더미 데이터를 사용하지 않으며, 백엔드 연결 실패 시 최소한의 보드 정보만 노출됩니다.

## 📧 문의

- Instagram: @athletic_time
- GitHub: https://github.com/hojune0330/athletetime