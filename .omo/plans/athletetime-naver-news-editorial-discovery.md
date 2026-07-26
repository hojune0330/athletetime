# AthleteTime 뉴스 발견함: NAVER API HUB 연동 실행 계획

## 한눈에 보기

> **목표**: NAVER API HUB 뉴스 검색을 이용해 그날의 육상 소식 후보를 적은 비용으로 모으고, 편집자가 원출처를 다시 확인한 뒤 기존 매거진 편성·검수·발행 절차로 넘길 수 있게 한다.
>
> **제품 원칙**: 네이버 검색 결과는 `발행 근거`가 아니라 `찾아볼 후보`다. 기사 본문·요약문은 저장하지 않고, 자동 초안·자동 승인·자동 발행은 하지 않는다.
>
> **운영 원칙**: 첫 2주는 관리자가 직접 실행하는 수동 수집만 허용한다. 안정성·중복률·편집 효율을 확인한 뒤 별도 승인으로 하루 1회 예약 수집을 켠다.
>
> **모델 배치**: 공개 범위, 출처 정책, DB 상태, 동시성, 개인정보·미성년자 예외는 GPT-5.6 Sol이 결정·검수한다. 계약이 고정된 API 연결, CRUD, UI, fixture, 반복 QA는 GPT-5.6 Terra medium이 수행한다.

## 작업 시작 때마다 먼저 읽을 남은 과제

네이버 뉴스 작업이 아래 선행 과제를 가리면 안 된다. 모든 Sol/Terra 작업 지시 첫머리에 이 표를 그대로 붙인다.

| 우선순위 | 남은 과제 | 이번 작업과의 관계 |
|---|---|---|
| P0 | 루트 의존성 취약점 `moderate 7 / high 5`, 프론트 `moderate 2 / high 9 / critical 1` 재검증 및 별도 보안 PR | 공개 배포 전 차단 과제. 특히 직접 의존성 `jspdf` 조치 여부를 확정한다. |
| P0 | PR #52 → #53 → #54 순차 검수·병합 | 뉴스 발견함은 이 매거진 편집 기반 위에 별도 후속 PR로 올린다. |
| P0 | 운영 백업·복제 복원, migration 006~010 적용, Render 먼저 배포, Netlify 후 배포, 라이브 스모크 | 신규 migration 011 적용 전에 반드시 끝낸다. |
| P1 | 첫 실제 매거진 3편 편성·검수·발행 | 뉴스 발견함의 실제 가치 검증 대상이다. |
| P1 | 기록 데이터 범위 고지: 현재 2015~2026, 239개 대회, 94,195행이며 일부 연도 불완전 | 뉴스 문맥과 기록 데이터 완전성을 혼동하지 않게 한다. |
| P1 | 인증 문서의 오래된 localStorage 설명 교정 | 운영 문서 신뢰성 정리 과제다. |
| P1 | stale PR #5, #8 정리 | 병합 전 저장소 상태를 단순화한다. |
| Gate A 이후 | 주간 알림·다이제스트(Task 9), 지표 대시보드(Task 12), 제한적 AI 초안 | 이번 계획에 포함하지 않는다. 4주 Gate A 전에 구현·활성화하지 않는다. |

## 공식 연동 기준

- 신규 연동은 기존 NAVER Developers 검색 API가 아니라 **NAVER API HUB**를 기준으로 한다. 기존 개발자센터 신규 신청은 2026-07-31부터 중단되고 기존 키는 2027-06-30까지만 지원된다.
- 뉴스 검색 주소는 `GET https://naverapihub.apigw.ntruss.com/search/v1/news`다.
- 인증 헤더는 `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY`다. 브라우저에 키를 전달하지 않고 서버에서만 호출한다.
- `query`, `display`, `start`, `sort`만 허용 목록으로 조립한다. 운영 기본은 `sort=date`, `display=100`이다.
- 응답의 `description`과 기사 본문은 사용·저장하지 않는다. `title`의 `<b>` 태그와 HTML entity를 제거한 일반 텍스트만 후보 제목으로 쓴다.
- `originallink`가 있으면 원문 링크, `link`는 네이버 검색 링크로 취급한다. 화면에서 언론사명을 추측하지 않고 원문 URL의 hostname을 `원문 도메인`으로만 표시한다.
- NAVER 명칭·BI가 AthleteTime과 제휴 또는 보증 관계로 보이게 사용하지 않는다. 공개 서비스 이름에도 NAVER를 붙이지 않는다.

공식 근거:

- [검색 API 이전 공지](https://developers.naver.com/notice/article/32530)
- [NAVER API HUB 뉴스 검색 명세](https://api.ncloud-docs.com/docs/naver-api-hub-search-news)
- [검색 API 이전 가이드](https://guide.ncloud-docs.com/docs/apihub-migration)
- [API HUB 이용 한도·비용 관리](https://guide.ncloud-docs.com/docs/apihub-overview)
- [NAVER API HUB 브랜드 가이드](https://guide.ncloud-docs.com/docs/apihub-brandguide)

## 현재 코드와의 결합 원칙

- `card-studio/services/editorialCandidateService.js:7`의 자동 후보 경계는 그대로 유지한다.
- `card-studio/services/editorialCandidateService.js:143`의 `generateEditorialCandidates()`에 뉴스 종류를 추가하지 않는다.
- `card-studio/services/editorialSourcePolicy.js:10`과 `card-studio/editorialPolicy.js:45`의 1차 출처 발행 규칙을 완화하지 않는다.
- 네이버 발견 결과를 `editorial_sources`에 바로 넣지 않는다. 별도 `editorial_news_discoveries`에 보관한다.
- 편집자가 원출처를 확인해 `confirmed_source_url`을 등록한 뒤에만 기존 calendar/issue 흐름으로 넘긴다.
- 확인된 출처가 2차 출처뿐이면 편성 후보로는 쓸 수 있지만 발행 승인은 계속 막힌다. 공식·1차·AthleteTime 근거가 추가되어야 기존 정책 게이트를 통과한다.
- `backend/database/migration-006-community-editorial.sql:1`의 calendar는 대회 연결 없이도 만들 수 있으므로 뉴스 후보를 수동 section에 편성할 수 있다.
- 공개 API와 공개 화면에는 발견함, 검색 질의, 검토 메모, 운영자 ID가 노출되지 않는다.

## 확정 데이터 계약

### `editorial_news_runs`

신규 `migration-011-editorial-news-discovery.sql`에 다음 원장을 둔다.

- `id UUID PRIMARY KEY`
- `run_date_kst DATE NOT NULL`
- `profile_version VARCHAR(40) NOT NULL`
- `trigger VARCHAR(12) CHECK (trigger IN ('manual','scheduled'))`
- `status VARCHAR(12) CHECK (status IN ('running','completed','failed'))`
- `started_at`, `completed_at`
- `api_call_count`, `result_count`, `inserted_count`, `duplicate_count`, `irrelevant_count`
- `safe_error_code VARCHAR(60)`; 원문 오류, 헤더, 키, URL query string은 저장하지 않는다.
- `actor_user_id UUID NULL`; 예약 실행은 null, 수동 실행은 관리자 ID를 기록한다.
- `UNIQUE(run_date_kst, profile_version)`로 하루 중복 실행을 막는다.

한 번에 한 collector만 실행되도록 PostgreSQL advisory lock을 사용한다. 같은 날짜·프로필 재실행은 기존 완료 결과를 반환하는 idempotent 동작이어야 한다.

### `editorial_news_discoveries`

- `id UUID PRIMARY KEY`
- `canonical_url_hash CHAR(64) UNIQUE NOT NULL`
- `original_url TEXT NOT NULL`; HTTPS와 정상 URL만 허용한다.
- `naver_url TEXT NULL`; HTTPS와 정상 URL만 허용한다.
- `title VARCHAR(300) NOT NULL`; 태그 제거·entity decode·공백 정규화 후 저장한다.
- `published_at`, `first_seen_at`, `last_seen_at`
- `first_seen_run_id UUID REFERENCES editorial_news_runs(id)`
- `query_keys JSONB`; 사용자가 입력한 원문 query가 아니라 코드에 고정된 키만 저장한다.
- `relevance_score SMALLINT`, `relevance_tags JSONB`
- `subject_age_group VARCHAR(10) CHECK (... IN ('adult','minor','unknown'))`
- `status VARCHAR(20) CHECK (... IN ('discovered','reviewing','source_confirmed','calendar_linked','dismissed','expired'))`
- `reviewed_by`, `reviewed_at`, `review_note VARCHAR(1000)`; 관리자 전용이다.
- `confirmed_source_url TEXT NULL`
- `linked_calendar_id UUID NULL REFERENCES editorial_calendar(id)`

다음 값은 **절대 저장하지 않는다**.

- API `description`
- 기사 본문, 원문 HTML, 스크린샷
- raw API response
- 임의 사용자가 입력한 query
- cookie, 인증 헤더, API 키
- 선수에 대한 AI 평가·예측·민감정보 추론

### 중복 기준

1. 유효한 `originallink`를 URL 정규화한 값이 있으면 그것을 canonical URL로 쓴다.
2. 없으면 `link`를 정규화해 쓴다.
3. 추적 query·fragment, 기본 port, hostname 대소문자, 끝 slash 차이는 제거한다.
4. 정규 URL의 SHA-256을 `canonical_url_hash`로 저장한다.
5. URL이 다른 재전송 기사는 자동으로 같은 기사라고 단정하지 않는다. 제목+발행일 hash는 운영자에게 `유사 후보` 힌트만 주고 자동 병합하지 않는다.

## 검색 프로필과 호출 예산

사용자 입력을 API query로 전달하지 않는다. 코드에 버전이 붙은 고정 프로필만 둔다.

### v1 검색어

`core`

- `육상 선수`
- `육상 대회`
- `한국 육상`
- `전국육상경기대회`
- `대한육상연맹`
- `실업육상`

`international-and-seasonal`

- `세계육상선수권`
- `아시아육상선수권`
- `실내육상`
- `마라톤 선수`
- `경보 선수`

교통·도로 기사 오염이 큰 단독 `육상`은 사용하지 않는다. 실제 2주 운영에서 누락이 확인될 때만 Sol 검토를 거쳐 검색어를 추가한다.

### 초기 예산

- 수동 실행 1회, 검색어당 최대 2페이지
- 로컬 hard cap: 하루 40 calls, 월 800 calls
- 각 페이지는 `display=100`, `sort=date`
- 결과의 가장 오래된 `pubDate`가 실행일 KST 00:00보다 48시간 이상 전이면 해당 검색어 paging을 멈춘다.
- 월별 화면은 매일 저장한 metadata를 DB에서 집계한다. 월말에 API를 다시 대량 호출하지 않는다.
- 401/403/429는 재시도하지 않고 fail-closed한다.
- timeout/5xx만 jitter를 둔 1회 재시도를 허용하며, 재시도도 예산에 포함한다.
- 공식 한도보다 훨씬 낮게 시작한다. 서비스 비용 정책이 바뀌어도 budget gate가 먼저 막아야 한다.

## 보존과 삭제

- `dismissed`, `expired`: 90일 후 metadata 삭제
- `source_confirmed`, `calendar_linked`: 연결된 편집 감사 기록이 존재하는 동안 유지
- run 집계: 13개월 유지
- purge는 성공한 수동/예약 실행 뒤 한 번 수행하고, 별도 관리자 유지보수 명령으로도 재실행 가능하게 한다.
- 삭제는 발견 metadata만 대상으로 하며 기존 issue, source, post, audit event는 건드리지 않는다.

## 관리자 UX

기존 [AdminIssueEditorPage.tsx](C:\Users\SAMSUNG\Documents\2026 첫프젝\athletetime-pr50\frontend\src\pages\admin\AdminIssueEditorPage.tsx)에 `소식 발견함` 탭을 추가한다.

- 상단: `오늘 소식 가져오기` 수동 버튼, 마지막 실행 시각, 호출 수, 신규/중복/제외 수
- 범위: `오늘`, `이번 달`
- 필터: `새 후보`, `검토 중`, `출처 확인`, `편성됨`, `제외`
- 카드: 정제된 제목, 원문 도메인, 발행 시각, 검색 주제 태그, 미성년 가능성 경고
- 동작:
  - `검토 시작`
  - `원출처 확인 완료`: 확인 URL, 제목, 발행 주체, 출처 종류 입력 필수
  - `편성에 담기`: source_confirmed 이후에만 활성화
  - `제외`: 이유 필수
- `이번 달`은 날짜별·주제별 후보 수와 상태만 보여준다. 조회수·반응·전환을 다루는 Task 12 대시보드가 아니다.
- `원문 도메인`을 언론사 또는 공식 기관이라고 자동 표기하지 않는다.
- 모바일 390px에서도 제목·상태·핵심 버튼이 먼저 보이고 운영 메모는 접는다.

## 관리자 API

모든 route는 기존 관리자 인증·CSRF·감사 이벤트·`Cache-Control: no-store` 경계를 그대로 적용한다.

- `GET /api/admin/editorial/news-discoveries?range=today|month&status=&limit=&cursor=`
- `GET /api/admin/editorial/news-discoveries/runs`
- `POST /api/admin/editorial/news-discoveries/run`
- `POST /api/admin/editorial/news-discoveries/:id/start-review`
- `POST /api/admin/editorial/news-discoveries/:id/confirm-source`
- `POST /api/admin/editorial/news-discoveries/:id/link-calendar`
- `POST /api/admin/editorial/news-discoveries/:id/dismiss`

규칙:

- page size 최대 100, cursor pagination
- raw error, key, 검색 URL, 내부 stack을 응답하지 않는다.
- 상태 전이는 repository transaction에서 검증한다.
- `link-calendar`는 `source_confirmed`에서만 가능하다.
- calendar 연결 뒤에도 기존 issue source gate를 우회하지 못한다.

## 기능 플래그와 환경 변수

- `NAVER_NEWS_COLLECTOR_ENABLED=false` 기본
- `NAVER_API_HUB_KEY_ID`
- `NAVER_API_HUB_KEY`
- `NAVER_NEWS_DAILY_CALL_LIMIT=40`
- `NAVER_NEWS_MONTHLY_CALL_LIMIT=800`

키가 없거나 유효하지 않으면 서버 전체가 아니라 collector만 fail-closed한다. readiness에는 `disabled`, `credentials_missing`, `budget_exhausted`, `provider_error`처럼 안전한 상태 코드만 보여준다.

첫 2주에는 수동 route만 사용한다. 아래 조건을 모두 충족하고 소유자가 승인한 뒤에만 하루 1회 06:30 KST 예약 실행을 켠다.

- 14일 동안 credential 누출 0
- 중복 실행·중복 insert 0
- 관리자 확인 없이 calendar/issue/post 생성 0
- 하루 40, 월 800 호출 초과 0
- 육상 무관 후보 비율과 유효 후보 비율이 검수 보고서에 기록됨
- 원출처 확인에 걸린 중앙값과 실제 편성된 후보 수가 기록됨

놓친 날은 당일 한 번만 보충하며 48시간 이전 자동 backfill은 하지 않는다.

## 모델 배치

| 단계 | 담당 | 추론 강도 | 책임 | 파일 소유권 |
|---|---|---:|---|---|
| S1 | GPT-5.6 Sol | xhigh | ADR, 공개·출처 경계, DB 상태·제약, 호출·보존 정책 확정 | `docs/athletetime-naver-news-discovery-contract.md`, migration 011, contract tests |
| T1 | GPT-5.6 Terra | medium | API client, 고정 query profile, 정규화, fixture, 예산 계산 | 신규 `naverNews*` client/normalizer 파일과 unit tests |
| T2 | GPT-5.6 Terra | medium | repository/service/admin endpoints | 신규 discovery repository/service/routes와 integration tests |
| T3 | GPT-5.6 Terra | medium | 관리자 발견함 UI와 브라우저 QA | admin API client/types/components/page tests |
| S2 | GPT-5.6 Sol | xhigh | migration·동시성·인증·출처 우회·공개 누출 독립 검수 | 리뷰와 필요한 최소 보정만 |
| T4 | GPT-5.6 Terra | medium | runbook, disabled lifecycle, 운영 증거, 반복 QA | docs/runbook, env example, evidence |
| S3 | GPT-5.6 Sol | max | 전체 P0 및 2주 수동 pilot go/no-go 심사 | 최종 검수 문서와 PR 리뷰 |

### Terra 자동 중단·Sol 상향 조건

- migration, CHECK constraint, 상태 값 변경이 필요함
- 공개 API나 공개 페이지에 필드를 추가해야 함
- 기사 description/body/raw response를 저장해야 할 것처럼 보임
- 미성년자 실명·평가·민감정보를 새로 추론해야 함
- source_confirmed 없이 calendar/issue로 넘길 수 있음
- API 한도·보존기간·query profile을 바꿔야 함
- 운영 DB 쓰기, 실 API 키 사용, 기능 플래그 활성화가 필요함
- 두 동시 실행 결과가 한 번이라도 비결정적임

## 실행 전략

### 병렬 실행 파동

| Wave | 작업 | 병렬성 | 종료 게이트 |
|---|---|---|---|
| 1 | Task 1 | 단독 | ADR, migration 011, 공개·출처 경계 계약 고정 |
| 2 | Task 2, Task 5의 UI fixture 준비 | 제한 병렬 | Task 2 API/정규화 계약 통과. Task 5는 mock UI까지만 허용 |
| 3 | Task 3, Task 5의 API 연결 준비 | 제한 병렬 | repository/API 통합 테스트, UI error/empty state 완료 |
| 4 | Task 4 | 단독 | source_confirmed → calendar 연결과 기존 발행 게이트 검증 |
| 5 | Task 6 | 단독 독립 검수 | high/critical 0, 공개 누출 0 |
| 6 | Task 7 | 단독 | disabled 배포·수동 pilot 준비 |
| 7 | Task 8 | 단독 최종 승인 | 14일 수동 pilot 후 GO/REVISE/STOP 결정 |

같은 파일을 두 작업자가 동시에 수정하지 않는다. Task 5가 Task 3보다 먼저 시작될 때는 mock fixture와 신규 UI component만 소유하며, `AdminIssueEditorPage.tsx`와 실제 API client 연결은 Task 3 병합 뒤에 수행한다.

### 의존 관계

| 작업 | 선행 작업 | 차단하는 작업 |
|---|---|---|
| 1 | PR #52→#53→#54 기준선 확인 | 2, 3, 4, 5 |
| 2 | 1 | 3, 6 |
| 3 | 1, 2 | 4, 5, 6 |
| 4 | 1, 3 | 6 |
| 5 | 1, Task 3 API 계약; mock UI는 Task 1 뒤 가능 | 6 |
| 6 | 2, 3, 4, 5 | 7 |
| 7 | 6, P0 배포 선행 과제 | 8 |
| 8 | 14일 수동 pilot, 7 | 자동 실행 승인 여부 |

## TODOs

- [x] 1. Sol: 계약·DB·보안 경계를 먼저 고정
- [x] 2. Terra: NAVER API HUB client와 정규화기를 fixture-first로 구현
- [x] 3. Terra: repository, 수동 run, 관리자 상태 전이 구현
- [x] 4. Terra: 원출처 확인과 편성 연결
- [x] 5. Terra: 관리자 `소식 발견함` UI 구현
- [x] 6. Sol: 독립 보안·정책·동시성 검수
- [x] 7. Terra: 운영 runbook과 2주 수동 pilot 패키지
- [x] 8. Sol: 최종 go/no-go와 다음 단계 결정

## 실행 순서

### 1. Sol: 계약·DB·보안 경계를 먼저 고정

**병렬화**: 불가 | Wave 1 | 차단: 2, 3, 4, 5 | 선행: PR 기준선 확인

**참조**

- `card-studio/services/editorialCandidateService.js:7`
- `card-studio/services/editorialCandidateService.js:143`
- `card-studio/services/editorialSourcePolicy.js:10`
- `card-studio/editorialPolicy.js:45`
- `backend/database/migration-006-community-editorial.sql:1`
- `backend/database/migration-006-community-editorial.sql:68`

**할 일**

- 위 데이터 계약과 상태 전이를 ADR로 확정한다.
- migration 011 up/down과 constraint test를 먼저 작성한다.
- discovery와 existing source가 다른 보안 영역임을 계약 테스트로 잠근다.
- P0 선행 과제 상태를 PR 본문 첫 표에 기록한다.

**완료 조건**

- discovery 행이 `editorial_sources`에 직접 삽입되는 코드 경로가 0개다.
- `description`, raw response, credential이 schema와 DTO 어디에도 없다.
- migration up → down → up이 통과한다.
- public serializer에 discovery 관련 필드가 0개다.

**QA**

```text
Scenario: 저장 금지 필드 검사
  Tool: node:test + rg
  Steps: API fixture에 description, HTML, 키 표식을 넣고 ingest 결과와 DB row, 관리자 응답, log를 검색한다.
  Expected: title의 태그만 제거되어 저장되고 description·키 표식은 모든 산출물에서 0건이다.

Scenario: 출처 우회 차단
  Tool: PostgreSQL integration test
  Steps: discovered 상태의 후보로 calendar link와 issue approval을 각각 시도한다.
  Expected: 둘 다 409/정책 오류. source_confirmed 후 calendar link는 가능하지만 2차 출처만으로 issue approval은 계속 실패한다.
```

**커밋**: `feat(editorial): define news discovery trust boundary`

### 2. Terra: NAVER API HUB client와 정규화기를 fixture-first로 구현

**병렬화**: 제한적 가능 | Wave 2 | 차단: 3, 6 | 선행: 1

**참조**

- 공식 뉴스 검색 명세
- `backend/tests/community-editorial-candidates.test.js`
- `backend/tests/community-editorial-source-security.test.js`

**할 일**

- transport injection이 가능한 작은 서버 전용 client를 만든다.
- 고정 v1 query profile, paging stop, 일·월 예산 계산을 구현한다.
- title sanitize, URL normalize/hash, pubDate parse, deterministic relevance tag를 구현한다.
- 실제 네트워크 없이 fixture로 정상·오류 응답을 검증한다.

**완료 조건**

- 프론트 번들에 키 이름과 credential 값이 들어가지 않는다.
- 401/403/429는 0회 재시도, timeout/5xx는 최대 1회다.
- description이 parser 반환 타입에도 존재하지 않는다.
- 동일 URL 변형이 동일 hash가 되고 다른 원문 URL은 자동 합쳐지지 않는다.
- 하루 40·월 800에서 추가 호출이 fail-closed한다.

**QA**

```text
Scenario: 공급자 장애와 비밀정보 보호
  Tool: node --test backend/tests/naver-news-api-client.test.js
  Steps: 401, 403, 429, 500, timeout, malformed JSON, HTML title, description과 가짜 key fixture를 차례로 주입한다.
  Expected: 정책별 retry 횟수 일치, safe error code만 반환, log/throw/DTO에서 key와 description 0건.

Scenario: 중복 정규화
  Tool: node --test backend/tests/editorial-news-normalizer.test.js
  Steps: scheme case, 기본 port, utm query, fragment, 끝 slash가 다른 URL과 서로 다른 원문 URL을 처리한다.
  Expected: 전자는 같은 hash, 후자는 다른 hash. 제목 유사성만으로 자동 병합하지 않는다.
```

**커밋**: `feat(editorial): add bounded news discovery client`

### 3. Terra: repository, 수동 run, 관리자 상태 전이 구현

**병렬화**: Task 5 mock UI와 가능 | Wave 3 | 차단: 4, 5 실제 연결, 6 | 선행: 1, 2

**참조**

- `backend/routes/editorialAdmin.js:107`
- `card-studio/repositories/postgresEditorialRepository.js`
- `backend/tests/community-editorial-api-postgres.integration.test.js`
- `backend/tests/community-editorial-postgres-guards.integration.test.js`

**할 일**

- discovery/run repository와 service를 기존 editorial 구성 방식에 맞춰 추가한다.
- 관리자 route, CSRF, no-store, safe view, audit event를 연결한다.
- advisory lock, unique run, upsert, cursor pagination, purge를 구현한다.
- query 실행 중 일부 실패 시 run 전체 상태와 카운트를 결정적으로 기록한다.

**완료 조건**

- 같은 날짜·프로필을 2 worker가 동시에 실행해도 외부 호출과 run은 1개다.
- 재실행은 기존 완료 run을 반환하고 insert가 늘지 않는다.
- 상태 전이 역행과 잘못된 calendar link가 차단된다.
- 관리자 아닌 사용자와 CSRF 없는 mutation은 거부된다.
- review_note와 actor ID는 공개 응답으로 나가지 않는다.

**QA**

```text
Scenario: 2-worker 경쟁
  Tool: PostgreSQL integration test
  Steps: 같은 날짜/profile로 두 run 요청을 barrier 뒤 동시에 시작한다.
  Expected: provider 호출 묶음 1개, run row 1개, discovery 중복 0, 두 응답은 같은 run ID를 가리킨다.

Scenario: 관리자 경계
  Tool: API integration test
  Steps: 비로그인, 일반 회원, 관리자-CSRF 없음, 관리자-정상 요청으로 run과 dismiss를 호출한다.
  Expected: 앞의 세 요청은 401/403, 마지막만 성공. 모든 응답은 no-store이며 내부 stack이 없다.
```

**커밋**: `feat(editorial): persist admin-only news discoveries`

### 4. Terra: 원출처 확인과 편성 연결

**병렬화**: 불가 | Wave 4 | 차단: 6 | 선행: 1, 3

**참조**

- `backend/database/migration-006-community-editorial.sql:1`
- `backend/database/migration-006-community-editorial.sql:68`
- `backend/routes/editorialAdmin.js:111`
- `backend/routes/editorialAdmin.js:179`

**할 일**

- `confirm-source`에 URL, title, publisher, source kind validation을 추가한다.
- source_confirmed에서만 기존 calendar planned entry를 만들고 discovery에 연결한다.
- 같은 discovery의 이중 편성을 막는다.
- 이후 issue 생성·source 추가·approval은 기존 흐름을 그대로 사용한다.

**완료 조건**

- 네이버 발견 결과가 existing source로 자동 복사되지 않는다.
- 편집자가 입력한 확인 출처만 source 후보가 된다.
- secondary만 있는 issue의 승인은 기존 정책대로 실패한다.
- official/primary 근거와 모든 기존 checklist를 갖춘 경우만 승인 가능하다.

**QA**

```text
Scenario: 발견에서 발행까지의 안전한 연결
  Tool: PostgreSQL integration test
  Steps: 발견 → 검토 → secondary 확인 → calendar 연결 → issue 생성 → 승인 실패 → primary 추가 → 승인 성공 순으로 실행한다.
  Expected: 각 상태가 순서대로 기록되고 secondary 단계의 승인은 차단되며 primary 추가 후에만 기존 정책으로 승인된다.
```

**커밋**: `feat(editorial): connect verified news leads to calendar`

### 5. Terra: 관리자 `소식 발견함` UI 구현

**병렬화**: fixture·독립 component만 Task 2/3과 가능 | Wave 2~3 | 차단: 6 | 선행: 1, 실제 연결은 3

**참조**

- `frontend/src/pages/admin/AdminIssueEditorPage.tsx:273`
- `frontend/src/pages/admin/AdminIssueEditorPage.tsx:319`
- 기존 `frontend/src/api/editorialAdmin.ts`
- 기존 shadcn Tabs, Button, Input, Dialog

**할 일**

- 오늘/이번 달, 상태 필터, cursor pagination, run summary를 구현한다.
- 수동 실행, 검토, 원출처 확인, 편성, 제외 dialog를 만든다.
- provider 오류는 안전한 한국어 상태로 보여주고 재실행 가능 여부를 구분한다.
- 빈 상태·로딩·일부 실패·예산 소진·키 없음 상태를 모두 설계한다.

**완료 조건**

- 390x844와 1440x900에서 가로 스크롤 0이다.
- 제목과 상태가 운영 메모보다 먼저 보인다.
- source_confirmed 전 편성 버튼은 비활성이고 이유가 보인다.
- 외부 링크는 `rel="noopener noreferrer"`와 새 탭을 사용한다.
- 공개 페이지 번들과 route에 발견함 문구·API가 노출되지 않는다.

**QA**

```text
Scenario: 편집자의 오늘 소식 처리
  Tool: Playwright Chromium
  Steps: 관리자 로그인 → 오늘 소식 가져오기 → 후보 열기 → 원문 새 탭 확인 → 출처 확인 → 편성에 담기 → 캘린더 이동.
  Expected: 각 단계의 상태와 수치가 즉시 갱신되고 중복 클릭에도 중복 편성이 없으며 콘솔 오류 0이다.

Scenario: 모바일 운영
  Tool: Playwright, 390x844
  Steps: 오늘/이번 달 전환, 필터, 확인 dialog, 긴 제목, 오류 상태를 확인한다.
  Expected: 핵심 버튼 접근 가능, dialog 잘림 0, 가로 스크롤 0, 운영 메모는 접힌 상태다.
```

**커밋**: `feat(admin): add editorial news discovery inbox`

### 6. Sol: 독립 보안·정책·동시성 검수

**병렬화**: 불가 | Wave 5 | 차단: 7 | 선행: 2, 3, 4, 5

**참조**

- Task 1~5 전체 diff
- `card-studio/services/editorialSourcePolicy.js:44`
- `card-studio/editorialPolicy.js:13`
- `backend/routes/editorialAdmin.js:24`

**할 일**

- credential, SSRF, stored XSS, HTML entity, URL scheme, open redirect, query injection을 공격 관점에서 검토한다.
- 2-worker와 재시작, partial provider failure, DB rollback, purge 경쟁을 검증한다.
- discovery → source → calendar → issue 경계 우회 경로를 전수 조사한다.
- 미성년자 제목·선정적 표현은 자동 발행되지 않고 운영자 경고가 남는지 확인한다.

**완료 조건**

- high/critical finding 0이다.
- medium finding은 수정되거나 owner가 기한·담당과 함께 명시적으로 수용한다.
- 공개 API snapshot에 신규 내부 필드 0이다.
- Task 9/12 활성화 코드와 자동 초안·자동 발행 코드 0이다.

**QA**

```text
Scenario: 악성 공급자 응답
  Tool: unit/integration tests
  Steps: javascript URL, localhost URL, userinfo URL, 20KB title, script tag, 잘못된 날짜, redirect URL, key-like 문자열을 주입한다.
  Expected: 위험 URL 거부, 제목 길이 제한과 text sanitize 적용, credential/redirection 누출 0.

Scenario: 공개 경계 전수 검사
  Tool: route snapshot + frontend bundle scan
  Steps: public routes와 production bundle을 discovery schema 키, review note 표식, actor UUID 표식으로 검색한다.
  Expected: 전부 0건.
```

**커밋**: `fix(editorial): close news discovery review findings`

### 7. Terra: 운영 runbook과 2주 수동 pilot 패키지

**병렬화**: 불가 | Wave 6 | 차단: 8 | 선행: 6, P0 배포 선행 과제

**참조**

- `WORKFLOW.md`
- 기존 editorial scheduler/runbook 문서
- Render/Netlify 환경 변수 문서

**할 일**

- 키 발급, secret 설정, 수동 실행, budget 확인, safe error 대응, purge, rollback 절차를 작성한다.
- collector는 disabled 기본으로 배포하고 관리자 수동 실행만 연다.
- 14일 운영 기록 템플릿을 만든다.
- 매일 기록할 값: 호출 수, 신규, 중복, 무관, 검토, 원출처 확인, 편성, 제외 이유, 평균 확인 시간.
- 월별 화면이 daily metadata 집계임을 운영 문서에 명시한다.

**완료 조건**

- 키 값 없이도 문서만 보고 staging을 안전하게 배포할 수 있다.
- 키가 누락된 staging에서 앱 전체는 정상이고 collector만 disabled다.
- rollback이 migration 011 데이터만 되돌리고 기존 편집 데이터는 보존한다.
- production scheduler는 계속 false다.

**QA**

```text
Scenario: 키 없는 배포
  Tool: staging smoke
  Steps: 키와 enable flag 없이 서버와 관리자 페이지를 실행한다.
  Expected: 공개 서비스 200, 기존 편집 기능 정상, 발견함은 credentials_missing 또는 disabled를 안전하게 표시.

Scenario: 수동 pilot day 1
  Tool: 관리자 UI + DB read-only 확인
  Steps: 실제 키로 수동 run 1회 → 후보 5개 검토 → 1개 출처 확인 → 1개 편성 → 같은 날 재실행.
  Expected: budget 이내, 중복 insert 0, 재실행은 동일 run, 기사 본문/description 저장 0.
```

**커밋**: `docs(editorial): add news discovery pilot runbook`

### 8. Sol: 최종 go/no-go와 다음 단계 결정

**병렬화**: 불가 | Wave 7 | 차단: 자동 실행 승인 여부 | 선행: 7과 14일 수동 pilot

**참조**

- `docs/athletetime-naver-news-discovery-contract.md`
- Task 7에서 만든 운영 runbook과 14일 pilot 기록
- `WORKFLOW.md`
- 이 계획의 `작업 시작 때마다 먼저 읽을 남은 과제`

**검수 항목**

- 전체 P0 backlog 상태
- 14일 pilot 수치와 무관 후보 비율
- API 비용·한도·provider 오류
- 편집자 시간 절감 여부
- 원출처 확인 성공률
- 미성년자·민감정보 예외
- 자동 실행을 켰을 때의 최악 상황과 kill switch

**승인 선택지**

1. `GO-MANUAL`: 수동 수집만 계속한다.
2. `GO-DAILY`: `NAVER_NEWS_COLLECTOR_ENABLED=true`, 매일 06:30 KST 한 번만 허용한다.
3. `REVISE`: query profile/관련성 규칙만 수정하고 7일 재검증한다.
4. `STOP`: 키 제거, collector disable, discovery metadata 보존정책대로 정리한다.

**자동 예약 활성화 완료 조건**

- owner가 `GO-DAILY`를 명시적으로 승인한다.
- P0 보안 PR과 운영 복원 리허설이 완료됐다.
- 14일 동안 위반 0이며 호출 예산이 실제 수치로 확인됐다.
- enable/disable 후 각각 readiness와 관리자 UI를 라이브에서 검증했다.

**QA**

```text
Scenario: GO-DAILY 승인 심사
  Tool: read-only DB query + pilot 보고서 + staging smoke
  Steps: 14일 run 원장과 후보 상태를 집계하고 P0 완료 증거, credential 누출, 중복, 호출 예산, 원출처 확인률을 검토한다.
  Expected: 모든 자동 예약 활성화 완료 조건이 증거로 충족될 때만 GO-DAILY. 하나라도 없으면 GO-MANUAL 또는 REVISE다.
  Evidence: .omo/evidence/task-8-news-discovery-go-no-go.md

Scenario: STOP 복구 가능성
  Tool: staging env toggle + read-only DB query
  Steps: collector를 disable하고 키를 제거한 뒤 공개 서비스와 기존 편집 기능을 스모크하고 discovery 보존·purge 상태를 확인한다.
  Expected: 공개 서비스와 기존 편집 기능은 정상, 추가 외부 호출 0, 기존 issue/source/post 변화 0.
  Evidence: .omo/evidence/task-8-news-discovery-stop-smoke.txt
```

**커밋**: `docs(editorial): record news discovery go no-go`

## 최종 검증 Wave

아래 네 검수는 구현 Task 1~7 뒤 모두 승인되어야 한다. 14일 pilot 이후 Task 8에서 최종 운영 모드를 결정한다.

- [x] **F1. 계획 준수 검수 — Sol xhigh**
  - Task 1~7의 커밋·파일·증거를 이 계획과 대조한다.
  - 자동 초안·자동 승인·자동 발행, Task 9/12, 기사 본문 저장이 0인지 확인한다.
  - 증거: `.omo/evidence/final-news-discovery-plan-compliance.md`

- [x] **F2. 코드 품질·보안 검수 — Sol xhigh**
  - migration, repository transaction, advisory lock, URL·HTML 정규화, credential redaction, SSRF/XSS를 검토한다.
  - `npm test`, 프론트 type-check/build, migration up/down/up, 2-worker 테스트를 재실행한다.
  - 증거: `.omo/evidence/final-news-discovery-security.txt`

- [x] **F3. 실제 관리자 QA — Terra medium, 독립 세션**
  - 390x844와 1440x900에서 오늘 수집 → 검토 → 원출처 확인 → 편성 → 제외를 실제 조작한다.
  - 키 없음, 예산 소진, 공급자 장애, 긴 제목, 빈 결과를 함께 확인한다.
  - 증거: `.omo/evidence/final-news-discovery-browser/`

- [x] **F4. 범위·공개 경계 검수 — Sol max**
  - 공개 route/API/bundle과 기존 일반·매거진 글 회귀를 검사한다.
  - discovery 내부값, review_note, actor ID, credential, NAVER 제휴 오인 문구가 0인지 확인한다.
  - 증거: `.omo/evidence/final-news-discovery-scope-fidelity.md`

## 전체 검증 명령

실제 파일명은 Task 1의 계약에서 확정하되 다음 묶음을 유지한다.

```powershell
node --test backend/tests/naver-news-api-client.test.js
node --test backend/tests/editorial-news-normalizer.test.js
node --test backend/tests/editorial-news-discovery-runtime.test.js
node --test backend/tests/editorial-news-discovery-api.test.js
node --test backend/tests/editorial-news-discovery-runtime-postgres.integration.test.js
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
git diff --check
```

추가 수동 검증:

- 관리자 desktop 1440x900
- 관리자 mobile 390x844
- 공개 `/`, `/records`, `/community`, 일반 게시글, 매거진 게시글 회귀
- production bundle의 credential/discovery-internal 문자열 검사
- migration up/down/up
- 2-worker 경쟁
- 401/403/429/5xx/timeout/malformed 응답 장애 주입

## 작업 지시서 템플릿

각 작업자는 아래 형식으로 결과를 남긴다.

```text
[선행 과제 상기]
P0 보안 취약점 PR, PR #52→#53→#54 병합, 운영 복원·migration 006~010·Render→Netlify 검증은 미완료 시 반드시 먼저 보고한다.
Task 9 알림과 Task 12 지표는 4주 Gate A 전에는 작업하지 않는다.

[작업 계약]
모델/추론:
기준 SHA:
브랜치:
소유 파일:
읽기 전용 참조:
금지 범위:

[반드시 검증]
명령:
브라우저 시나리오:
보안/정책 시나리오:

[완료 보고]
커밋 SHA:
변경 파일:
검증 결과:
결정 사항:
남은 위험:
다음 작업자 입력:
```

## 복사해 쓰는 모델별 지시

### Sol S1

```text
AthleteTime 뉴스 발견함의 신뢰 경계를 설계하고 migration 011 계약을 고정하세요.
네이버 검색 결과는 발행 근거가 아니라 관리자 전용 lead입니다. description/body/raw response를 저장하지 말고, discovery가 existing editorial_sources 또는 공개 API로 직접 넘어가는 경로를 금지하세요.
DB 상태·제약·동시성·보존·quota·공개 allowlist를 테스트 우선으로 결정하세요.
소유 범위는 ADR, migration 011, contract tests입니다. API client와 UI는 수정하지 마세요.
완료 시 기준 SHA, 커밋 SHA, migration up/down/up, 공개 누출 검사, 열린 결정 0개를 보고하세요.
```

### Terra T1

```text
확정된 ADR과 migration 계약을 바꾸지 말고 NAVER API HUB 뉴스 검색 client, 고정 query profile, title/URL normalizer, quota gate를 fixture-first로 구현하세요.
description은 parser 반환값에도 넣지 마세요. 401/403/429는 재시도 금지, timeout/5xx만 1회 재시도입니다.
소유 범위는 신규 client/normalizer/config와 unit tests뿐입니다. DB schema, 공개 API, 출처 정책은 수정하지 마세요.
계약 변경이 필요하면 즉시 중단해 Sol로 상향하세요.
```

### Terra T2

```text
확정 schema와 client를 사용해 news run/discovery repository, service, 관리자 전용 API, audit, CSRF, no-store를 구현하세요.
advisory lock과 unique run으로 2-worker 중복을 막고, 발견 후보를 existing source로 자동 승격하지 마세요.
소유 범위는 신규 repository/service/admin route/integration tests입니다. UI와 공개 route는 수정하지 마세요.
```

### Terra T3

```text
기존 AdminIssueEditorPage에 소식 발견함을 추가하세요. 오늘/이번 달, 상태 필터, 수동 실행, 검토, 원출처 확인, 편성, 제외 동선만 구현합니다.
기사 본문과 API description은 표시하지 말고, 언론사명을 추측하지 말며 hostname을 원문 도메인으로 표시하세요.
source_confirmed 전 편성 버튼은 비활성화하세요. shadcn 기존 패턴을 사용하고 390x844/1440x900 브라우저 QA 증거를 남기세요.
```

### Sol S2/S3

```text
뉴스 발견함 전체 diff를 공격자와 편집 책임자 관점에서 독립 검수하세요.
credential/SSRF/XSS/open redirect/query injection, 2-worker 경쟁, partial failure, 공개 누출, 미성년자 경고, 출처 정책 우회를 검증하세요.
high/critical 0이 아니면 승인하지 마세요. Task 9/12, 자동 초안, 자동 승인, 자동 발행이 포함되면 범위 위반으로 반려하세요.
14일 수동 pilot 전에는 예약 실행 활성화를 승인하지 마세요.
```

## 완료 정의

이 계획의 1차 완료는 `자동으로 매일 기사를 발행하는 것`이 아니다.

- 관리자가 한 번 눌러 오늘 후보를 안전하게 수집할 수 있다.
- 같은 기사는 중복 저장되지 않는다.
- 기사 본문·요약·키는 저장·노출되지 않는다.
- 편집자는 원출처를 확인한 후보만 기존 캘린더로 넘길 수 있다.
- 기존 출처 정책과 인간 승인 없이는 게시글이 발행되지 않는다.
- 14일 수동 운영 수치로 자동 수집 여부를 결정할 수 있다.
- 남은 P0/P1 과제가 모든 handoff에서 사라지지 않는다.
