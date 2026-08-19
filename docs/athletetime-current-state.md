# AthleteTime 현재 상태 정본

> 운영 기준일: 2026-08-19
> 기준 브랜치: `main`
> 기준 SHA: `ad1c963c8ab2835413e38763fb211bb5eae6e875`
> 데이터 실측 기준일: 2026-07-14
> 상세 커버리지: [`athletetime-coverage-matrix.md`](./athletetime-coverage-matrix.md)
> 후속 작업 순서: [`20260714-system-trust-and-stopped-work-handoff.md`](./work-orders/20260714-system-trust-and-stopped-work-handoff.md)
> 최근 운영 변경: [PR #88](https://github.com/hojune0330/athletetime/pull/88)

데이터 스냅샷과 커버리지 수치는 2026-07-14 실측을 유지하고, 운영·검증 상태는 2026-08-19 PR #88 병합과 배포를 반영한다. PR #88은 `data/results`, `data/competitions`, package/lock을 변경하지 않았으므로 아래 데이터 수치는 재산출 없이 유지한다. 다른 문서의 수치나 상태가 이 문서 또는 같은 시점에 생성한 coverage 산출물과 다르면 **이 문서와 생성 coverage를 정본**으로 본다.

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

- PR #88 exact head `07e32261fe5876bd1fbcadb58fb72a8cf6dc1f21`에서 PostgreSQL contract와 records browser GitHub Actions가 통과했다.
- 같은 head의 Netlify deploy preview, header 규칙, redirect 규칙이 통과했다.
- 포괄 검증 후보 `6edff5f`에서 Node 22.17.1, frontend 209/209, non-browser 414 pass와 6 expected skips, browser 50/50, 4개 viewport 20/20, actual-index 3/3, TypeScript, scoped lint, production build가 통과했다.
- PR #88은 2026-08-19 `main`에 `ad1c963c8ab2835413e38763fb211bb5eae6e875`로 squash-merge됐다.
- Render backend deployment `5979115260`과 Netlify production deployment `6a856dc1eec76900080927c1`이 같은 merge SHA로 성공했다.
- 운영 확인에서 `/health`는 HTTP 200, database `connected`, dataRights `ready`였고, season availability는 HTTP 200과 `Cache-Control: public, max-age=60, stale-while-revalidate=300`을 반환했다.
- 이 검증은 현재 기록 탐색 계약의 회귀 기준선이다. 데이터 완전성, 출처 권리 승인, 인증 정책 승인을 대신하지 않는다.

## 보안 부채

아래 표는 2026-07-14 당시의 역사적 실측이다. 2026-08-12 후속 production/full audit은 root와 frontend 모두 0건을 보고했지만, 의존성 작업 전에는 현재 advisory 기준으로 다시 측정한다.

| 범위 | 2026-07-14 `npm audit` 실측 | 당시 주요 직접·간접 취약점 |
|---|---:|---|
| root | 총 12개: moderate 8, high 4, critical 0 | high: `basic-ftp`(transitive), `cloudinary`(direct, major update 필요), `path-to-regexp`(transitive), `ws`(direct) |
| frontend | 총 18개: low 1, moderate 6, high 10, critical 1 | critical: `jspdf`(direct, 수정에 major `4.2.1` 필요). high에는 `axios`, `react-router-dom`, `vite` 직접 의존성과 transitive packages가 포함된다. |

- `npm audit fix --force`는 자동 적용하지 않는다. major update와 transitive dependency 변화를 영향 분석하고 회귀 테스트하는 별도 PR로 처리한다.
- 특히 `jspdf` critical은 데이터 승격이나 광범위한 출시 전에 해소해야 하는 P0이며, 패키지 변경과 검증 범위는 인계 문서의 dependency security 작업을 따른다.

## 최근 PR 상태

| PR | 현재 상태 | 운영 판단 |
|---|---|---|
| [#88](https://github.com/hojune0330/athletetime/pull/88) records division navigation | 2026-08-19 merged and deployed | 현재 기록 탐색·시즌 조합·legacy identity·public DTO 회귀 기준선이다. |
| [#47](https://github.com/hojune0330/athletetime/pull/47) A-3 Step 2 | 2026-07-15 merged | dry-run 후보 생성만 완료했다. 서비스 승격은 trust gate 이후 별도 PR이다. |
| [#46](https://github.com/hojune0330/athletetime/pull/46) records UX | 2026-07-15 merged | 단계형 records UX는 #88의 종속 필터·복구 계약으로 이어졌다. |
| [#8](https://github.com/hojune0330/athletetime/pull/8) launch surface | Open Draft, superseded | 대체된 `main` 근거를 남기고 닫는다. 머지하거나 재구현하지 않는다. |

## 정본 운영 규칙

1. 신뢰 게이트를 기능 확장보다 먼저 통과시킨다: 수치 재현, 출처·권리 경계, 비공개 요청 억제, 금지 문구, 테스트와 CI.
2. 후보 생성, Fable 검수, 서비스 승격을 분리한다. dry-run 결과를 사용자 노출 데이터로 간주하지 않는다.
3. 데이터 승격 PR은 연도별 수치, 보류 사유, TOP100 중복 delta, 원본 대조, 안전 스캔, 커버리지 문서 갱신을 함께 제공한다.
4. 원본 inventory 수량은 비공개 저장소에서 재확인하기 전까지 확정값으로 문서화하지 않는다.
