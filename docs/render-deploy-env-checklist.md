# Render 배포 환경변수 체크리스트

> 문서 ID: OPS-DEPLOY-ENV-001
> 마지막 갱신: 이번 작업(배포 실패 원인 확정) 직후

## 왜 이 문서가 필요한가

Render에서 채팅 관련 커밋(`96289b0` … `884f92a`)이 전부 **"Exited with status 1 while running your code"** 로
배포 실패했었다. 원인은 코드 문제가 아니라 **Render 대시보드(서비스 환경변수)에 필수 환경변수가 없어서** production
기동 즉시 `throw` → 프로세스 exit 1 이었다.

Render는 배포 실패 시 직전 **성공한 배포(Live)** 로 롤백을 유지하므로, 실패한 기간 동안에도 health는 200으로 뜨고
`/api/chat/*`은 옛 게이트 버전 응답(503 "이 기능은 준비 중이에요.")을 계속 내보냈다. 즉 "자동 배포가 안 된 것"이 아니라
"배포는 매번 시작됐지만 **필수 환경변수 누락으로 매번 실패**했던 것"이다.

## 로컬 재현으로 확정한 실패 체인 (원인)

| 순번 | 지점 | 조건 | 결과 |
|---|---|---|---|
| 1 | `src/server.js:51` → `backend/auth/recoveryCodes.js:13` | `AUTH_CODE_PEPPER` 가 32자 미만 (또는 미설정) | 즉시 throw → **exit 1** |
| 2 | `backend/utils/db.js:28` | `DATABASE_URL` 미설정 | 즉시 throw → **exit 1** |
| 3 | `backend/utils/jwt.js:22` | `JWT_SECRET` 미설정 | 즉시 throw → **exit 1** |
| 4 | DB 연결 | `DATABASE_URL` 값이 접속 불가(ECONNREFUSED) | `startServer()` catch → **exit 1** |

세 환경변수가 모두 유효하면 서버는 정상 기동한다. (그 외 권장: `ADMIN_TOKEN`, `RESEND_API_KEY`)

## 해결 절차 (Render 대시보드)

1. Render 대시보드 → **athletetime-backend** 서비스 → **Environment** 탭
2. 아래 3가지를 **반드시** 추가/확인한다 (값은 자체 시크릿 사용):

   | Key | 값 | 조건 |
   |---|---|---|
   | `AUTH_CODE_PEPPER` | `openssl rand -base64 48` (예: `9L3m...`) | **32자 이상** 필수 |
   | `DATABASE_URL` | 실제 PostgreSQL 연결 문자열 (Render PostgreSQL 내부 URL 권장) | 형식 `postgres://user:pass@host:port/db` |
   | `JWT_SECRET` | `openssl rand -base64 48` | **32자 이상** 권장 (미설정 시 기동 실패) |
   | `ADMIN_TOKEN` | 관리자 인증용 시크릿 | 권장 (없으면 관리자 API 503) |
   | `RESEND_API_KEY` | 이메일 발송용 | 권장 (없으면 이메일 비활성) |

   > ⚠️ **AUTH_CODE_PEPPER / JWT_SECRET 변경 시**: 기존에 발급된 복구 코드·JWT의 유효성이 즉시 무효화된다.
   > 운영 중 첫 설정이라면 영향 없음(기존에 미설정 상태였으므로).

3. **Save Changes** 후 다시 배포를 실행한다 (브랜치에 새 커밋을 푸시하거나 Deploy 버튼).
4. 배포 로그 확인: 빌드 후 `Mode: Production (PostgreSQL)` 로 시작되는지 확인.

## 배포 전 로컬 점검 (필수 env 빠른 검증)

```bash
cd <AthleteTime 저장소 루트>

# 1) 현재 셸 env 기준 필수 3종 확인 (없으면 exit 1)
node scripts/check-production-env.js

# 2) .env 파일 기준 확인
NODE_ENV=production node scripts/check-production-env.js --env .env.production

# 3) 수동: 실제 production 기동 재현 (가짜 DATABASE_URL로 greedy 확인 가능)
NODE_ENV=production AUTH_CODE_PEPPER='<32자 이상>' DATABASE_URL='<실제>' JWT_SECRET='<32자 이상>' node src/server.js
```

`npm run deploy:check` 도 동일하다.

## 재배포 후 검증 (준비 중 기능 차단)

채팅은 현재 공개하지 않으며, 운영자가 메시지를 보내거나 신고를 만드는 검증은 하지 않는다. `/api/chat/*`와 `/ws/chat`은 모두 `503`으로 거절되어야 하고, 채팅 화면은 준비 중 안내만 보여야 한다.

1. 브라우저에서 `/chat`을 열어 `오픈 채팅은 준비 중이에요` 안내가 보이는지 확인한다.
2. 직접 `GET /api/chat/check-nickname?nickname=qa`를 요청해 `503`과 `Cache-Control: no-store`를 확인한다.
3. 직접 `/ws/chat` 연결을 시도해 `503`으로 거절되는지 확인한다. 일반 웹소켓 `/ws`를 채팅 경로로 바꾸거나, 과거 페르소나 스모크를 실행하지 않는다.

## 이 실패를 재발시키지 않는 안전망

- `npm run deploy:check` (또는 `npm run predeploy`) → 필수 3종 env 사전 검증
- `backend/tests/deployment-wiring.test.js` 의 `DEPLOY-ENV-001~004` → 회귀 테스트 (npm test 커버)
- `DEPLOY-WS-*`, `DEPLOY-RUNBOOK-002` → 채팅 준비 화면·HTTP·웹소켓 차단과 운영 문서 회귀 방지
- **Render 배포 전 반드시**: Environment 탭에 필수 3종이 있는지부터 확인할 것
