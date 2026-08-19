# 시스템 신뢰 및 중단 작업 인계

> 최초 기준: 2026-07-14 `main` `dddb3da`
> 운영 상태 갱신: 2026-08-19 `main` `ad1c963`
> 신뢰 상태 갱신: 2026-08-20 (범위 한정; 2026-07-14 데이터 기준선 재감사 아님)
> 상태 정본: [`../athletetime-current-state.md`](../athletetime-current-state.md)

## 실행 원칙

실행 순서는 **trust gate → data promotion → UX/community**로 고정한다. 앞 단계의
필수 증거와 Fable 승인이 없으면 다음 단계의 사용자 노출 또는 서비스 승격을
시작하지 않는다. `dry-run`과 후보 데이터는 서비스 데이터가 아니다.

## 1. Trust gate

| 작업 | 상태 | 담당 | 선행조건 | No-go | 산출물 | 증거 | Fable 승인 |
|---|---|---|---|---|---|---|---|
| PR #47 | **Merged 2026-07-15**; A-3 Step 2 `dry-run` 완료 | Codex 구현, Fable 검수 | 완료: 서비스 데이터 diff 0 | `data/results` 변경, 원본·개인번호·비공개 경로 노출, TOP100 dedup 기준선의 무설명 변경 | 2015-2017 정규화 후보와 held/blocked 보고 | 연도별 후보 수, 중복 delta와 예시 2건, 금칙 패턴 0, 테스트 결과 | dry-run만 승인·병합됨; 서비스 승격 승인은 아님 |
| data-request DB | **구현 병합: PR #50 (`5efdf77`); Fable 검수·병합 승인 완료; production rollout 미완료** | Backend/Privacy 담당 | `requests`/`events`/`suppressions` 영속 저장, opaque ticket, restart·concurrency·suppression consistency 계약 확정 | raw passive search query 저장, 재시작 시 요청·이벤트 유실, ticket 충돌, 검색·analytics 간 suppression 불일치 | PostgreSQL migration과 정정·숨김·삭제 요청 저장소 | restart E2E, concurrent ticket uniqueness, suppression search/analytics consistency, migration rollback | **완료: PR #50 댓글 `4982112480`에서 승인·병합 확인**; 운영 rollout은 별도 게이트 |
| source-rights registry | 미착수; 수집·노출 권리 게이트 | 운영 책임자, 법률 검토자 | 출처별 이용조건, robots, 상업 이용, 미성년 정책 확인; robots는 법적 허락 자체가 아니라 접근·수집 운영 신호로 취급 | 허락 불명 원본 공개, 차단 경로 우회, `person_no` 저장, 공식성·완전성 주장 | 출처·권리·보존정책 레지스터 | 원문 약관/라이선스 링크, 협조 회신, robots 점검일, 삭제 절차 | **필수**; 출처별 go/no-go 서면 확인 |
| auth | 미완료; 실사용 출시 차단 | Backend/Auth 담당 | HttpOnly·Secure·SameSite 쿠키 세션, CSRF, 탈퇴·내보내기·익명화 경로 | localStorage 토큰, 비밀·인증코드 로그, 가입 여부 노출, 기본 관리자 키 | 인증·개인정보 계약 구현과 회귀 테스트 | 세션/CSRF 테스트, 로그 비노출 스캔, 권리요청 E2E | **필수**; 실사용 UX/community 전에 승인 |
| CI/private storage | 미확정; 승격 차단 게이트 | CI 담당, 데이터 운영자 | 비공개 원본 저장소 inventory 재확인; clean `main` CI 기준선 | 원본 XLS/XLSX/PDF/HWP 커밋, private path·secret 노출, 실패 CI 우회 | CI 필수 체크와 private-storage 운영 절차 | `git ls-files` 원본 0, secret/path scan 0, 전체 테스트·빌드 결과, 접근권한 기록 | **필수**; data promotion 전에 승인 |
| dependency security | 2026-08-12 production/full audit root·frontend 0건; 지속 검증 게이트 | Security/Frontend/Backend | 배포·의존성 변경 전 현재 advisory 재측정; 직접·간접 변경 영향 분석 | `npm audit fix --force` 자동 적용, 오래된 0건 결과를 영구 보증으로 간주, 검증 없는 일괄 major update | audit 전후 비교와 rollback 계획 | exports/card PDF, websocket, Cloudinary, auth, navigation, frontend build 및 전체 테스트 검증 | 현재 기준 통과; 새 advisory 또는 package/lock 변경 시 재승인 |
| PR #8 | **Closed 2026-08-19T16:27:05Z; unmerged; superseded** | 저장소 관리자 | 대체된 `main` 기능 확인 | 상태를 되돌리거나 별도 구현 대상으로 취급함 | superseded 댓글 `5344621004`와 대체 근거 보존 | PR close 이벤트와 대체 근거 링크 | 별도 구현 승인 없음; 기록 보존 상태 |

2026-08-20 신뢰 상태 갱신(범위 한정): PR #8은 닫혔고 병합되지 않았으며 superseded 댓글 `5344621004`가 존재한다. Data-request DB 구현은 PR #50 (`5efdf77`)로 병합되었고, PR #50 댓글 `4982112480`에 따른 Fable 검수·병합 승인도 완료되었다. 별도로 배포 `/health`에서 `dataRights: ready`가 관찰되었지만, 이는 구현·런타임 준비도 증거일 뿐 production rollout 완료를 의미하지 않는다. 백업/checksum, migration rehearsal/dry-run, shadow suppression comparison, post-rollout request roundtrip은 계속 pending이다. 2026-07-14 데이터 기준선은 이번 상태 갱신에서 재감사하지 않았다.

## 2. Data promotion

| 작업 | 상태 | 담당 | 선행조건 | No-go | 산출물 | 증거 | Fable 승인 |
|---|---|---|---|---|---|---|---|
| A-2 | 중단; 2016 대구실내 보류분 재파싱 대기 | Codex | trust gate 통과; 60m/60mH indoor 규칙과 held 계약 고정 | 불명확 행 강제 승격, 실내·야외 event key 혼합 | 안전 회수분, `still-held`와 사유별 수치 | 원본 스팟체크 2종목, 회수/잔여 카운트, 테스트·빌드 | **필수**; 회수·보류 경계 승인 후 승격 |
| A-3 Step 3 | 미착수; 서비스 승격 | Codex | PR #47 Step 2 병합 완료; data-request DB, source-rights registry, CI/private storage 승인 | Step 2 후보를 자동 승격, `unspecified` 대량 유입, 무설명 dedup 변화 | 2015-2017 결과 JSON, index, coverage, year checklist | candidates/promoted/held, dedup delta, 대표 원본 대조, 안전 스캔 | **필수**; 별도 PR 사전 리뷰와 최종 승인 |
| A-4~A-6 | 미착수; 2012-2014 → 2009-2011 → 2005-2008 순차 승격 | Codex | A-2와 A-3 완료; 직전 연도 묶음 승인 | 순서 건너뛰기, blocked 원본 강제 처리, coverage 미갱신, TOP100 중복 미보고 | 연도별 결과 JSON, index, held 목록, coverage와 checklist | 연도별 후보/승격/보류, 중복 delta와 예시, 대회 2-3개 대조, 안전 스캔, CI | **각 PR 필수**; 다음 묶음 착수 전 승인 |
| TOP100/watchlist | TOP100 기반은 유지; watchlist는 수동 운영, 확장 보류 | 데이터 운영자, Fable 검수 | 결과 데이터 우선 dedup; 출처·노출 문구·삭제요청 정책 | TOP100을 공식 인증·랭킹으로 표시, 자동 인물 병합, watchlist 자동 수집 | 중복 제거 통계, 수동 watchlist 변경 기록 | `skippedDuplicates` delta, 출처 URL, 운영자 변경 이력, suppression 확인 | **필수**; 노출·대량 갱신 단위 승인 |

## 3. UX/community

| 작업 | 상태 | 담당 | 선행조건 | No-go | 산출물 | 증거 | Fable 승인 |
|---|---|---|---|---|---|---|---|
| PR #46 / #88 | #46 merged 2026-07-15; #88 merged and deployed 2026-08-19 | Frontend 담당, Fable 검수 | 완료: 단계형 records UX와 종속 시즌·부문 탐색 검증 | 공식·검증·완전성 오인 문구, 독립 필터로 유효하지 않은 조합 생성 | 단계형 records UX와 count-free 종속 탐색 | exact-head Actions, full frontend/non-browser/browser/actual-index, 4 viewport QA | 현재 공개 records 기준선 승인·배포 완료 |
| Track H | 중단; H-1a부터 순차 대기 | Community/Backend/Frontend 담당 | auth 승인; rights/privacy 정책; 신고 운영자와 보존정책 확정 | H-1 안전장치 전 홍보·노출 강화, 실명·계정 식별자 API 노출, 신고·블라인드 없는 출시 | H-1a 익명 번호링 → H-1b 신고·블라인드·금칙어 → H-1c 채팅 저장 → H-2 라이브 | 익명 API 계약, 신고 3인 테스트, 필터 테스트, 관리자 감사로그, 보존 삭제 검증, browser QA | **각 단계 필수**; H-1 전체 승인 전 H-2 노출 금지 |

## 4. Legacy queue

아래 항목은 새 승인이 아니라 **기존 큐의 보존 등록**이다. 모두 현재 상태 재판정이 필요하며, 완료·대체 근거 없이 조용히 폐기하지 않는다. 구현 착수는 trust gate 통과와 Fable triage 이후로 제한한다.

| 작업 | 기존 범위 | 큐 상태 | 착수 게이트 |
|---|---|---|---|
| Track B | 레거시 PDF/HWP 분류·정규화 | 기존 큐; 현재 상태 재판정 필요; 조용히 폐기 금지 | trust gate 통과 및 Fable triage 후 구현 |
| Track C | 팀/계주 결과 schema와 별도 노출 경계 | 기존 큐; 현재 상태 재판정 필요; 조용히 폐기 금지 | trust gate 통과 및 Fable triage 후 구현 |
| Track D | 해외 기록 외부 공식 출처 confirmation | 기존 큐; 현재 상태 재판정 필요; 조용히 폐기 금지 | trust gate 통과 및 Fable triage 후 구현 |
| Track E | 2019-2026 completeness audit와 누락 대회 보고 | 기존 큐; 현재 상태 재판정 필요; 조용히 폐기 금지 | trust gate 통과 및 Fable triage 후 구현 |
| Track F | 2026 recurring harvest | 기존 큐; 현재 상태 재판정 필요; 조용히 폐기 금지 | trust gate 통과 및 Fable triage 후 구현 |
| Track G | 서비스 copy/coverage sync | 기존 큐; 현재 상태 재판정 필요; 조용히 폐기 금지 | trust gate 통과 및 Fable triage 후 구현 |

## 5. PR #46 이후 deferred

| 작업 | deferred 범위 | 재개 조건 |
|---|---|---|
| J-2 | 로그인 계정 귀속 기록 저장과 "내 기록" 탭 고정 | PR #46 완료 이후 별도 범위·증거 승인 |
| J-3 | 시즌 순위 변동 알림과 community 연계 | PR #46 완료 이후, auth 및 Track H 안전장치 승인 |
| J-4 | 독립 팀 페이지 `/teams/:team` | PR #46 완료 이후, Track C schema와 노출 경계 승인 |

## 6. 모든 후속 PR 필수 보고 계약

모든 후속 PR 본문은 해당 없음 항목도 `N/A`와 사유를 적어 아래 계약을 빠짐없이 보고한다.

- 변경 요약
- tests/build 실행 명령과 결과
- evidence paths
- 대표 spot checks와 판정
- `candidates / promoted / held` 수치
- dedup delta와 대표 예시
- coverage update 또는 무변경 근거
- no-go diff: `data/results`, `data/competitions`, package/lock 등 금지 범위의 변경 유무와 수치

## 프로그램 종료조건(현재 미충족)

- [x] PR #8은 `2026-08-19T16:27:05Z`에 닫혔고 병합되지 않았다. superseded 댓글 `5344621004`로 대체 사유를 기록했다.
- [ ] trust gate의 data-request DB, source-rights registry, auth, CI/private storage를 증거와 함께 승인한다.
- [ ] 데이터 승격을 각 단계별 별도 PR과 생성 coverage 갱신으로 추적한다.
- [x] PR #46과 후속 PR #88의 records 사용자 노출 검수·배포를 완료했다.
- [ ] Track H는 auth와 moderation trust gate 이후에만 사용자 노출 대상으로 검수한다.
- [ ] legacy queue Track B-G를 Fable이 재판정해 재개·보류·폐기 근거를 남긴다.
- [ ] J-2/J-3/J-4를 PR #46 이후 deferred 계약에 따라 재평가한다.
