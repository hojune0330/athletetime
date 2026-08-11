# AthleteTime 운영 배포 기준

> 상태: 2026-07-26 기준. 이 문서는 운영 반영 전의 필수 조건을 기록한다. 조건 하나라도 빠지면 배포하지 않는다.

## 배포 대상

| 영역 | 운영 대상 | 역할 |
| --- | --- | --- |
| 저장소 | `hojune0330/athletetime` | 유일한 운영 소스 |
| 프론트 | Netlify | React 정적 화면 |
| API | Render | Express API와 PostgreSQL 연결 |
| 데이터베이스 | Render PostgreSQL 또는 승인된 PostgreSQL | 계정·권리 요청·운영 데이터 |

`2026-first-item`은 과거 개발 이력이다. 운영 반영은 `athletetime`의 검토된 커밋에서만 한다.

## 이번 공개 범위

공개한다.

- 이름 또는 소속으로 공개 경기기록 찾기
- 대회 결과 확인
- 기록카드와 훈련 계산기처럼 서버에 개인 활동을 남기지 않는 보조 도구
- 데이터 정정·숨김 요청 접수

공개하지 않는다.

- 커뮤니티 글·댓글·투표·투표함 쓰기
- 중고거래 등록·수정·이미지 업로드
- 사용자 대회·경기결과 제보와 수정
- 공개 기록의 공유 카드 발행
- 오픈 채팅과 채팅 웹소켓

준비되지 않은 항목은 화면, HTTP API, 웹소켓 모두 `503` 또는 준비 화면으로 닫는다. 숨긴 화면만으로는 충분하지 않다.

## 배포 전 필수 환경값

| 이름 | 기준 |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | 운영 PostgreSQL 주소. 없으면 서버가 시작되면 안 된다. |
| `JWT_SECRET` | 새로 생성한 충분히 긴 비밀값. 개발값 재사용 금지. |
| `AUTH_CODE_PEPPER` | 32자 이상 새 비밀값. 이메일·비밀번호 재설정 인증번호 해시에 사용한다. |
| `DATABASE_CA_CERT_BASE64` | 가능하면 운영 DB의 CA 인증서. |
| `RENDER=true` + `DATABASE_TLS_ALLOW_SELF_SIGNED=true` | Render 내부 DB의 자체 서명 인증서를 쓸 때만 함께 설정한다. 다른 환경에서 TLS 검증을 약화하면 안 된다. |
| 메일 발송 키 | 실제 발송 계정과 발신 도메인 검증을 마친 값. |

비밀값은 저장소, 브라우저 번들, 로그, PR 본문에 적지 않는다.

## 데이터베이스 원칙

운영 DB는 기존 AthleteTime 기본 스키마를 가진 상태여야 한다. `backend/database/run-migrations.js`는 데이터 권리·보존·인증 보강용 `migration-004`부터 실행한다. 빈 DB에 운영 마이그레이션만 실행하면 기본 `users` 스키마가 없어 실패해야 정상이다.

삭제된 `backend/database/run-migration.js`와 `backend/database/seed.js`는 사용하지 않는다. 첫 파일은 오래된 단일 마이그레이션 실행기였고, 두 번째 파일은 가짜 커뮤니티 공지를 넣었다. 둘 다 운영 배포 경로가 아니다.

빈 검증 DB는 아래 순서로만 만든다.

1. 폐기 가능한 새 PostgreSQL 데이터베이스를 만든다.
2. `backend/database/schema-fixed.sql`로 기본 스키마를 만든다. 이 파일은 현재 채팅 신고용 `reports` 구조를 포함하며, 기존 테이블을 지우므로 운영 DB에는 실행하지 않는다.
3. `migration-001`부터 `migration-003`을 검증 DB에서만 순서대로 적용한다.
4. `npm run data:rights:schema:migrate`로 `migration-004`부터 현재 마이그레이션을 적용한다.
5. 계정 가입·로그인·비밀번호 재설정·기록 검색·권리 요청을 실제로 점검한다.

자동 PostgreSQL 통합 테스트는 스키마를 만들고 지우므로, 로컬 검증 DB에서만 `TEST_DATABASE_URL`과 `TEST_DATABASE_DESTRUCTIVE_OK=yes`를 함께 지정한다. 주소가 로컬이 아니거나 DB 이름에 `test`가 없으면 테스트가 시작되지 않는다.

`npm run test:data-rights`는 별도 서버 없이도 PGlite로 `007` 기록 상태, 보존·거절 경로, 새 `reports` 부트스트랩 삽입을 매번 재현한다. GitHub Actions는 같은 테스트를 실제 폐기용 PostgreSQL 서비스에서도 다시 실행한다.

### `reports` 이름 충돌 복구 게이트

과거 커뮤니티 신고 테이블과 현재 채팅 신고 테이블은 모두 `reports`라는 이름을 사용한 이력이 있다. `migration-006a-legacy-reports-isolation.sql`과 `migration-008-chat-reports-repair.sql`은 알려진 과거 구조만 `legacy_community_reports`로 보존하고, 현재 채팅 구조를 확인하거나 새로 만든다. 이미 기록된 `migration-007-chat.sql`의 파일 내용은 바꾸지 않는다.

다음은 코드 반영만으로 운영 실행을 승인하지 않는다.

1. 운영 DB의 백업 식별자와 복원 담당자를 먼저 기록한다.
2. 운영과 분리된 PostgreSQL에서 같은 마이그레이션 기록 상태를 재현해, 보존된 행 수와 채팅 신고 삽입·조회가 모두 맞는지 확인한다.
3. `reports` 또는 `legacy_community_reports`가 예상과 다르면 마이그레이션은 중단된다. 이 경우 우회 실행하거나 테이블을 지우지 말고, 스키마 덤프를 근거로 별도 복구 결정을 한다.
4. 위 확인 결과를 검토한 뒤에만, 승인된 담당자가 별도 유지보수 창에서 운영 실행 여부를 결정한다.

## 운영 반영 게이트

1. 배포할 커밋 SHA를 먼저 고정한다.
2. 운영 DB 백업을 만들고, 별도 위치에서 복원 가능한지 확인한다.
3. 위의 빈 검증 DB 절차와 `npm run verify`를 같은 SHA에서 통과시킨다.
4. 운영 DB에서 스키마 마이그레이션을 실행하고, 운영 API의 직접 HTTPS 주소로 `npm run data:rights:readiness -- --base-url https://athletetime-backend.onrender.com`를 실행한다. 이 확인은 Netlify 경유 주소가 아니라 Render API 원본 주소를 사용한다. 실패하면 배포하지 않는다.
5. Render와 Netlify에 같은 SHA를 배포한다.
6. 공개 주소에서 `/health`, `/records`, `/competitions`, `/data-request`, 가입·로그인·비밀번호 재설정을 확인한다.
7. 직접 요청으로 커뮤니티·거래·업로드·채팅 API가 읽기와 쓰기 모두 `503`으로 닫혀 있는지 확인한다. 특히 `/api/posts*`, `/api/marketplace*`, `/api/chat/*`, `/ws/chat`은 `Cache-Control: no-store`를 함께 반환해야 한다.
8. 배포 SHA, 시각, 백업 식별자, 스모크 결과, 롤백 담당자를 릴리스 기록에 남긴다.

## 롤백 기준

다음 하나라도 생기면 기능 추가가 아니라 즉시 롤백 또는 읽기 전용 전환을 먼저 검토한다.

- 로그인·비밀번호 재설정 실패 또는 인증번호 반복 발송
- 기록 검색에서 다른 선수 기록이 한 사람으로 합쳐져 보임
- 숨김 요청 이후 검색·상세·카드에서 계속 노출됨
- 준비 중 기능이 쓰기 성공처럼 응답함
- 배포 SHA가 Netlify와 Render에서 다름
- 운영 DB 백업 또는 복원이 확인되지 않음

## 남은 보안 관찰

프론트 의존성 검사에는 React Router의 RSC 모드 관련 고등급 경고가 남아 있다. 현재 앱은 `BrowserRouter` 기반 SPA이고 React Server Components나 서버 액션을 사용하지 않아 해당 공격 경로는 사용하지 않는다. 다만 경고를 해결한 것은 아니므로, 배포 직전 현재 권고 버전을 다시 확인하고 RSC·서버 액션을 도입할 때는 반드시 먼저 업데이트한다.

### Release exception: React Router audit

- `npm audit --omit=dev`는 React Router 관련 high 2건으로 여전히 red다. 이 예외는 경고를 해소했다는 의미가 아니다.
- 근거: `GHSA-qwww-vcr4-c8h2`는 unstable RSC API에만 적용된다. 현재 프론트는 `BrowserRouter`와 Vite 기반 SPA이며 unstable RSC, React Server Components, 서버 액션을 사용하지 않는다.
- 금지 조건: unstable RSC를 도입하거나 React Router 메이저 마이그레이션을 시작하기 전에는 이 예외를 사용할 수 없다. 먼저 공식 수정 경로인 React Router v8+로 해소하고, `npm audit --omit=dev`를 다시 실행해 결과를 릴리스 기록에 남긴다.
