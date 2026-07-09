# 작업 지시서 — A-3 후속: 2015-2017 .xls 레이아웃 분류 → 후보 정규화 dry-run → 승격

- 발행: 2026-07-09, Claude(총괄)
- 수행: Codex
- 선행: PR #38(트랙 I 층위)·#39/#40(preflight)·#41(.xls dry-run 변환기) 모두 머지 완료
- 관련 승인: SheetJS xlsx@0.20.3 — dry-run 전용 승인 완료(#39, #41 코멘트). **서비스 승격은 이 지시서의 3단계 별도 PR에서만.**

## 0. 순서 결정 (Fable Review Ask 회신 확정)

PR #41 질문에 대한 확정 답변:
1. dry-run evidence 형태(연도/시트명/행수/sha prefix/에러코드)는 A-4~6 계획에 충분 — 그대로 유지.
2. `legacyExpansionPreflightService.js` 분리는 **선행 작업이 아님**. 레이아웃 분류를 먼저 진행하되, 규칙 추가로 250 LOC를 넘게 되면 **그 PR 안에서 함께 분리**한다.

## 1. 단계 1 — .xls 83개 레이아웃 분류 (이번 PR)

`data:convert:legacy-xls:dry-run` 산출을 확장해 83개 전량을 레이아웃 계열로 분류한다.

### 요구사항
- 분류 축(최소): `horizontal_podium`(기존 xlsx 파이프라인과 동일 계열) / `vertical_result_list` / `summary_only`(종합성적·신기록현황 등 순위표가 아닌 시트) / `mixed` / `unknown`.
- 시트 단위 분류: 워크북 하나에 결과 시트와 요약 시트가 섞이면 시트별 layout + 워크북 대표 layout을 모두 기록.
- 각 워크북: `{year, originalFilename, sha256Prefix, sheets:[{name, layout, headerRowIndex?, eventColumnHint?, resultRowEstimate}], workbookLayout, promotable(bool), blockReason?}`.
- **개인정보·경로 세이프티는 #41 레일 그대로**: FORBIDDEN_REPORT_TEXT 스캔, 원본 경로/원시 행 미노출, `servicePromotionAllowed:false` 유지.
- 계약 테스트(신규): `backend/tests/legacy-xls-layout-classification.test.js`
  - 83개 전량 분류(unknown 허용하되 개수 보고), 분류 합계 = 83 고정
  - horizontal_podium 계열은 기존 `extractHorizontalPodiumResults` 재사용 가능성 표기
  - evidence 산출물에 금칙 패턴 0
  - 원본 부재 클론에서는 skip-guard(#41의 ATHLETETIME_LEGACY_ORIGINAL_FIXTURE_ROOT 패턴 재사용)
- evidence: `.omo/evidence/a3-xls-layout/` 아래 JSON+MD 리포트, 계열별 개수 요약 필수.

### 보고 항목 (PR 본문)
- 계열별 개수(2015/2016/2017 연도별 교차표)
- promotable 워크북 수와 대표 blockReason 상위 3개
- 기존 xlsx 파이프라인 재사용 가능 비율

## 2. 단계 2 — 후보 정규화 dry-run (다음 PR)

- promotable 판정 워크북만 `normalized-candidates.jsonl` 계열 evidence로 변환(2015-2017 xlsx 때와 동일 스키마).
- dedup 레일 유지: key = `name|eventKey|date|recordMark`, data/results 우선. **delta>0은 정상** — 건수와 중복 예시 2건 보고. delta=0이면 사유 설명.
- 층위는 트랙 I `divisionHierarchyService.normalizeDivision` 경유 필수. 새 원천 라벨이 unspecified로 대량 유입되면(>20%) 중단 후 라벨 샘플 10개와 함께 질문.
- 서비스 데이터 불변(`data/results` diff 0).

## 3. 단계 3 — 서비스 승격 (별도 PR, 사전 리뷰 필수)

- 단계 2 리뷰 승인 후에만 착수. `data/results/<year>.json` + index + coverage copy + 연도 체크리스트 동일 PR.
- 보고: candidates/promoted/held, dedup delta, 대표 검증 1건(예: 특정 대회 100m 1위 실명 대조).

## 4. 병행 리마인드 (기존 지시 유지)

- **A-2 대구실내**: 60m/60mH indoor 파서 4규칙(strip-indoor-heat-suffix / drop-header-pollution / preserve-indoor-event-keys / still-held-on-ambiguity)은 preflight에 잠겨 있음. 단계 1~2와 병행 가능하면 별도 PR로.
- **트랙 H-1a**(커뮤니티 익명 번호링) PR 대기 중 — 큐에서 빠뜨리지 말 것.
- **트랙 F** 7월 수확 보고 주기 확인.

## 5. 공통 규칙

- PR base는 반드시 `main` (PR #39 base 실수 재발 금지 — #40으로 수습했음).
- dedup 카운트 7,321(TOP100 스킵)은 단계 2까지 불변이어야 함. 변하면 중단 후 질문.
- 원본 파일 git 커밋 금지, privateStoragePath/PERSON_NO 유출 금지.
- 각 PR: red→green tap, npm test 전체, frontend build:check(프론트 변경 시), 독립 리뷰어 통과 evidence.
