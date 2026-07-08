# 업무지시: TOP100 승격 + 레거시 원본 정규화 (Codex 트랙)

> 발행: 2026-07-08 · 발행자: Claude (총괄) · 승인: 사장님(hojune0330)
> 근거: PR #24, #28, #29 완료 후 사장님 결정 사항.
> 이 문서는 다음 Codex 작업 사이클의 단일 소스 오브 트루스다.

---

## 배경 (사장님 결정)

TOP100 기록은 KAAF 공식 API(`searchTopRecList.do`)에서 나온 **진짜 기록**이다.
"후보로 따로 두고 외부 재확인 대기" 처리는 해외대회 단서용 정책을 국내 공식 출처에
과잉 적용한 것이므로 아래와 같이 조정한다:

- **국내 기록**: `needs_external_confirmation` → `source_verified` 일괄 승격.
  KAAF 자체가 1차 공식 출처이므로 "외부" 재확인 대상이 아니다.
- **해외대회 기록만**: 기존 정책 유지 (World Athletics/JAAF/대만육협 등 외부 공식 결과로 재확인).
- 승격은 라벨/신뢰 계층 문제일 뿐, 노출은 이미 되고 있으므로 UI 문구는
  "KAAF 공개 기록" 계열을 유지한다 (공식·인증·검증·랭킹 단어 금지 — WORKFLOW.md §3.3).

---

## 과업 1: TOP100 국내 기록 `source_verified` 승격 (P0, 작은 작업)

### 해야 할 일

1. `data/manual/kaaf-top100/20260708-kaaf-top100-records.jsonl`의 24,630행 중
   **국내 대회 행**의 `reviewStatus`를 `source_verified`로 일괄 변경.
   - 판별: 해외대회 힌트(디스턴스 챌린지, HOKUREN, 오사카, 대만, Open 해외 개최 등)가
     있는 행만 `needs_external_confirmation` 유지. 나머지는 전부 국내로 간주.
   - 변경 스크립트는 `tools/`에 남기고 재실행 가능하게 만들 것 (일회성 손편집 금지).
2. `20260708-kaaf-top100-summary.json`의 `reviewStatus` 집계 갱신.
3. `recordAnalyticsService.js`의 note 문자열(`needs_external_confirmation` 노출부)이
   승격 후 자연스럽게 표시되는지 확인. `source_verified`의 사용자 표시는
   "KAAF 공개 기록" 정도로, 승격 전후 UI 카피 차이는 최소화.
4. `backend/tests/manual-top-records-ingest.test.js`의 고정 카운트
   (`24630/16885/7745`, `needs_external_confirmation`) 어서션을 새 분포로 갱신하고,
   **승격 규칙 자체를 계약 테스트로 잠글 것**
   (예: 국내 행은 `source_verified`, 해외 힌트 행은 `needs_external_confirmation`).

### 완료 조건 (DoD)

- [ ] 승격 스크립트 커밋 + 재실행 idempotent
- [ ] summary/ledger-summary 카운트 일치 (validator 통과)
- [ ] npm test 전체 그린 (기존 206개 + 신규)
- [ ] PR 본문에 승격/유지 행 수 보고

---

## 과업 2: TOP100 ↔ data/results 중복 제거 (P0, 과업 1과 같은 PR 가능)

### 문제

TOP100의 2018–2026 구간(indexable 기준 연 448~1,321행)은 상당수가 이미
`data/results/<year>.json`에 같은 경기·같은 기록으로 존재한다.
현재 `recordAnalyticsService.appendManualTopRecordCandidates()`는 dedup 없이
전부 추가하므로 **한 기록이 선수 프로필과 시즌 테이블에 두 번 잡힐 수 있다**.

### 해야 할 일

1. 인덱스 빌드 시 dedup 키로 중복 판정:
   `normalize(name) + eventKey + date + normalize(record)` (기록 표기 차이,
   예: `10.07` vs `10.07초`, 공백 등 정규화 필수).
2. 중복이면 **data/results 행이 항상 우선** (대회 전체 결과지가 원천).
   TOP100 행은 스킵하되, 스킵 수를 인덱스 메타에 남겨 검증 가능하게.
3. 계약 테스트: 알려진 중복 사례(예: 2018 이후 유명 기록 1건)를 픽스처로 잡아
   "프로필에 1건만 나온다"를 잠글 것.
4. 성능 주의: 인덱스 빌드는 서버 기동 경로다. dedup은 Set/Map 기반 O(n)으로.

### 완료 조건 (DoD)

- [ ] 같은 기록이 선수 프로필/시즌 테이블에 1번만 표시
- [ ] 스킵 카운트 로깅/메타 노출
- [ ] npm test 전체 그린

---

## 과업 3: 레거시 원본 정규화 엔진 — 428파일 → data/results/2005–2017.json (P1, 대형)

### 입력

- 비공개 소스볼트: `data/sources/import/originals/` (git-ignored)
  - `kaaf-backfill-2005-20260708/{2005..2017}[-intl]/` — 428파일
  - 구성: xls 335 / pdf 39 / xlsx 37 / hwp 17 (합 214MB)
  - manifest: `data/sources/manifests/20260708-kaaf-backfill-2005-2017-manifest.json`
    (파일별 sha256·원본URL·연도) + `.ultra/docs/research/kaaf-backfill-2005-20260708/`
- 로컬에 원본이 없으면 사장님 보관 아카이브
  (`kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz`)를
  `tools/import-kaaf-backfill-originals.js`로 재임포트.

### 출력 스키마 (기존과 동일 — 절대 변경 금지)

`data/results/<year>.json` = 대회 배열:

```json
{
  "competitionId": "2005-track-001",
  "toCd": null,
  "competitionName": "…",
  "year": "2005",
  "period": "2005-05-01 ~ 2005-05-03",
  "venue": "…",
  "events": [{
    "event": "남자 100m 결승", "division": "남자부", "date": "…", "venue": "…", "wind": "…",
    "results": [{"rank": 1, "name": "…", "affiliation": "…", "record": "…",
                 "personal_best": "", "note": "", "newRecord": ""}]
  }]
}
```

- `competitionId` 규칙: `<year>-<track|road>-<seq>` (기존 2018+ 패턴 준수).
- `resultsStore.js`/`coverage-matrix` 등 기존 어댑터가 무수정으로 읽혀야 한다.

### 진행 방식 (필수)

1. **xls/xlsx 먼저 (372파일, 87%)**. pdf/hwp는 후속 단계로 분리 —
   이번 사이클에서 무리하게 포함하지 말 것.
2. 변환 엔진은 `tools/normalize-legacy-results.js` (또는 유사)로 작성,
   파일 단위 idempotent + `--year` / `--file` 단위 실행 지원.
3. **파싱 실패/모호 행은 버리지 말고 격리**: `.omo/evidence/legacy-results-normalization/`
   아래 연도별 리포트(성공/실패/스킵 카운트, 실패 사유)를 남긴다.
4. 연도 하나 완료 시마다:
   - `data/results/<year>.json` 커밋 (정규화 결과는 공개 안전 데이터)
   - `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv`
     해당 연도 → `candidate_review_needed` (스팟체크 대기) 갱신
   - 스팟체크(대회 2~3개 원본 대조) 통과 후 → `complete`
5. **연도별로 PR을 쪼갤 것** (한 PR에 13년치 금지). 권장 묶음: 2015–2017 → 2012–2014 → … 역순
   (최근 연도가 포맷이 깨끗하고 검증 대조가 쉬움).
6. 완료 연도부터 서비스 카피 갱신: RecordsPage의
   "지금은 2018년 이후 기록을 보여드려요 (2005-2017 기록은 정리 중)" 문구를
   실제 커버리지에 맞게 수정 (관련 계약 테스트 UX-COMBINE-003도 함께).
7. 과업 2의 dedup이 먼저 머지되어 있어야 함 — 레거시 연도가 들어오면
   TOP100의 2005–2017 행(연 18~1,165행)과 대량 중복이 생기기 때문.

### 데이터 보호 (절대 규칙 재확인)

- 원본 파일(xls/pdf/hwp) 커밋 금지 (.gitignore 확인).
- 생년·식별자(PERSON_NO 등)·연락처가 원본에 있어도 **정규화 출력에 넣지 않는다**.
- dataRequestService 마스킹/숨김이 새 데이터에도 그대로 적용되는지 테스트.

### 완료 조건 (DoD, 연도별)

- [ ] `data/results/<year>.json` 생성 + resultsStore 로드 성공
- [ ] 대회 2~3개 스팟체크 (원본 vs JSON 행 수·1~3위 기록 일치)
- [ ] 실패/스킵 리포트 커밋
- [ ] year-checklist 갱신 + validator 통과
- [ ] npm test + frontend build 그린

---

## 우선순위와 순서

```
과업 1 (승격) ─┐
               ├─ 같은 PR 가능, 즉시 착수 (P0)
과업 2 (dedup) ┘
과업 3 (정규화) — 과업 2 머지 후 착수, 연도 묶음별 PR (P1)
```

## 보고 형식

- 각 PR 본문에: 변경 행 수 / 테스트 결과 / 스팟체크 증적 경로.
- 막히면 (포맷 파악 불가 파일, 스키마 판단 필요 등) 해당 파일 목록을
  `.omo/evidence/`에 남기고 PR 코멘트로 질문 — 임의 판단으로 스키마 바꾸지 말 것.
