# AthleTime 채팅 오픈 계획 — 단일방「자유수다」

> **승인**: 호준(hojune0330) — 2026-07-26 설계 확정
> **브랜치**: main 단일 브랜치, 단계별 즉시 커밋·푸시
> **원본 스펙**: `docs/work-orders/20260708-community-activation-track-h.md` (H-1b/H-1c)
> **상태**: 설계 확정 → 구현 진행

---

## 1. 목표와 범위

- **단일 상시방「자유수다」** 를 실제 사용 가능 상태로 개설한다.
- **완전 익명 유지**: 서버는 `user_key_hash`(익명 세션 키 단방향 해시)만 저장. 원문 식별자·실명·IP 미저장.
- **Phase 1+2 통합(한 번에)**: 랜덤닉네임 UX + DB 영속화 + 운영 안전장치(신고/블라인드/금칙어/이용 제한)를 동시에 포함.
- **호스팅/백엔드 인프라는 무변경 우선**: Netlify는 WS Upgrade 프록시를 지원하지 않으므로, 프로덕션은
  `VITE_WS_URL = wss://athletetime-backend.onrender.com/ws/chat` 로 Render에 직접 연결한다.
  (netlify.toml 프로덕션 CSP `connect-src`에 `wss://athletetime-backend.onrender.com`가 이미 허용되어 있어 build 환경변수 추가만 필요)

---

## 2. 확정 설계

### 2.1 방 구조 — 단일화

- 상시 방은 **「자유수다」 1개**(서버 room id `'main'` 유지)만 둔다.
- 서버 `rooms` / `roomNicknames` / `chatHistory`의 training/race/injury 방은 제거하고 `main` 단일 운영
  (제거 대신 미사용 키로 남겨두어도 무방 — 단일 방만 접속/저장/조회).
- 프론트 `RoomId = 'main'`만, `CHAT_ROOMS = [{ id:'main', name:'자유수다', icon:'💬' }]`.
- 라이브방(H-2a)은 추후 별도 트랙. 이번 범위에서 동적 방 생성은 하지 않는다.

### 2.2 익명성 구조

| 항목 | 값 |
| --- | --- |
| 클라이언트 식별자 | sessionStorage `chat_user_id` (`user_`+Date.now(), 무작위 세션 키) |
| DB 저장 키 | `user_key_hash` — 서버가 세션 키를 SHA-256 해시한 값 (원문 미저장) |
| 저장 금지 | 실명, 이메일, IP, 원본 세션 키 |
| API 응답 | `user_key_hash` 어떤 응답에도 포함 금지 (계약 테스트 잠금) |

### 2.3 랜덤 닉네임 (H-1c 확정)

- 형식: `{수식어} {육상명사} {2자리수}` — 예) `질주하는 치타 42`, `막판스퍼트 가젤 88`
- 수식어 풀 20개+ × 명사 풀 20개+ = 400+ 조합 × 00–99
- 입장 전 **🎲 리롤 무제한**, 입장 후 **변경 불가**
- 방 내 중복 시 숫자 재추첨 (현재 활성 닉네임과 중복만 방지)
- 직접 입력 UI 제거
- 세션 유지: 기존 sessionStorage 키(`chat_nickname`) 그대로 사용 (단일방이므로 방 스코프 추가 불필요)

### 2.4 DB 저장 (Phase 2)

- 신규 테이블 `chat_messages` (migration-007):
  `id, room_id, nickname, user_key_hash, body, created_at, is_blinded, hidden_at`
- 입장 시 **최근 200개** 히스토리 로드 (기존 메모리 50개 대체 — DB 우선, 실패 시 메모리 폴백)
- **30일 보존 정책**: 배치 삭제 `DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '30 days'`
  → 서버 기동 시 1회 + 하루 1회 타이머로 가벼운 운영
- `is_blinded` 메시지는 화면에서 `신고 누적으로 블라인드된 게시물입니다.` 로 치환 (원문 DB 보존)

### 2.5 운영 안전장치 (H-1b 레일)

| 장치 | 동작 |
| --- | --- |
| 금칙어 필터 | `backend/utils/contentFilter.js` 신설. 포함 시 **저장 거부** + 안내 `커뮤니티 규칙에 맞지 않는 표현이 포함되어 있어요.` (클라에 토큰 에러로 회신, 시스템 메시지 표시) |
| 신고 | `reports` 테이블(`target_type='chat'`, `target_id=chat_message id`, `reporter_key_hash`). 동일 대상 **고유 신고자 3명** 도달 → 자동 블라인드. 중복 신고자 카운트 방지. |
| 운영자 큐 | `GET /api/chat/admin/reports` (`authenticateToken` + `requireAdmin`) — 블라인드 해제/영구 삭제/작성자 이용 제한 |
| 이용 제한 | `users.muted_until TIMESTAMPTZ` — 제한 중 채팅 발신 403 + 안내. (익명 사용자는 masked by key hash — 운영자 도구에서 hash 기반 제한) |
| 규칙 동의 | 첫 입장 시 5개 조항 모달 (H-1b 문구), localStorage 플래그 `chat_rules_agreed` 로 1회 |
| 접속자 표기 | 10명 미만 → `오늘 참여 N명`(누적 고유 닉네임, 서버가 `today` 제공), 10명 이상 → `현재 N명` |

### 2.6 채팅 프로토콜 (기존 유지 — useWebSocket/useChat 계약 그대로)

```
클라 → 서버
  { type:'join', room, nickname, userId }
  { type:'message', text, nickname, userId }

서버 → 클라
  { type:'history', messages:[{ nickname, message, user_id, created_at }] }
  { type:'message', data:{ nickname, text, timestamp, userId } }
  { type:'system', text }
  { type:'userCount', count }
```

추가(서버→클라, 통신에만 사용):
- `{ type:'error', code:'CONTENT_FILTERED'|'MUTED'|'DUPLICATE'|'ROOM_FULL', message }` — 발신 거부 사유 전달
- `{ type:'blind', messageId }` — 실시간 블라인드 반영

---

## 3. 구현 레일 (코드 변경 지도)

| 파일 | 변경 |
| --- | --- |
| `backend/database/migration-007-chat.sql` | 신설 — `chat_messages`, `reports`, `users.muted_until` (idempotent, 006 다음 번호) |
| `backend/utils/contentFilter.js` | 신설 — `checkContent(text)` → `{ blocked, message, flagged }` (금칙어=blocked, 저격패턴=flagged 경고만) |
| `backend/utils/websocket.js` | 확장 — 단일방 `main`, DB 저장(user_key_hash), history 200(DB 우선), contentFilter, is_blinded 치환, muted 차단, `today` 카운트, DB 실패 시 인메모리 폴백. **`broadcastToClients` 시그니처 보존 필수(posts.js:16 사용)** |
| `src/server.js` | 275행 `check-nickname` 실구현 라우트 교체, 362-371행 upgrade에서 `/ws/chat` → chat WSS attach (wsManager `/ws`와 공존) |
| `backend/middleware/launchFeatureGate.js` | `UNAVAILABLE_INTERACTION_PREFIXES`에서 `'/api/chat'` 제거 (POST /api/chat/reports 통과) |
| `backend/routes/chat.js` | 신설 — `GET /api/chat/check-nickname`, `POST /api/chat/reports`, `GET /api/chat/admin/reports` (admin 큐) |
| `frontend/src/pages/ChatPage/types/index.ts` | `RoomId='main'`, `CHAT_ROOMS` 단일 자유수다 |
| `frontend/src/pages/ChatPage/components/NicknameModal.tsx` | 직접 입력 제거 → 랜덤닉 카드 + 🎲 리롤 + 규칙 동의 + 입장하기 |
| `frontend/src/pages/ChatPage/components/RoomSidebar.tsx` | 3방 → 자유수다 단일 + 규칙/신고 안내 진입 |
| `frontend/src/pages/ChatPage/index.tsx` | FeaturePreparingPage → 실채팅 UI (useChat + 기존 컴포넌트 조합) |
| `frontend/src/components/layout/Header.tsx` | 110행 chat `note:'준비 중'` 제거 (모바일 드로어도 동일 적용 — 157행 `{item.note}` 공용) |
| `netlify.toml` | `[build.environment]`에 `VITE_WS_URL = "wss://athletetime-backend.onrender.com/ws/chat"` 추가 (인프라 무변경) |
| `backend/tests/deployment-wiring.test.js` | DEPLOY-WS-001/003/004, DEPLOY-NETLIFY-001, DEPLOY-RUNTIME-001 활성 계약 원복 (WS-002 wsManager는 유지) |
| `backend/tests/launch-interaction-safety.test.js` | 라인106-135(POST /api/chat 503 기대), 137-142(/ws/chat reject) 활성 반영 |

---

## 4. 테스트 원칙

- 백엔드 테스트는 **순차 실행**(`node --test --test-concurrency=1 ...`)이 원칙이다.
  병렬(`node --test backend/tests/`)은 서버 스폰 테스트들이 여러 개 동시에 뜨며 리소스 경합으로 hang된다 (과거 91 fail baseline의 근본 원인).
- 최종 검증 결과 (순차, 채팅 활성화 반영): **440 tests / 431 pass / 0 fail / 9 skip**.
  신규 변경이 **0 fail을 넘지 않도록** 유지한다.
- 기존 fail-closed 계약들이 "활성화됐으니 통과"로 원복되며 fail 수가 0이 된 것이 정상 목표다.
- `npx tsc -b --pretty false` + `npx vite build` 통과 필수.
- Mock DB/standalone 모드(NODE_ENV=development, DATABASE_URL='')에서도 채팅 WS가 크래시 없이 기동 → DB try/catch + 인메모리 폴백 필수.
- 신규 채팅 계약 테스트: check-nickname 200, reports 라우트 3명 블라인드(단위), contentFilter blocked/flagged 분리.

---

## 5. 배포 게이트 (deployment-target 갱신 내용)

- `docs/athletetime-deployment-target.md` **"공개하지 않는다" 목록에서 "오픈채팅과 채팅 웹소켓" 제거**,
  **"공개한다" 목록에 채팅(자유수다 단일방, DB 저장·30일 보존, 운영 안전장치 포함) 추가**.
- 운영 게이트 7번: "커뮤니티·거래·업로드 쓰기가 거절되는지 확인 **+ 채팅 입장/발신/신고 스모크**" 로 갱신.
- 프로덕션 WS는 `wss://athletetime-backend.onrender.com/ws/chat` 직접 연결 (Netlify 프록시 우회).

---

## 6. 문구 확정 (H-1b/H-1c 준수 — 임의 변경 금지)

| 항목 | 문구 |
| --- | --- |
| 규칙 동의 5개 조항 | 1) 특정인 저격·비방 금지(선수·지도자·학부모 모두) 2) 개인정보(실명·소속·연락처) 노출 금지 3) 익명은 보호 장치이지 면책이 아님 — 위반 시 제재 4) 신고 3회 누적 시 자동 블라인드, 운영자 검토 후 조치 5) 홍보·도배 금지 |
| 금칙어 거부 | `커뮤니티 규칙에 맞지 않는 표현이 포함되어 있어요.` |
| 블라인드 치환 | `신고 누적으로 블라인드된 게시물입니다.` |
| 저격 경고(제출 전) | `특정인에 대한 글은 명예훼손 분쟁으로 이어질 수 있어요. 게시할까요?` (채팅은 차단 없이 안내만) |
| 랜덤닉 형식 | `{수식어} {육상명사} {2자리수}` — `질주하는 치타 42` |

---

## 7. 커밋 계획 (main 단일 브랜치)

1. **이 문서 + deployment-target 공개 범위 + 마스터플랜 3A 행** → 설계 확정 커밋 (`docs(1):`)
2. db-migration(007) → content-filter → chat-ws → chat-routes → gate-release → chat-frontend → tests-update
3. verify(tsc + vite build + node --test + WS 스모크) 후 **최종 정합 커밋** (`feat(chat): 자유수다 오픈`)
4. 각 단계 마무리마다 즉시 커밋·푸시, working tree 깨끗 유지
