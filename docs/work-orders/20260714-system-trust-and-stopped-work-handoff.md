# 시스템 신뢰 및 중단 작업 인계

> 기준: 2026-07-14 `main` `dddb3da`
> 상태 정본: [`../athletetime-current-state.md`](../athletetime-current-state.md)

## 실행 원칙

실행 순서는 **trust gate → data promotion → UX/community**로 고정한다. 앞 단계의
필수 증거와 Fable 승인이 없으면 다음 단계의 사용자 노출 또는 서비스 승격을
시작하지 않는다. `dry-run`과 후보 데이터는 서비스 데이터가 아니다.

## 1. Trust gate

| 작업 | 상태 | 담당 | 선행조건 | No-go | 산출물 | 증거 | Fable 승인 |
|---|---|---|---|---|---|---|---|
| PR #47 | Open; A-3 Step 2 `dry-run` | Codex 구현, Fable 검수 | `main` 기준 재현; 서비스 데이터 diff 0 | `data/results` 변경, 원본·개인번호·비공개 경로 노출, TOP100 dedup 기준선의 무설명 변경 | 2015-2017 정규화 후보와 held/blocked 보고 | 연도별 후보 수, 중복 delta와 예시 2건, 금칙 패턴 0, 테스트 결과 | **필수**; dry-run 머지 여부만 승인하며 승격 승인이 아님 |
| data-request DB | 미착수; 파일 JSON 기반 정정·숨김·삭제 요청을 PostgreSQL로 전환 | Backend/Privacy 담당 | `requests`/`events`/`suppressions` 영속 저장, opaque ticket, restart·concurrency·suppression consistency 계약 확정 | raw passive search query 저장, 재시작 시 요청·이벤트 유실, ticket 충돌, 검색·analytics 간 suppression 불일치 | PostgreSQL migration과 정정·숨김·삭제 요청 저장소 | restart E2E, concurrent ticket uniqueness, suppression search/analytics consistency, migration rollback | **필수**; 저장·억제 계약과 증거 승인 |
| source-rights registry | 미착수; 수집·노출 권리 게이트 | 운영 책임자, 법률 검토자 | 출처별 이용조건, robots, 상업 이용, 미성년 정책 확인; robots는 법적 허락 자체가 아니라 접근·수집 운영 신호로 취급 | 허락 불명 원본 공개, 차단 경로 우회, `person_no` 저장, 공식성·완전성 주장 | 출처·권리·보존정책 레지스터 | 원문 약관/라이선스 링크, 협조 회신, robots 점검일, 삭제 절차 | **필수**; 출처별 go/no-go 서면 확인 |
| auth | 미완료; 실사용 출시 차단 | Backend/Auth 담당 | HttpOnly·Secure·SameSite 쿠키 세션, CSRF, 탈퇴·내보내기·익명화 경로 | localStorage 토큰, 비밀·인증코드 로그, 가입 여부 노출, 기본 관리자 키 | 인증·개인정보 계약 구현과 회귀 테스트 | 세션/CSRF 테스트, 로그 비노출 스캔, 권리요청 E2E | **필수**; 실사용 UX/community 전에 승인 |
| CI/private storage | 미확정; 승격 차단 게이트 | CI 담당, 데이터 운영자 | 비공개 원본 저장소 inventory 재확인; clean `main` CI 기준선 | 원본 XLS/XLSX/PDF/HWP 커밋, private path·secret 노출, 실패 CI 우회 | CI 필수 체크와 private-storage 운영 절차 | `git ls-files` 원본 0, secret/path scan 0, 전체 테스트·빌드 결과, 접근권한 기록 | **필수**; data promotion 전에 승인 |
| dependency security | **P0**; frontend `jspdf` direct critical 포함. root 12개(moderate 8, high 4), frontend 18개(low 1, moderate 6, high 10, critical 1) | Security/Frontend/Backend | 직접·간접 의존성 영향 분석 후 단계적 업데이트; `jspdf` major `4.2.1` 검토; 각 단계별 회귀 기준선 확정 | 이 문서 PR에서 패키지 변경, `npm audit fix --force` 자동 적용, 테스트 통과를 취약점 해소로 간주, 검증 없는 일괄 major update | 의존성 그룹별 별도 PR, 영향 분석, audit 전후 비교와 rollback 계획 | exports/card PDF, websocket, Cloudinary, auth, navigation, frontend build 및 전체 테스트 검증 | **필수**; Fable 승인 후 완료. 데이터 승격 또는 광범위한 출시 전에 처리 |
| PR #8 | **Open Draft**; `superseded` 판단, close 미완료 | 저장소 관리자 | 대체된 `main` 기능 확인 | rebase, 추가 구현, 머지, 이미 닫힌 것으로 보고 | 앞으로 수행할 작업: superseded 사유가 포함된 close 기록 | PR close 이벤트와 대체 근거 링크 | 별도 구현 승인 없음; **close는 아직 해야 할 작업** |

## 2. Data promotion

| 작업 | 상태 | 담당 | 선행조건 | No-go | 산출물 | 증거 | Fable 승인 |
|---|---|---|---|---|---|---|---|
| A-2 | 중단; 2016 대구실내 보류분 재파싱 대기 | Codex | trust gate 통과; 60m/60mH indoor 규칙과 held 계약 고정 | 불명확 행 강제 승격, 실내·야외 event key 혼합 | 안전 회수분, `still-held`와 사유별 수치 | 원본 스팟체크 2종목, 회수/잔여 카운트, 테스트·빌드 | **필수**; 회수·보류 경계 승인 후 승격 |
| A-3 Step 3 | 미착수; 서비스 승격 | Codex | PR #47 Step 2 승인·머지; data-request DB, source-rights registry, CI/private storage 승인 | Step 2 후보를 자동 승격, `unspecified` 대량 유입, 무설명 dedup 변화 | 2015-2017 결과 JSON, index, coverage, year checklist | candidates/promoted/held, dedup delta, 대표 원본 대조, 안전 스캔 | **필수**; 별도 PR 사전 리뷰와 최종 승인 |
| A-4~A-6 | 미착수; 2012-2014 → 2009-2011 → 2005-2008 순차 승격 | Codex | A-2와 A-3 완료; 직전 연도 묶음 승인 | 순서 건너뛰기, blocked 원본 강제 처리, coverage 미갱신, TOP100 중복 미보고 | 연도별 결과 JSON, index, held 목록, coverage와 checklist | 연도별 후보/승격/보류, 중복 delta와 예시, 대회 2-3개 대조, 안전 스캔, CI | **각 PR 필수**; 다음 묶음 착수 전 승인 |
| TOP100/watchlist | TOP100 기반은 유지; watchlist는 수동 운영, 확장 보류 | 데이터 운영자, Fable 검수 | 결과 데이터 우선 dedup; 출처·노출 문구·삭제요청 정책 | TOP100을 공식 인증·랭킹으로 표시, 자동 인물 병합, watchlist 자동 수집 | 중복 제거 통계, 수동 watchlist 변경 기록 | `skippedDuplicates` delta, 출처 URL, 운영자 변경 이력, suppression 확인 | **필수**; 노출·대량 갱신 단위 승인 |

## 3. UX/community

| 작업 | 상태 | 담당 | 선행조건 | No-go | 산출물 | 증거 | Fable 승인 |
|---|---|---|---|---|---|---|---|
| PR #46 | Open; records UX 재검증 대기 | Frontend 담당, Fable 검수 | trust gate 통과; 최신 `main` 동기화 | 기존 실패를 무시한 머지, 공식·검증·완전성 오인 문구 | 단계형 records UX | full suite, frontend build, 모바일·데스크톱 browser QA | **필수**; 재검증 증거 기준 머지 승인 |
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

- [ ] 현재 **Open Draft**인 #8에 `superseded` 사유를 남기고 close한다. close는 완료 사실이 아니라 앞으로 해야 할 작업이다.
- [ ] trust gate의 data-request DB, source-rights registry, auth, CI/private storage를 증거와 함께 승인한다.
- [ ] 데이터 승격을 각 단계별 별도 PR과 생성 coverage 갱신으로 추적한다.
- [ ] PR #46과 Track H를 trust gate 이후에만 사용자 노출 대상으로 검수한다.
- [ ] legacy queue Track B-G를 Fable이 재판정해 재개·보류·폐기 근거를 남긴다.
- [ ] J-2/J-3/J-4를 PR #46 이후 deferred 계약에 따라 재평가한다.
