# 레거시 수집기 운영기준 — result.kaaf 잔재 사용 금지

> 작성: 2026-06-07 · 작성자: Claude(인문/신뢰 도메인)
> 목적: 과거 세션에서 만들어진 KAAF 수집기/데이터 잔재가 **현재 서비스의 신규 수집 경로로
> 재사용되지 않도록** 운영 기준을 명문화한다. (코드 변경 아님 — 정책/주석 기준)
> 관련: `athletetime-data-acquisition-legal-review.md`(robots 실측), `athletetime-data-strategy-master.md`.

---

## 1. 한 줄 원칙
**`result.kaaf.or.kr` 계열 수집 코드/데이터 잔재는 "동결(frozen)" 상태로 둔다.
현재 서비스의 신규 수집 경로로 절대 사용하지 않는다.**

근거: `result.kaaf.or.kr`의 `robots.txt` = `Disallow: /` (전면 차단, 2026-06-07 실측).
검색엔진·색인자를 표방하는 본 서비스의 정체성과 정면으로 충돌하므로 **영구 제외 대상**이다.

---

## 2. 잔재 인벤토리 (현재 코드베이스, 읽기 기준)
다음 파일들에 `result.kaaf.or.kr` / `playerHistory` / `person_no` 관련 과거 코드·데이터가 남아 있다.

| 경로 | 성격 | 운영 기준 |
|---|---|---|
| `card-studio/config.js` (`resultBase: 'http://result.kaaf.or.kr/...'`) | 수집기 설정 | **신규 실행 금지.** 새 수집은 공공데이터/허용 도메인만. |
| `card-studio/scraper.js` | result.kaaf 결과 파서 | **신규 수집 실행 금지.** 과거 산출물 해석용으로만(가급적 미사용). |
| `card-studio/pipeline.js` / `watcher.js` / `selectors.json` | 수집 파이프라인 | result.kaaf 대상 **자동 실행 금지.** |
| `src/config.js` / `src/scraper.js` / `src/pipeline.js` / `src/watcher.js` / `src/selectors.json` | 위의 미러/구버전 | 동일 — **신규 수집 금지.** |
| `data/competitions/*.json`, `data/raw_duplicates/*.json` | 과거 수집 산출 데이터 | 표시용 경기·기록 사실은 활용 가능하나, **person_no/원본 식별자 필드가 있다면 표시·재배포 금지** 대상. |

> ⚠️ 이 문서는 **코드를 수정하지 않는다.** 위 기준은 운영·리뷰 단계에서 강제한다.
> 실제 코드 가드(allowlist에서 result.kaaf 배제 등)는 Codex가 hot-zone 작업 시 반영한다.

---

## 3. 신규 수집 허용/금지 매트릭스
| 도메인/소스 | robots | 신규 수집 | 비고 |
|---|---|---|---|
| 공공데이터포털 `data.go.kr/15052695` | — (정식 배포) | ✅ 허용(1차 골격) | 라이선스 제한 없음. 익명 등록통계. |
| `www.kaaf.or.kr` 공개 페이지 | `/kafadmin/`만 차단 | 🟡 조건부 | 정도 6원칙 + 사전협조요청 후. 회색지대. |
| **`result.kaaf.or.kr`** | **`Disallow: /`** | ❌ **영구 금지** | 전면 차단. 신규 수집 경로 사용 금지. |
| `pis2.sports.or.kr` (관리자층) | — | ❌ 범위 밖 | 서비스 범위 제외. |

---

## 4. person_no 잔재 처리 기준 (B안과 일관)
- 과거 데이터/코드에 `person_no`(예: `199507325584`, `69222`) 흔적이 있더라도,
  **현재 서비스는 person_no를 저장·표시·재배포하지 않는다.**
- 동일인 판단이 필요하면 판단 시점에만 메모리에서 일시 사용 후 즉시 폐기하고,
  결과로는 무작위 `canonicalId`만 보존한다(B안).
- 따라서 잔재에 person_no가 보이더라도 **서비스 출력 경로로 흘러가서는 안 된다.**

---

## 5. 운영 체크리스트 (배포 전)
- [ ] result.kaaf 대상 수집기(scraper/pipeline/watcher) **자동 실행 스케줄 없음** 확인
- [ ] 신규 수집은 공공데이터/허용 도메인만 통하도록 운영 합의
- [ ] 서비스 출력(API·화면)에 person_no/원본 식별자 필드가 새지 않는지 확인
- [ ] (Codex 협의) 수집 allowlist에서 `result.kaaf.or.kr` 코드 레벨 배제 반영
