# G004 권리 요청 영속화 실행 계약

상태: 구현 완료, PostgreSQL CI 검증 대기
기준 브랜치: `main` (`1e7df38`)
작업 브랜치: `codex/durable-rights-storage`
총괄 인계: PR #48
선행 신뢰 게이트: PR #49와 독립적으로 리뷰·머지

## 1. 왜 지금 바꾸는가

현재 정정·숨김·삭제 요청은 `data/requests/*.json`에 저장된다. 접수 번호는
`DR-연도-순번`이라 추측할 수 있고, 동시에 두 요청이 오면 같은 번호가 발급되거나
한쪽 저장이 사라질 수 있다. 요청 상태와 suppression 파일도 따로 써서 중간 장애 시
서로 다른 상태가 될 수 있다.

0건 검색 분석은 처음에는 해시만 저장하지만 같은 검색이 3일 관찰되면 검색어 원문을
영구 저장한다. 이름, 학교, 연락처 같은 문자열이 들어올 수 있으므로 이 동작은
즉시 폐기한다. 서비스 개선에는 정확한 검색어가 아니라 날짜·화면·문자 종류·길이
구간별 건수만 있으면 충분하다.

## 2. 결정 사항

1. 운영 저장소는 PostgreSQL 하나만 사용한다. 운영에서 DB가 없거나 준비되지 않으면
   요청 쓰기를 성공으로 응답하지 않는다.
2. 운영은 PostgreSQL만 사용한다. 기존 파일 저장소는 개발 호환성과 이관 입력에만 남기며,
   운영에서는 환경 검증이 파일 폴백을 차단한다.
3. 공개 티켓은 192비트 이상 난수로 만들고 DB에는 SHA-256 해시만 저장한다. 화면에는
   최초 접수 시 전체 티켓을 한 번 반환하고, 이후 조회는 제출된 티켓을 해시해 찾는다.
4. 요청 접수, 상태 이벤트, suppression 변경은 한 PostgreSQL 트랜잭션이다.
5. 상태 변경은 `expectedVersion` 낙관적 잠금을 요구한다. 같은 버전의 동시 변경은
   하나만 성공하고 나머지는 `409 Conflict`다.
6. 검색 suppression의 런타임 판정은 서버 시작 때 DB에서 채운 읽기 전용 메모리
   스냅샷을 사용한다. DB 로드 실패 시 운영 서버는 준비 완료 상태가 되지 않는다.
7. 기록 하나를 지정한 suppression은 `recordKey` 또는 `sourceId`를 우선 사용한다.
   선수 전체처럼 넓은 권리 요청은 `subject_tuple`, 기존 파일 이관 행만 `legacy_tuple`로
   구분해 같은 이름의 다른 선수나 다른 종목으로 범위가 번지지 않게 한다.
8. 0건 검색은 원문, 검색어별 fingerprint, IP, user-agent, userId를 저장하지 않는다.
   오직 날짜·화면·문자 종류·길이 구간의 합계만 저장한다.
9. 기존 JSON은 읽기 전용 1회 이관 입력이다. 이관 성공 후에도 자동 삭제하지 않고,
   체크섬·건수 검증과 운영자 승인 뒤 별도 보관 정책으로 처리한다.
10. 운영 반영은 스키마 적용, dry-run, 이관, shadow 검증, 애플리케이션 배포 순서다.
    구버전 애플리케이션으로 단순 롤백해 새 요청을 파일로 되돌리지 않는다.

## 3. 목표 스키마

### `data_requests`

- 내부 `id UUID PRIMARY KEY`
- `public_ticket_hash BYTEA UNIQUE NOT NULL`, `ticket_hint VARCHAR(8)`
- `request_type`, `status`, `version`
- 최소 대상 정보: `athlete_name`, `affiliation`, `competition`, `event`
- `reason`은 관리자 상세에서만 조회
- `contact_ciphertext`, `contact_iv`, `contact_tag`, `contact_key_version`
- `created_at`, `updated_at`, `closed_at`, `contact_purge_at`

연락처 암호화 키가 준비되지 않은 운영 환경에서는 연락처가 포함된 접수를 성공으로
저장하지 않는다. 키는 DB나 Git에 두지 않는다. 종료 요청 연락처의 기본 파기 예정일은
90일이며 최종 기간은 법률 검토 후 확정한다.

### `data_request_events`

- `id BIGSERIAL`, `request_id UUID`
- `actor_user_id`, `from_status`, `to_status`, `note`
- `request_version`, `created_at`
- 요청 생성부터 모든 상태 변경을 append-only로 기록

### `record_suppressions`

- `id UUID`, `request_id UUID`, `mode`, `active`, `version`
- 우선 식별자: `record_key`, `source_id`
- 주체 범위: `legacy_athlete_name`, `legacy_affiliation`, `legacy_competition`,
  `legacy_event`, 신규 넓은 요청은 `scope_kind='subject_tuple'`, 이관 행은 `legacy_tuple`
- `started_at`, `ended_at`
- 요청별 활성 suppression은 하나만 허용

### `search_metric_daily`

- 복합키: `metric_date`, `surface`, `query_script`, `query_length_bucket`
- `count BIGINT`
- 허용 값은 고정 enum/check constraint
- 검색어별 ID, 해시, 원문, 사용자·네트워크 정보 컬럼은 만들지 않음

### `data_rights_import_runs`

- `source_kind`, `source_checksum`, `started_at`, `completed_at`
- 원본·승격 건수, 오류 요약
- `(source_kind, source_checksum)` 고유 제약으로 재실행 중복 방지

## 4. 코드 경계

| 영역 | 파일 | 변경 계약 |
|---|---|---|
| 스키마 | `backend/database/migration-004-data-rights.sql` | 재실행 가능한 DDL, 제약·인덱스 포함 |
| 마이그레이션 실행 | `backend/database/run-migrations.js` | 정렬 실행, 적용 이력, 실패 즉시 중단 |
| 저장소 | `card-studio/repositories/dataRightsRepository.js` | PostgreSQL 트랜잭션과 메모리 테스트 구현 분리 |
| 요청 서비스 | `card-studio/services/dataRequestService.js` | 비동기 쓰기·조회, 불투명 티켓, 버전 경합, 동기 suppression 스냅샷 |
| 검색 지표 | `card-studio/services/zeroResultSearchService.js` | 검색어를 분류 후 즉시 버리고 일별 합계만 upsert |
| 공개 라우트 | `card-studio/routes/publicRoutes.js` | async/await, 503/409 의미 보존, 공개 상태 최소 응답 |
| 관리자 라우트 | `card-studio/routes/adminRoutes.js` | 목록 PII 최소화, 상세 분리, actor와 expectedVersion 전달 |
| 서버 생명주기 | `src/server.js` | listen 전 migration 상태·suppression hydrate 확인 |
| 이관 도구 | `tools/migrate-data-rights-files.js` | dry-run 기본, checksum idempotency, 원본 미삭제 |
| 프론트 계약 | `frontend/src/api/dataRequests.ts` | version/409 처리, 관리자 목록·상세 분리 |
| 관리자 화면 | `frontend/src/pages/admin/AdminDataRequestsPage.tsx` | 충돌 새로고침 안내, 민감 상세 명시적 열기 |

`recordAnalyticsService`, `searchService`, `insightService`, 결과 라우트는 각자 DB를 읽지
않는다. 모두 `dataRequestService.checkSuppression()`이라는 같은 스냅샷 판정만 사용한다.

## 5. 구현 순서와 병렬 작업

| 작업 | 선행 | 막는 작업 | 병렬 가능 |
|---|---|---|---|
| T1 기존 동작 characterization + 실패 테스트 | 없음 | T2, T3, T4 | T5 |
| T2 migration-004 + migration runner | T1 | T3, T6 | T5 |
| T3 repository + 트랜잭션 + 불투명 티켓 | T2 | T4, T6 | 없음 |
| T4 요청 서비스·라우트·suppression hydrate | T3 | T7 | T5 |
| T5 원문 없는 일별 검색 지표 | T1 | T7 | T2, T3, T4 |
| T6 JSON dry-run/import/verify 도구 | T2, T3 | T7 | 프론트 계약 |
| T7 HTTP·DB 통합 QA, 전체 회귀, PR | T4, T5, T6 | 배포 승인 | 없음 |

Critical path: `T1 -> T2 -> T3 -> T4 -> T7`.

작업자는 서로 같은 파일을 동시에 수정하지 않는다. 데이터 파일과 원본 기록은 어떤
작업에서도 수정하지 않는다.

## 6. TDD 완료 조건

### 생애주기와 재시작

1. 격리 PostgreSQL에 migration-004를 두 번 실행한다.
2. 요청 접수 후 티켓이 `DR-YYYY-NNNN` 형식이 아니며 DB에 원문 티켓이 없음을 확인한다.
3. 서버를 종료·재시작해 같은 티켓 상태가 조회되는지 확인한다.
4. 공개 조회 응답에 `reason`, `contact`, 선수 상세정보가 없는지 확인한다.
5. 검토중, 검색숨김, 유지복구를 수행하고 이벤트 수와 suppression 상태를 대조한다.

### 경합과 장애

1. 50개 동시 POST 결과가 50개의 서로 다른 티켓이고 DB도 50행이어야 한다.
2. 같은 `expectedVersion`으로 두 PATCH를 동시에 보내면 하나는 200, 하나는 409다.
3. DB 연결을 차단하면 권리 요청 쓰기는 `503`과 재시도 가능 응답을 주며 행은 늘지 않는다.
4. DB 복구 뒤 서버가 suppression 스냅샷을 다시 채우기 전에는 ready를 반환하지 않는다.

### 개인정보와 회귀

1. 이름·이메일·전화번호 형태의 0건 검색을 반복한 뒤 DB, 로그, API 응답에서 정확한
   문자열과 검색어별 해시를 검색해 0건이어야 한다.
2. 같은 suppression을 검색, 선수 상세, 시즌 기록표, 대회 결과, 인사이트에서 확인해
   모두 같은 판정이어야 한다.
3. JSON 이관을 두 번 실행해 두 번째 승격 건수가 0이고 첫 실행과 DB 건수가 같아야 한다.
4. 기존 zero-result JSON의 `rawQuery`와 `fingerprint`는 이관하지 않는다.
5. 전체 테스트, 프론트 타입·빌드, `git diff --check`가 통과하고 `data/results` 변경은 0이다.

증거 파일은 ULW 기준대로 다음 세 개를 사용한다.

- `.omo/ulw-loop/evidence/g004-lifecycle-restart.txt`
- `.omo/ulw-loop/evidence/g004-concurrency-privacy.txt`
- `.omo/ulw-loop/evidence/g004-migration-regression.txt`

### PostgreSQL 통합 테스트 환경

현재 Codex PC에는 Docker, `psql`, PostgreSQL 서비스, `TEST_DATABASE_URL`이 없다.
운영 `DATABASE_URL`을 테스트에 재사용하지 않는다. 기본 통합 검증 환경은 GitHub Actions의
작업별 PostgreSQL service container로 고정한다.

다음 작업자가 추가할 workflow의 필수 계약은 아래와 같다.

- PostgreSQL 버전은 운영과 같은 major version으로 고정하고 `latest`를 사용하지 않는다.
- 서비스 DB·사용자·비밀번호는 해당 CI job에서만 쓰는 임시 값으로 생성한다.
- 애플리케이션에는 `TEST_DATABASE_URL`만 전달하고 `DATABASE_URL`은 전달하지 않는다.
- health check가 통과하기 전에는 migration이나 테스트를 시작하지 않는다.
- migration-004를 두 번 실행해 두 번째 실행이 no-op인지 확인한다.
- 각 테스트 파일 또는 시나리오마다 스키마를 초기화해 병렬 job 간 상태를 공유하지 않는다.
- 로그에 연결 문자열이나 비밀번호를 출력하지 않는다.
- 실패 시에도 컨테이너는 job 종료와 함께 폐기되며 DB dump를 artifact로 올리지 않는다.
- artifact에는 허용된 SQL 건수·HTTP 상태·금지 문자열 스캔 결과만 포함한다.

로컬 검증이 필요하면 운영과 분리된 임시 PostgreSQL을 설치하거나 제공받아 같은
`TEST_DATABASE_URL` 계약을 사용한다. 메모리 repository 테스트는 빠른 단위 검증용일 뿐,
재시작·동시성·트랜잭션 완료 증거로 인정하지 않는다.

## 7. 배포·롤백

1. 운영 DB 백업과 현재 JSON 체크섬·건수를 기록한다.
2. migration-004를 적용하고 schema-only 검증한다.
3. 이관 도구를 dry-run으로 실행하고 운영자가 건수·상태 분포를 승인한다.
4. 실제 이관 후 shadow suppression 조회를 현행 파일 판정과 비교한다.
5. 새 서버를 배포하고 readiness가 DB·suppression 준비를 확인한 뒤 트래픽을 연다.
6. 오류 시 새 쓰기를 503으로 닫고 DB 백업을 보존한다. 이전 파일 쓰기 코드로 자동
   폴백하지 않는다.
7. 연락처 암호화 키, DB URL, 백업 접근권한은 저장소와 로그에 남기지 않는다.
8. 기존 순차형 티켓 이관·조회에는 32자 이상의 `DATA_RIGHTS_LEGACY_TICKET_PEPPER`가
   필요하며 dry-run부터 같은 키를 사용한다. 키가 없으면 이관과 기존 티켓 조회를 중단한다.

DDL은 파괴적 `DROP`을 포함하지 않는다. 코드 롤백이 필요해도 테이블과 이벤트 이력은
보존한다. 이관 전 JSON은 검증 완료 전까지 읽기 전용 증거로 유지한다.

## 8. 페이블 최종 검수 체크리스트

- 공개 티켓이 추측 불가능하고 공개 상태 응답이 최소정보인지
- “검색숨김”, “검토중”, “삭제”, “유지복구” 카피와 실제 노출이 일치하는지
- 관리자 목록이 연락처·긴 사유를 기본 노출하지 않는지
- 미성년 선수 또는 보호자 요청을 같은 절차로 접수하되 과도한 증명을 요구하지 않는지
- DB 장애 때 “접수 완료”를 가장하지 않는지
- 검색 원문을 저장하지 않는다는 고지가 실제 DB·로그 검증과 일치하는지
- 운영 보관기간 3년/90일은 법률 검토 전 잠정값으로 표시됐는지

## 9. 현재 구현 상태와 다음 승인 단계

2026-07-14 기준 `T1`부터 `T6`까지 구현했고 로컬 단위·회귀·프론트 빌드 검증을 통과했다.
불투명 공개 티켓, PostgreSQL 트랜잭션, 낙관적 잠금, suppression 시작 시 hydrate,
원문 없는 0건 검색 집계, JSON dry-run 이관 도구와 PostgreSQL 전용 CI workflow가 포함됐다.

로컬 PC에는 격리 PostgreSQL이 없어 실제 DB 생애주기 검증은 GitHub Actions의 PostgreSQL
16.4 service container에서 수행한다. 따라서 workflow가 통과하기 전에는 G004 운영 배포를
승인하거나 완료로 표시하지 않는다. CI 통과 뒤 페이블은 §8 체크리스트와 PR 증거를 검토하고,
운영 배포는 §7 순서에 따라 별도 승인한다.

다른 멈춘 작업은 이 PR에 섞지 않는다. 담당·선행·금지사항은 PR #48을 따른다.
