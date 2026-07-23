# AthleteTime 커뮤니티 매거진 C단계 승인 패키지

작성일: 2026-07-23

브랜치: `codex/editorial-ops-verification`

검증 대상 코드 커밋:
`b2d4a272262bdb615e21217d308e3d478c70ffc3`

이 문서를 고정하는 다음 커밋은 증거만 변경하며 위 코드 커밋의 제품 파일을
바꾸지 않는다.

## 검증 증거 SHA-256

| 증거 | SHA-256 |
|---|---|
| `embedded-postgres-tests.txt` | `7cb9a142b4a321341360677c44167ba4ef539fca3d42c28c50b2131419d1155b` |
| `clone-rehearsal-agent.md` | `5ec0b97e3528c9f28a01005a25803b9f123616d2724e60f6721c1140282327f1` |
| `verification-receipt.md` | `dbc48b05fd5c48348c8baca17dc87cd35534bfba896aa3a8c5387eee23f0b4d9` |
| `independent-reviews.md` | `e309f7240d7a0af1c9bd0e00bec66f38764bd5e6b37bb551f3222cfc5cbec2e7` |

## 한눈에 보는 결론

- 공개 매거진 정보와 일반 게시글의 경계: 승인 가능
- 예약 발행의 경쟁·장애·재시작 안전성: 승인 가능
- 격리된 게시글의 공개 차단과 복원: disposable clone에서 승인 가능
- 운영 데이터베이스에서 실제 격리 실행: 보류
- 운영 예약 발행 기능 켜기: 보류

보류 두 건은 기능 실패가 아니다. 실제 운영 write를 시작하기 전에 페이블이
백업과 대상, 실행 시각을 명시적으로 승인하도록 둔 안전 게이트다.

## 이번 단계에서 바뀐 것

1. 관리자 발행 원장
   - `queued`, `retrying`, `failed`, `completed` 상태를 한 화면에서 확인한다.
   - 시도 횟수와 다음 시도 시각을 표시한다.
   - raw error, actor UUID, 비밀번호, 토큰은 API와 화면에서 제외한다.

2. 격리 게시글 공개 차단
   - 활성 격리 게시글은 목록과 전체 개수에서 제외한다.
   - 주소를 직접 열거나 댓글·추천·투표를 시도해도 404로 응답한다.
   - 차단된 상세 요청은 조회수를 올리지 않고 댓글도 만들지 않는다.
   - 격리를 해제하면 목록과 상세 화면이 다시 정상 노출된다.
   - 공개 요청과 격리 write는 같은 트랜잭션 잠금을 사용해 검사와 실제 처리
     사이의 경쟁 조건을 막는다.
   - 목록도 공용 잠금에 참여하고, 공개 처리 코드는 잠금을 가진 같은 DB 연결을
     재사용해 운영 pool 크기 20개의 동시 요청에서도 연결 고갈이 없다.
   - 복원 가능한 404는 캐시에 남지 않도록 `no-store`다.

3. 예약 발행 장애 검증
   - 작업자 10개가 예약 글 100개를 동시에 처리해도 중복과 유실이 없다.
   - 발행 도중 프로세스가 종료돼도 부분 글이 남지 않는다.
   - 재시작하면 미완료 작업이 정확히 한 번 발행된다.
   - 한국 시간과 명시적 해외 시간대 입력은 UTC로 결정적으로 저장된다.
   - 잘못된 관리자 식별자에서는 게시글 write가 0건이다.

4. 공개 해제 검증
   - 발행된 매거진을 공개 해제하면 목록에서 사라진다.
   - slug와 post 연결 주소는 404가 되고 응답은 `no-store`다.

## 자동 검증 결과

| 검증 | 결과 |
|---|---|
| 전체 저장소 테스트 | 423개, 389 pass, 0 fail, 34 조건부 skip |
| 커뮤니티 매거진 테스트 | 158개, 130 pass, 0 fail, 28 조건부 skip |
| embedded PostgreSQL 실검증 | 33 pass, 0 fail, 0 skip |
| 프론트 타입 검사 | pass |
| 프론트 production build | pass |
| 공개 번들 금지 문자열 검사 | 0건 |
| 공개 응답 금지 필드 검사 | 0건 |
| 독립 공개·보안 리뷰 | unconditional approval |
| 독립 scheduler 리뷰 | unconditional approval |

명령, 결과 집계, 독립 리뷰 원문 요약과 정리 영수증은
`.omo/evidence/community-magazine-tier3/verification-receipt.md`와
`.omo/evidence/community-magazine-tier3/independent-reviews.md`에 고정했다.
대용량 원시 TAP 로그는 저장소에 중복 보관하지 않는다.

전체 테스트의 병렬 실행에서는 서버 기동·브라우저 대기 시간 초과 4건이 한 번
발생했다. 같은 항목을 단독 실행하면 전부 통과했고, 전체 명령을 진짜 순차 실행한
결과도 실패 0이었다. 기능 회귀가 아니라 로컬 자원 경쟁으로 판정한다.

## 격리·복원 리허설

- 사용한 데이터: 운영 백업이 아닌 disposable fixture clone
- 승인 대상 ID: `[101]`
- 승인 밖 일반 게시글 ID: `102`
- 격리 후 활성 격리: 1건
- 복원 후 활성 격리: 0건
- 일반 게시글·댓글 변경: 0건
- post/content/comment/counter checksum: 격리 전·복원 후 동일
- actor, 승인 파일, 백업 receipt 중 하나가 없을 때: exit non-zero, write 0
- 운영 데이터베이스 연결: 0회
- scheduler 활성화: 0회

세부 checksum과 정리 영수증은
`.omo/evidence/community-magazine-tier3/clone-rehearsal-agent.md`에 있다.

## 배포 순서 중단 조건

격리 공개 경계는 `post_quarantines` 테이블을 조회한다. 따라서 운영 반영 순서는
반드시 아래와 같다.

1. 운영 백업을 만들고 SHA-256 receipt를 기록한다.
2. 운영과 격리된 clone에서 복원이 되는지 확인한다.
3. database migration 006부터 010까지 적용 여부를 확인한다.
4. `post_quarantines` 테이블과 필요한 index가 존재하는지 확인한다.
5. Render 백엔드를 먼저 배포하고 `/health`와 새 관리자 원장 API를 확인한다.
6. 그 다음 Netlify 프론트엔드를 배포한다.
7. 공개 목록·상세·댓글·추천·투표 smoke test를 한다.
8. scheduler flag는 계속 off로 둔다.

migration보다 애플리케이션을 먼저 배포하면 게시글 목록 API가 실패할 수 있다.
Netlify가 Render보다 먼저 배포되더라도 편집실은 404에서 기존 경고 API로
fallback하지만, 완전한 상태 원장은 백엔드 배포가 끝난 뒤에만 보인다. 이 순서가
지켜지지 않으면 즉시 배포를 중단한다.

## 페이블이 결정할 두 항목

### 1. 예약 발행 기능 활성화

필요한 승인:

- 운영 관리자 actor UUID
- 활성화 시각과 감시 담당자
- 첫 실행 대상 issue 목록
- 중단 기준과 rollback 담당자

승인 전 기본값: `EDITORIAL_SCHEDULER_ENABLED=false`

### 2. 운영 게시글 격리

필요한 승인:

- 복원 검증을 마친 운영 백업 clone
- 백업 SHA-256 receipt
- 제목 패턴이 아니라 명시적인 post ID allowlist
- 실행 actor UUID
- 격리 사유와 복원 책임자

승인 전 기본값: 실제 운영 격리 write 금지

## 남은 위험

1. 승인된 운영 백업 artifact가 없어 production-backup clone 왕복은 아직 실행하지
   않았다.
2. 현재 열려 있는 `localhost:4317`은 백엔드가 준비되지 않아 API 500을 반환했다.
   자동 실제 브라우저 E2E는 통과했지만, 운영과 같은 preview에서의 수동 console
   0 검증은 배포 preview가 생긴 뒤 다시 해야 한다.
3. 예약 발행을 켠 뒤의 실제 운영 부하와 알림 대응은 코드 검증만으로 완전히
   대신할 수 없다. 첫 활성화는 적은 대상과 담당자 감시 아래 진행한다.

## 페이블 권고

- 코드 병합: 승인 가능
- migration-first preview 배포: 승인 가능
- scheduler 운영 활성화: 별도 명시 승인 전 보류
- 운영 게시글 격리: production-backup clone 왕복과 ID allowlist 승인 전 보류
