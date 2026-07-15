# AthleteTime 현재 상태 정본

> 기준일: 2026-07-14
> 기준 브랜치: `main`
> 기준 SHA: `dddb3da2709e7376e7d5406067b190a7ed9c5079`
> 상세 커버리지: [`athletetime-coverage-matrix.md`](./athletetime-coverage-matrix.md)
> 후속 작업 순서: [`20260714-system-trust-and-stopped-work-handoff.md`](./work-orders/20260714-system-trust-and-stopped-work-handoff.md)
> 검증 증거: [`20260714-g002-verification.md`](./evidence/20260714-g002-verification.md)

이 문서는 위 SHA의 저장소와 2026-07-14 로컬 데이터 실측을 기준으로 한 운영 정본이다. 다른 문서의 수치나 상태가 이 문서 또는 같은 시점에 생성한 coverage 산출물과 다르면 **이 문서와 생성 coverage를 정본**으로 본다. PR이 머지되거나 데이터가 승격되면 같은 PR에서 이 문서와 생성 coverage를 함께 갱신한다.

## 데이터 스냅샷

| 항목 | 현재 값 | 해석 |
|---|---:|---|
| 결과 연도 파일 | 12개 | `data/results/2015.json`부터 `2026.json`까지. `index.json` 제외 |
| 결과묶음 | 239개 | 연도별 결과 JSON의 대회 결과 묶음 합계 |
| 종목 | 10,086개 | 결과 묶음 안 `events` 합계 |
| 결과행 | 94,195행 | 각 종목의 `results` 행 합계 |
| 결과 JSON bytes | 26,365,866 | `data/results/2015.json`부터 `2026.json`까지의 파일 크기 합계. `index.json` 제외 |
| 대회목록 시작 연도 | 2018 | `data/competitions`의 가장 이른 연도 파일 |

## 커버리지 판정

- `2015-2017`: 결과 파일은 있으나 같은 연도의 로컬 대회목록 파일이 없어 매트릭스에서 `orphan_results`로 분류된다. 이는 **로컬 인덱스 상태**이며, 결과 데이터 자체가 잘못됐다는 확정 판정이 아니다.
- `2018-2025`: 로컬 대회목록 수와 결과묶음 수가 일치하지만 상태는 `locally_aligned_not_global_proof`다. 로컬 일치는 해당 연도 전체 대회의 확보나 공식 완전성을 증명하지 않는다.
- `2026`: 로컬 대회목록 60개 중 결과묶음 6개로 `partial_local_gap`이다.
- `2005-2014`: 서비스 결과 데이터로 승격되지 않았다. 비공개 원본 또는 후보 증적의 존재 가능성과 서비스 승격 완료를 혼동하지 않는다.
- 현재 수치로 “2005년부터 모든 결과 보유”, “공식 전체 DB”, “완전한 전국 커버리지”를 주장하지 않는다.

## 검증 기준선

- focused test는 `node --test backend/tests/coverage-matrix.test.js`로 실행해 6개 중 6개가 통과했다.
- 2026-07-14 실측에서 root와 frontend 각각 `npm ci` 후 root `npm test`를 실행했으며, 243개 테스트 중 238개가 통과하고 실패 0개, 5개가 skip됐다.
- 같은 설치 상태에서 `npm --prefix frontend run build`가 통과했다.
- 설치 전 첫 실행은 의존성 미설치로 실패했다. root `npm ci`와 `npm --prefix frontend ci`로 환경을 복구한 뒤 focused test, full suite, frontend build를 다시 실행해 위 기준선을 얻었다.
- 실행 명령, 독립 카운트, audit, no-go diff와 임시 파일 정리 결과는 [`docs/evidence/20260714-g002-verification.md`](./evidence/20260714-g002-verification.md)에 기록한다.
- 위 테스트와 빌드 통과는 현재 동작의 회귀 기준선일 뿐, 아래 dependency 취약점이 해소됐다는 뜻은 아니다. 기능 검증 결과와 `npm audit` 보안 부채는 별개의 상태로 함께 추적한다.

## 보안 부채

| 범위 | `npm audit` 실측 | 주요 직접·간접 취약점 |
|---|---:|---|
| root | 총 12개: moderate 8, high 4, critical 0 | high: `basic-ftp`(transitive), `cloudinary`(direct, major update 필요), `path-to-regexp`(transitive), `ws`(direct) |
| frontend | 총 18개: low 1, moderate 6, high 10, critical 1 | critical: `jspdf`(direct, 수정에 major `4.2.1` 필요). high에는 `axios`, `react-router-dom`, `vite` 직접 의존성과 transitive packages가 포함된다. |

- `npm audit fix --force`는 자동 적용하지 않는다. major update와 transitive dependency 변화를 영향 분석하고 회귀 테스트하는 별도 PR로 처리한다.
- 특히 `jspdf` critical은 데이터 승격이나 광범위한 출시 전에 해소해야 하는 P0이며, 패키지 변경과 검증 범위는 인계 문서의 dependency security 작업을 따른다.

## 열린 PR

| PR | 2026-07-14 상태 | 현재 판단 | 다음 조치 |
|---|---|---|---|
| [#47](https://github.com/hojune0330/athletetime/pull/47) A-3 Step 2 | Open, base `main` | 2015-2017 `.xls` 후보 dry-run이다. 서비스 승격 PR이 아니며 `data/results` 변경은 0이다. | Fable이 후보 수치, 차단 목록, 개인정보·경로 비노출, TOP100 dedup 불변을 검수한 뒤 머지 여부를 결정한다. 실제 승격은 별도 PR에서 진행한다. |
| [#46](https://github.com/hojune0330/athletetime/pull/46) records UX | Open, base `main` | 단계형 records UX PR이다. PR 기록의 full suite는 당시 기존 KAAF 테스트 2건 때문에 실패 상태였다. | 최신 `main`에 rebase하고 full suite와 frontend build/browser QA를 다시 통과시킨 뒤 검수한다. |
| [#8](https://github.com/hojune0330/athletetime/pull/8) launch surface | Open Draft, base `main` | 이후 main 작업들로 대체된 오래된 launch-surface 초안이다. | `superseded` 사유를 남기고 닫는다. 이 PR을 현재 main에 머지하지 않는다. |

## 정본 운영 규칙

1. 신뢰 게이트를 기능 확장보다 먼저 통과시킨다: 수치 재현, 출처·권리 경계, 비공개 요청 억제, 금지 문구, 테스트와 CI.
2. 후보 생성, Fable 검수, 서비스 승격을 분리한다. dry-run 결과를 사용자 노출 데이터로 간주하지 않는다.
3. 데이터 승격 PR은 연도별 수치, 보류 사유, TOP100 중복 delta, 원본 대조, 안전 스캔, 커버리지 문서 갱신을 함께 제공한다.
4. 원본 inventory 수량은 비공개 저장소에서 재확인하기 전까지 확정값으로 문서화하지 않는다.
