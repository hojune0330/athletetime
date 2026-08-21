---
slug: athletetime-anonymous-community-main
status: review-blocked
intent: clear
review_required: true
phase: review_infrastructure_blocked
plan_path: .omo/plans/athletetime-anonymous-community-main.md
plan_sha256: 1716740c094431ff72612b43984d2fca89df72b1c0d4684590887b3d8d723b37
review_round_id: anon-community-20260821T225410-2251dd26
round_status: inconclusive
pending-action: await approved Codex credential injection path, then start fresh review round
review:
  momus:
    status: inconclusive
    workspace_root: "D:\\admin\\Documents\\코덱스 폴더\\_community_ux_audit_61a0e17"
    runtime_home: null
    target: .omo/plans/athletetime-anonymous-community-main.md
    round_id: anon-community-20260821T225410-2251dd26
    plan_sha256: 1716740c094431ff72612b43984d2fca89df72b1c0d4684590887b3d8d723b37
    launch_id: momus-2251dd26-01
    session: /root/anonymous_plan_momus_r2
    result: invalidated_by_independent_cli_startup_failure
  independent:
    status: inconclusive
    workspace_root: "D:\\admin\\Documents\\코덱스 폴더\\_plan_review_anon-community-20260821T225410-2251dd26"
    runtime_home: "D:\\admin\\Documents\\코덱스 폴더\\_codex_home_anon-community-20260821T225410-2251dd26"
    target: .omo/plans/athletetime-anonymous-community-main.md
    round_id: anon-community-20260821T225410-2251dd26
    plan_sha256: 1716740c094431ff72612b43984d2fca89df72b1c0d4684590887b3d8d723b37
    launch_id: independent-2251dd26-01
    session: exec:c1119f
    result: cli_argument_error_before_review
approach: "공개 정보와 회원 전용 익명 대화를 한 메인에 배치하고, 서버 HMAC 익명 행위자·운영자 역할 분리·글별 별칭·신고/보존 경계를 먼저 잠근 뒤 초대형 단일 피드로 시작"
---

# Draft: athletetime-anonymous-community-main

## High-accuracy review history

- Round `anon-community-20260821T224837-2b5a75cc` at plan SHA `1716740c094431ff72612b43984d2fca89df72b1c0d4684590887b3d8d723b37`: INCONCLUSIVE. Momus session `/root/anonymous_plan_momus_r1` stopped before review because its Windows descriptor-relative open failed. The independent launcher failed before creating a process receipt because its PowerShell prompt was not safely escaped. No content verdict from this round is reusable; the next round must use fresh IDs and the launcher-verified native descriptor reader.
- Round `anon-community-20260821T225410-2251dd26` at the same plan SHA: INCONCLUSIVE. The launcher-verified descriptor reader was available, but independent process receipt `exec:c1119f` exited before model startup because the approval flag was placed after the `exec` subcommand; this invalidated Momus session `/root/anonymous_plan_momus_r2`. No content verdict from this round is reusable.
- Infrastructure probe after Round 2: the corrected CLI invocation and public CA bundle reach the API, but the required isolated `CODEX_HOME` has no injected login and receives HTTP 401. The existing token store was not read, copied, printed, or linked. A fresh round requires an explicitly approved opaque credential-injection path.

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| A | 작성자 계정·선수 기록이 공개/일반 운영 화면에 연결되지 않는 서버 익명 경계 | active | `backend/routes/posts.js`, `comments.js`, `database/schema.sql`, `docs/athletetime-auth-privacy-security-contract.md` |
| B | 서버 발급 HMAC 행위자만 신뢰하는 게시글·댓글·신고·차단 API와 데이터 모델 | active | `docs/decisions/05-verified-member-community-chat.md:65-90` |
| C | `/`와 `/community`를 공유하는 단일 익명 피드·상세·작성·검색 UI | active | `frontend/src/App.tsx:148-160`, `pages/CommunityPage.tsx`, `DESIGN.md` |
| D | 신고 큐·임시 숨김·복구·제재·감사·보존/파기 운영 | active | `docs/decisions/05-verified-member-community-chat.md:92-116` |
| E | 사람이 검수한 정보성 콘텐츠와 기록 맥락 연결 | active | `frontend/src/pages/admin/AdminContentStudioPage.tsx`, `components/community/RecordContextPrompt.tsx` |
| F | 네비게이션 승격, 기능 게이트, 계약/E2E/접근성/반응형 출시 검증 | active | `Header.tsx`, `MobileTabBar.tsx`, `launchFeatureGate.js` |
| G | 실시간 채팅, 이미지, 설문, 비추천, 게시물 인기 승격, 다중 게시판, 명예의 전당 | deferred | 사용 밀도·운영 여력이 확인된 뒤 별도 승인 |
| H | 수동 검수형 버전 닉네임 팩과 게시물 카드에 연결되는 대표 댓글·양수형 공감 | active | `backend/utils/communityActor.js`, `community_comment_reactions`, `CommunityThreadRow`, `CommentPreview` 계획 계약 |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
| 메인의 의미 | `/`를 익명 커뮤니티 홈으로 하고 기록·대회는 상단 정보 모듈과 1차 탭으로 유지 | 사용자의 "완전 메인" 지시를 가장 직접적으로 반영 | yes |
| 공개/회원 경계 | 공개 방문자는 운영 정보와 익명성 설명을 보고, 초대·확인된 회원만 익명 대화 본문을 읽고 쓴다 | 에타식 `우리끼리` 경계와 솔직한 대화를 만들고 공개 검색·캡처 노출을 줄임 | yes |
| 초기 정보구조 | 한 피드 + `대회·기록`, `훈련·장비`, `학교·팀 생활`, `자유` 태그 | 적은 이용자를 빈 게시판으로 분산하지 않음 | yes |
| 정보성 콘텐츠 | Content Studio에서 사람이 출처·권리를 확인한 운영자 글만 발행 | AI 자동 게시·사용자 사칭 방지 | yes |
| 표시 익명 | 글 작성자 `글쓴이`; 새 댓글 별칭은 기본 동물·음식 80% + 수동 검수 `2026-08` 밈 팩 20%, 기존 저장 별칭은 고정 | 글 간 추적 방지, 다각화, 유행의 과잉·노후화를 함께 제어 | yes |
| 대표 댓글 | 작성자 제외 서로 다른 회원 공감 2개 이상이면 게시물별 우수댓글 최대 2개, 없으면 최근 댓글 1개 | 적은 이용자 수에서도 댓글의 재미를 피드에 보이되 전역 인기·평판은 만들지 않음 | yes |
| 출시 범위 | 텍스트 글·댓글·양수형 공감·게시물별 대표 댓글·신고·내 화면에서 숨기기·검색·내가 참여한 글까지만; 이미지/설문/비추천/전역 베스트/채팅 제외 | 최소 안전 운영면과 재방문 루프를 함께 검증 | yes |
| 테스트 전략 | 신뢰 경계와 비동기 동작은 TDD, UI는 실제 Chrome 320/375/768/1280 검증 | 보안·회귀·CJK 실패를 출시 전에 포착 | no |

## Findings (cited - path:lines)

- 현재 모든 커뮤니티 라우트는 준비 화면으로 닫혀 있다: `frontend/src/App.tsx:148-160`, `frontend/src/pages/CommunityPage.tsx:3-9`.
- `/api/posts`도 읽기까지 503으로 차단된다: `src/server.js:265-275`, `backend/middleware/launchFeatureGate.js:1-54`.
- 레거시 작성 흐름은 브라우저 `anonymousId`를 영구 사용자 레코드에 연결한다: `backend/routes/posts.js:327-379`, `backend/routes/comments.js:18-63`.
- DB는 `users.anonymous_id`, `posts.user_id`, `comments.user_id`, `votes.user_id`, `reports.reporter_anonymous_id`를 보존한다: `backend/database/schema.sql:31-46,75-115,165-230`.
- 인증 저장소는 IP·User-Agent를 보존하고 조회수 중복 방지도 IP·UA·쿠키를 해시한다: `backend/database/migration-001-add-auth.sql:74-121`, `backend/utils/viewDedup.js:43-56`.
- 서버 자체 요청 로그는 경로/상태/시간을 남기지만 호스팅/CDN/백업의 IP 보존 정책은 저장소로 증명되지 않는다: `src/server.js:145-157`.
- 따라서 현재 상태나 일반 호스팅 환경에서 “관리자도 모르는 절대 익명”을 사실로 보장할 수 없다.
- 이용자가 적은 시장에서는 기술 식별자를 제거해도 대회·소속·학년·기록·시점 조합만으로 작성자가 추정될 수 있다. 작성 화면의 맥락 노출 경고와 개인정보 패턴 검사가 필수다.
- 개인정보보호법은 안전성 확보와 접속기록 관리를 요구하며 처리 목적·보유기간·파기 절차 공개가 필요하다. 정확한 기간과 적용 범위는 법률 검토가 필요하다.
- 기존 UI의 `localStorage` 익명 ID·작성자·비밀번호 제출은 재사용하면 안 된다: `frontend/src/utils/anonymousUser.ts:17-37`, `frontend/src/api/posts.ts:91-104`.
- 기존 채팅의 `SHA-256(userId)`는 salt/비밀키가 없어 후보 ID를 대입해 비교할 수 있으므로 새 익명 행위자 키로 재사용하면 안 된다: `backend/utils/websocket.js:51-57`.
- 에브리타임의 공식 설명도 익명 자체보다 학교별 독립 공간과 학교 인증을 안전한 소통의 근거로 내세운다. AthleteTime도 공개 인터넷 전체가 아니라 작은 참여 경계를 먼저 만들어야 한다.
- 기록 맥락 연결과 Content Studio의 사람 검수 흐름은 재사용 가치가 있다: `frontend/src/components/community/RecordContextPrompt.tsx:8-35`, `frontend/src/pages/admin/AdminContentStudioPage.tsx:26-239`.
- 기존 7개 게시판/다기간 인기 UI는 적은 초기 이용자를 분산하고 현 디자인 시스템과도 어긋난다: `CommunityBoardTabs.tsx:17-25`, `CommunityBestStrip.tsx:21-28,148-203`, `DESIGN.md:1-24`.
- 과거 Track H 문서는 명시적으로 역사 문서이며 현재 승인으로 쓸 수 없다: `docs/work-orders/20260708-community-activation-track-h.md:1-5`.
- 현재 결정 문서는 회원·세션·신고·운영·보존·미성년 정책을 선결 조건으로 둔다: `docs/decisions/05-verified-member-community-chat.md:47-142`.
- 채팅은 문서상 닫힘과 실제 활성 상태가 충돌한다: `docs/decisions/05-verified-member-community-chat.md:18-29`, `src/server.js:194-203,276-278`; 커뮤니티 출시 계획에서 상태를 먼저 정합화해야 한다.
- 2026-08 공개 밈 자료는 변형하기 쉬운 문장형 밈과 오타형 밈(`OO이지만 또 가고 싶은 OO입니다`, `노력이 숲으로 돌아갔다`, `눈 가리고 야옹`)을 현재 확산 사례로 설명한다: https://www.careet.net/1968.
- `책없쾌`는 2026-07~08 공개 트렌드 자료에서 `책임 없는 쾌락`의 줄임말로 설명되고 스포츠 팬 맥락 사용도 관찰된다. 원문을 복제하지 않고 귀여운 별칭으로만 변형한다: https://www.careet.net/1945, https://www.careet.net/1970.
- `ㄱㅂㅈㄱ`/`가보자고`는 이미 널리 알려진 짧은 격려형 표현이라 `가보자고 쿼카`처럼 공격성 없이 쓸 수 있다. 반면 연예인·팬덤 의존 밈, 가사·긴 인용, 상표, 정치·성적·혐오·공격 표현은 팩에서 제외한다.
- 공개 웹에서 DCinside의 정확한 `우수댓글` 제품 계약은 확인되지 않았다. 따라서 DC의 브랜드·색·동작을 복제한다고 주장하지 않고, 국내 게시판의 촘촘한 메타데이터와 상세 anchor 문법만 빌려 AthleteTime의 양수형 대표 댓글을 독자 설계한다: https://www.dcinside.com/company.

## Decisions (with rationale)

- 제품 중심을 기록 포털에서 익명 대화 중심으로 바꾸는 사용자 결정을 새 owner decision으로 기록하고, 관련 오래된 포지셔닝/내비 계약을 함께 갱신한다.
- “절대 익명”은 사용하지 않는다. 대신 공개·일반 운영 화면에서 계정/선수 기록을 연결하지 않는다는 검증 가능한 약속을 전면에 둔다.
- 작성 권한은 브라우저가 보낸 ID가 아니라 확인된 서버 세션에서 파생한다. `HMAC(별도 커뮤니티 비밀키, userId)` 형태의 행위자 키만 콘텐츠 영역에서 사용하고 원계정 매핑 테이블을 만들지 않는다. 공개 DTO와 일반 모더레이션 큐에는 원계정 ID, 세션, IP, 행위자 키를 포함하지 않는다.
- 일반 운영자와 인프라/보안 권한을 분리한다. 일반 운영자는 신고 대상·사유·콘텐츠·조치 이력만 보고 작성자 계정이나 네트워크 정보를 조회할 수 없다. 인프라 비밀 접근은 별도 감사 대상이다.
- 익명 표시값은 게시글 범위를 넘지 않는 서버 파생 별칭으로 만든다. 전체 서비스에서 고정되는 닉네임/브라우저 ID는 만들지 않는다. 같은 글 안에서는 같은 사람이 같은 별칭을 받고 다른 글에서는 바뀐다.
- 별칭은 전체 문구가 검수된 고정 allowlist를 쓴다. 최소 24개 기본 동물·음식 별칭과 최소 8개 버전형 `2026-08` 안전 밈 별칭을 HMAC bucket 80:20으로 새 배정에만 사용한다. 예: `느긋한 카피바라`, `바삭한 맛탕`, `책없쾌 카피바라`, `또 뛰고 싶은 수달`, `노력이 숲으로 간 고양이`, `눈 가리고 야옹`, `가보자고 쿼카`. 기존 thread alias row는 팩 갱신 후에도 바꾸지 않는다. 원격 자동 수집·런타임 AI 생성·스케줄러는 만들지 않고 정상 코드리뷰로만 갱신한다. 상표·정치·비하·성적·혐오·연예인/팬덤·가사/인용·공격적 유행어·신원 암시 단어는 제외하고, 목록이 부족하면 숫자 접미사만 붙인다.
- 작성 전에는 실명·소속·학년·정확한 기록·대회 세부를 함께 적으면 본인이 드러날 수 있음을 짧게 경고한다. 이 경고는 기술적 익명성을 과장하지 않는 핵심 UX다.
- 익명 신뢰 패널에서 `다른 이용자가 보는 정보`, `일반 운영자가 보는 정보`, `보안 목적으로 제한 보관되는 정보`를 표로 공개한다.
- 보안·법적 대응 정보는 콘텐츠 DB와 역할을 분리하고, 최소 수집·짧은 보존·접근 감사·자동 파기를 전제로 한다. 정확한 필드와 기간은 owner 승인 항목이다.
- 초기에는 단일 피드에 태그만 둔다. 활성 글/댓글 밀도가 측정되기 전에는 게시판을 쪼개지 않는다.
- 피드 정렬은 `최신`과 `지금 대화 중`만 둔다. 후자는 최근 댓글 시각으로만 계산하고 사용자 점수·평판·복잡한 추천 알고리즘을 만들지 않는다.
- 댓글 참여는 양수형 `공감` 하나만 둔다. 자기 댓글 공감은 거부하고 회원별 댓글 1개 unique constraint로 토글한다. 게시물별 `우수댓글`은 작성자 제외 2명 이상의 공감을 받은 공개 댓글 중 공감 수 DESC, 임계치 도달 시각·댓글 시각·ID ASC로 최대 2개를 고른다. 자격 댓글이 없으면 `최근 댓글` 1개만 표시하고 우수댓글이라 부르지 않는다.
- 피드 카드의 대표 댓글은 별칭·최대 2줄 본문·공감 수를 게시물 바로 아래 보여 상세 `#comment-<id>`로 연결한다. 상세 진입 시 해당 댓글로 스크롤·focus하며 held/deleted/reported-hidden 댓글은 즉시 대표 영역에서 제외한다. 공감은 게시물 정렬, 검색 순위, 사용자 점수, 전역 karma에 쓰지 않는다.
- DCinside 스타일은 촘촘한 정보 구조와 게시물→댓글 직접 연결만 참고한다. 색·브랜드·카피를 복제하지 않고 AthleteTime의 warm off-white/deep teal/hairline/square-first 토큰으로 `CommunityThreadRow`, `CommentPreview`, `AliasLabel`, `ReactionButton`, `HighlightedComment`를 `DESIGN.md`에 먼저 고정한다.
- 공개 홈에는 운영 정보와 익명 게시판의 주제/활동 상태만 노출한다. 익명 대화 본문·댓글은 회원 경계 안에 두고 검색엔진 색인 대상에서 제외한다.
- 재방문 루프는 공개 프로필이나 활동 이력이 아니라 `내가 참여한 글`과 새 답글 표시로 만든다. 다른 사람은 작성자의 다른 글을 따라갈 수 없다.
- 신고 즉시 신고자 화면에서는 대상이 숨겨진다. 전체 자동 블라인드는 고정 `3명` 규칙을 재사용하지 않고, 개인정보 직접 노출 같은 명확한 위험만 서버 규칙으로 보류하며 나머지는 사람 검토를 거친다.
- 정보성 글은 사용자 글과 시각적으로 구분되는 `운영 정보` 유형으로, Content Studio의 사실 잠금·출처·권리 확인을 거쳐 사람이 발행한다.
- AI는 초안 도구일 뿐 자동 게시하거나 익명 사용자처럼 행동하지 않는다.
- 운영 정보와 익명 글은 카드 라벨·작성 경로·API 유형을 분리한다. 운영 정보는 익명 대화처럼 보이거나 인기글 점수에 섞이지 않는다.
- 헤드라인 기본안은 `육상에서만 통하는 이야기, 기록과 소속은 숨기고 솔직하게.`로 한다. 보조문구는 `게시글에는 계정·선수 기록·학교·팀 정보가 붙지 않아요. 댓글 이름도 글마다 새로 바뀝니다.`로 한다.
- 채팅은 이번 범위에서 열지 않는다. 현재 코드/문서 상태 불일치만 해소하고 별도 안전 검토 전까지 독립 기능으로 둔다.

## Scope IN

- 새 owner decision, 익명성/보존/운영 정책, 사용자 노출 문구
- 익명 게시글·댓글·글별 번호·신고·차단·검색
- 양수형 댓글 공감, 게시물별 우수댓글 최대 2개/최근 댓글 fallback, 상세 anchor/focus
- 기본 80%·수동 검수 밈 20%의 버전형 글별 별칭 팩
- 초대/확인 회원 경계와 익명 대화 본문 접근 통제
- 공개/일반 운영 API에서 계정·선수 기록·네트워크 식별자 제거
- 서버 세션·CSRF·rate limit·서버 파생 권한
- `/` 메인 피드, `/community` 별칭, 상세/작성/규칙 화면
- 커뮤니티를 데스크톱·모바일 1차 내비로 승격
- 운영 정보 카드와 기록→토론 맥락 연결
- 익명 신뢰 패널, 작성 전 신원 추정 위험 경고, 내 참여 글/새 답글 표시
- 운영자 신고 큐·임시 숨김·복구·제재·감사
- 기능 중지 스위치와 준비 화면 rollback
- 단위/계약/브라우저/접근성/보안/보존 검증

## Scope OUT (Must NOT have)

- “관리자도 모르는 절대 익명” 또는 법적 안전 보장 문구
- 브라우저 제공 `anonymousId`, 작성자, reporter key를 권한 원천으로 사용
- 게시글과 공개 선수 기록/계정의 자동 연결
- AI 자동 게시·가짜 사용자·댓글 봇
- 초기 이미지/파일 업로드, 설문, 비추천, 게시물 인기 승격, 전역 베스트/karma, 다중 게시판, DM, 알림, 실시간 채팅
- 신규 외부 분석 SDK나 행동 추적 도구
- 익명 대화 본문을 비회원 API·검색엔진·공개 RSS에 노출
- 공개 프로필, 작성자별 글 목록, 팔로우, 전역 고정 닉네임, 사용자 평판 점수
- 실사용 출시 전 미성년자·보존·모더레이션 결정 생략

## Open questions

Resolved by owner approval: truthful anonymity copy, `공개 운영 정보 + 초대·확인 회원 전용 익명 대화` pilot, separate safety/retention/minor policy gate, cute thread-scoped animal/food aliases, manual current-meme diversification, and feed-linked positive-only featured comments.

## Approval gate
status: approved
Approved by owner on 2026-08-21 with cute thread-scoped animal/food aliases, manually reviewed current memes, and feed-linked featured comments.
Approval authorizes creation of `.omo/plans/athletetime-anonymous-community-main.md` only. It does not authorize implementation, database migration, deployment, or public release.
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
