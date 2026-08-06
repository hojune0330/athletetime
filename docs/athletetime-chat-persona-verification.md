# AthleTime 오픈 채팅「자유수다」페르소나 사용환경 검증 보고

> 상태: 2026-08-06. 실제 사용자처럼 4개 페르소나가 채팅을 입장→발신→차단→신고→블라인드까지 사용하는 시나리오를 검증한 기록.
> 실행 스크립트: `scripts/chat-persona-smoke.js` (Node, `ws` 클라이언트 + fetch, 환경변수로 대상 서버 변경 가능)

## 1. 검증 목표

프로덕션 배포 환경(또는 그에 준하는 환경)에서, 실제 사용자처럼 아래 흐름을 검증한다.

1. 랜덤 닉네임 사전 검증 (`GET /api/chat/check-nickname`)
2. 웹소켓 입장 (`join` → 101 핸드셰이크 → `history`/`today`/`userCount`)
3. 실채팅 발신 → 전원 브로드캐스트 수신
4. 금칙어 발신 차단 (`CONTENT_FILTERED`, 저장·전파 거부)
5. 입장 안전장치 (중복 닉네임 `DUPLICATE`, 잘못된 방 `ROOM_NOT_AVAILABLE`)
6. 신고 → 블라인드 (`blind` 이벤트 브로드캐스트 + 신규 참여자 history 치환)
7. 중복 신고 방어 (유효하지 않은 사유 거부, 같은 신고자 재신고 안정성)

## 2. 페르소나 정의

| 역할 | 닉네임 | 세션 키(userId) |
| --- | --- | --- |
| 선수 | 질주하는 치타 | persona-athlete |
| 코치 | 폼 잡는 코치 | persona-coach |
| 학부모 | 응원하는 엄마 | persona-parent |
| 동호인 | 새벽 러너 | persona-runner |

완전 익명 원칙(H-1b): userId는 세션 키이며 서버는 `user_key_hash`(SHA-256)만 저장한다.

## 3. 실행 환경

### 3-1. 로컬 풀스택 서버 (최신 코드) — PASS 25/25

- 대상: `http://127.0.0.1:5917` (`src/server.js`, `NODE_ENV=development`, `DATABASE_URL=''` Standalone/Mock 모드)
- 실행: `node scripts/chat-persona-smoke.js`
- 결과: **25 PASS / 0 FAIL**

```
── STEP 1. 닉네임 사전 검증 ──
✅ PASS 선수(질주하는 치타) 닉네임 검증
✅ PASS 코치(폼 잡는 코치) 닉네임 검증
✅ PASS 학부모(응원하는 엄마) 닉네임 검증
✅ PASS 동호인(새벽 러너) 닉네임 검증
✅ PASS 2자 미만 닉네임 거부 — "닉네임은 2~10자 사이여야 해요."
── STEP 2. WS 입장 (join) ──
✅ PASS 입장 4명 전체 history+today+userCount 수신 (4/4)
   ℹ️ 입장 시스템 알림: 새벽 러너님이 입장했습니다.
── STEP 3. 실채팅 발신 / 브로드캐스트 ──
✅ PASS 4개 메시지 각각 전원(4/4) 수신 — id=mem_1..4 | 수신=[선수,코치,학부모,동호인]
── STEP 4. 금칙어 발신 차단 (CONTENT_FILTERED) ──
✅ PASS 금칙어 발신 → CONTENT_FILTERED error — msg=커뮤니티 규칙에 맞지 않는 표현이 포함되어 있어요.
✅ PASS 금칙어 메시지 타인에게 미전파
── STEP 5. 중복 닉네임·잘못된 방 거부 ──
✅ PASS 중복 닉네임 → DUPLICATE error — msg=이미 사용 중인 닉네임이에요.
✅ PASS 잘못된 방(라이브) → ROOM_NOT_AVAILABLE — msg=지금은 자유수다 방만 열려 있어요.
── STEP 6. 신고 → 블라인드 ──
✅ PASS 신고 대상 메시지 id 확보 — id=mem_4
✅ PASS 신고 접수 성공 / Mock 즉시 블라인드 처리
✅ PASS blind 이벤트 전체 브로드캐스트 수신 (4/4)
✅ PASS 블라인드 메시지 history 치환(is_blinded=true, message=null) — {"id":"mem_4","is_blinded":true,"message":null}
✅ PASS 유효하지 않은 신고 사유 거부
── STEP 7. 같은 신고자 중복 신고 처리 ──
✅ PASS 같은 신고자 재신고 응답 정상
```

### 3-2. 실 DB(PostgreSQL) 모드

- 신고 로직은 `backend/routes/chat.js`에 따라 **실 DB에서만 고유 신고자 3명 → 자동 블라인드**가 동작한다.
  - `INSERT ... ON CONFLICT (target_type, target_id, reporter_anonymous_id) DO NOTHING` (같은 신고자 중복 밀어내기)
  - `COUNT(*)` < `BLIND_THRESHOLD(=3)`이면 접수만, `>= 3`이면 `blindMessage()` 호출
- Mock/standalone 모드는 개발 편의상 신고 1건에 즉시 블라인드(인메모리)로 폴백한다 (계약 문서 §2.6과 일치).
- 실 DB 반영 검증은 운영 DB가 노출된 운영 환경에서 재실행 시 확인한다 (§5).

## 4. 발견 사항

### 4-1. 서버 로직 정상 동작 (이슈 아님)

- 개별 신규 참여자의 `history`가 빈 배열로 보이는 현상은 **검증 스크립트의 `waitFor` 버그**(message 핸들러가 `waiters.length = 0`으로 다른 type waiter를 전부 소거)였다. 서버는 해당 시점 히스토리를 정상 반환(디버그로 `mem_1..5` 수신 확인). 스크립트를 `pending만 제거` + `sleep 후 queue.find`로 수정해 해결.

### 4-2. 프로덕션 Render 게이트 미반영 (현재 이슈)

- `https://athletetime-backend.onrender.com`은 health 200이지만 `/api/chat/*`가 여전히
  `{"success":false,"error":"이 기능은 준비 중이에요."}` (HTTP 503)
- 원인: Render 인스턴스가 게이트 해제 커밋(`77d1d77` 이후, 최신 `1696be6`)이 배포되기 **이전 코드**로 실행 중.
- 최신 코드는 GitHub `main`(1696be6)에 푸시 완료(working tree CLEAN). Render가 auto-deploy로 연결돼 있다면 재배포 시 자동 반영된다.
- 프론트 Netlify도 최신 반영(`netlify.toml`의 `VITE_WS_URL`) 필요.

## 5. 운영 재배포 후 재검증 절차

Render 백엔드가 최신 커밋을 반영한 뒤(POST /api/chat/reports 가 503이 아닌 응답을 줄 때), 아래로 동일 시나리오를 실서버에 재검증한다.

```bash
PERSONA_BASE='https://athletetime-backend.onrender.com' \
PERSONA_WS='wss://athletetime-backend.onrender.com' \
PERSONA_ENV='프로덕션 Render' \
node scripts/chat-persona-smoke.js
```

주의사항:

- 프로덕션은 실 DB 모드라 신고 1건은 블라인드가 **아니고** 접수(count=1)만 된다.
  - 3명 독립 reporterKey로 재검증 시 자동 블라인드까지 확인하려면 `BLIND_THRESHOLD=3` 충족이 필요하다.
- 운영 DB에 테스트 잔여 데이터가 남지 않도록, 검증 직후 해당 메시지·신고를 운영자 큐(`GET /api/chat/admin/reports`)에서 정리하거나 짧게 유지한다.
- 실서버 검증 생성 메시지는 실제 사용자에게 노출될 수 있으므로 닉네임에 `[검증]` 표기를 권장한다.

## 6. 관련 계약 테스트

- `backend/tests/deployment-wiring.test.js` — WS-001/003/004/NETLIFY-001/RUNTIME-001 활성
- `backend/tests/launch-interaction-safety.test.js` — /ws/chat 라우팅 활성 검증
- `backend/tests/launch-surface-nav.test.js` — /chat note '' (오픈 채팅 표기)
- `backend/tests/data-rights-storage.test.js` — migration-007-chat.sql 포함
- 전체 순차 스위트: 440 tests / 431 pass / 0 fail / 9 skip
