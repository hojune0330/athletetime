# AthleteTime — 데이터 전략 진행 경과 로그

> 목적: 선수 동일인 식별(person_no)·외부 데이터 전략의 **논의·결정·진행을 시간순으로 기록**한다.
> (선생님 지시 2026-06-07: "이 진행 자체도 깃에 기록해놔.")
> 이 로그는 분쟁 시 **"선의로 단계를 밟아 신중히 설계했다"는 증거**로도 기능한다.
> 상위 기준: `athletetime-data-strategy-master.md`

---

## 의사결정 요약 (Decision Log)

| 일자 | 결정 | 근거 | 결정자 |
|---|---|---|---|
| 2026-06-07 | "검색엔진+출처" 모델 채택 | 법적·정체성 양면 정합 | 선생님 |
| 2026-06-07 | `result.kaaf` 영구 제외 | robots.txt `Disallow:/` 실측 | Claude 제안→합의 |
| 2026-06-07 | pis2(관리자층) 서비스 범위 제외 | 우리는 색인자이지 행정주체 아님 | 합의 |
| 2026-06-07 | **person_no B안(판단 후 폐기)** 확정 | 개인정보 보유 회피, 식별효과 유지 | 선생님 승인 |
| 2026-06-07 | 저장범위: **기록(사실)=저장 / 생일·고유번호=미저장** | 사실/식별정보 분리 | 선생님 승인 |
| 2026-06-07 | 미성년: 사실기록은 성인과 동일, 민감 부가정보는 더 보수적 | 한국 법·정서 | 선생님 위임→Claude 권고 |
| 2026-06-07 | 사전 협조요청 **건너뜀** | 가능한 부분만 처리 | 선생님 지시 |
| 2026-06-07 | 해외 사례·공공데이터 기반 설계 | 업계 표준관행 정당성 | 선생님 지시 |

---

## 세션별 타임라인

### 세션 A — 문제 제기 (선수 고유 ID)
- 선생님: "선수가 매년 소속 갱신 → 고유 ID가 기록을 따라다닌다. 이 정보를 가져오거나 파싱 가능한가?"
- Claude: 우리 원천데이터(2018~2026, 91,004행)에 **식별자 없음** 확인.
- 1차 조사: KAAF `result.kaaf`에서 `person_no`(예: 199507325584) 노출 확인. data.go.kr/15052695는 라이선스 자유(상업OK)이나 ID·생일 없음.

### 세션 B — "구글 모델" 제안
- 선생님: "데이터 천천히 다 가져와 검색엔진화하고, 구글처럼 출처 남기면 되지 않나?"
- 추가 조사(코치 가이드): 개인번호(영구)/선수번호(연도별) 2종 구조. pis2=관리자, g1=본인만, KAAF 공개페이지=가장 풍부.
- Claude: 출처 우선순위(공공데이터 골격 / www.kaaf 보조 / result.kaaf·pis2 제외) + 정도 6원칙 제안.

### 세션 C — 검토 우선(순차안 C) 착수
- 선생님: "순차. 검토부터 확실하게. 문제 심해질 것 같으면 미리 걱정해두자."
- **실측(2026-06-07):**
  - `www.kaaf.or.kr/robots.txt` = `Disallow: /kafadmin/` (공개페이지 허용)
  - `result.kaaf.or.kr/robots.txt` = `Disallow: /` (**전면차단**) ← 방향전환 결정타
  - KAAF 약관 제13조: 영리행위 금지·재배포 금지·타인 개인정보 수집 금지 (회원 대상)
- 산출: legal-review / identity-architecture / kaaf-poc-plan (커밋 `c0908f2`)

### 세션 D — 법적 회색지대·B안 논의
- 선생님: "person_no 저장범위가 어디까지? 해외에도 이런 서비스 있나?"
- Claude: 저장범위 명확화(기록✅/생일·고유번호❌). **B안(person_no 판단후 폐기)** 권고.
- 해외 실측: Tilastopaja(선수 129만·기록 1,756만, 유료), World Athletics 공식 API, OpenTrack, TFRRS, Athletic.net, MileSplit, DirectAthletics("자동 선수추적"), alltime-athletics, Kaggle 50만건.
  → "기록 검색·비교·선수추적"은 **글로벌 표준 산업**임을 확인.
- 방어전략 논의: 6겹 방어선. "빠져나가려는 회색지대"가 아니라 "권리존중에서 자연히 생기는 회색지대" 원칙.

### 세션 E — 전략 종합·확정 (현재)
- 선생님: "민감정보는 네 추천대로. 해외사례·공공데이터 기반 설계. 해외 수집도 고려. 차근차근 보고하고 단계별 진행, 진행 자체를 깃에 기록."
- 산출:
  - `athletetime-data-strategy-master.md` (마스터: 저장정책·B안·6겹 방어선·해외사례·출처전략·로드맵 S0~S7)
  - 기존 3문서에 마스터 참조·B안·해외사례 반영
  - 본 진행 로그 신설
- **코드 변경 0건.** 실제 구현은 마스터 §7 Go 조건 + 단계별 재승인 후.

---

### 세션 F — S2 구현 (identityResolver 스켈레톤)
- 선생님: "좋아 너의 작업 단계 진행해."
- Claude: 가장 무해한 S2부터 착수.
- 산출:
  - `card-studio/services/identityResolver.js` (신규) — 매핑 파일 읽어 canonicalId 해석.
    빈 파일이면 항상 null → graceful fallback. person_no 비보유(B안). 외부호출 0. mtime 캐시.
  - `data/identity/athlete-map.json` (신규, 빈 entries) — 스키마 정의, person_no 필드 없음.
  - `recordAnalyticsService.js` — athleteKey 산출시 `resolver.resolve() || baseKey` 연동.
- **검증:**
  - 빈 매핑 회귀: athlete cards **16,853** / records **64,712** — c9ff4e7와 동일(0% 변경) ✅
  - 매핑 주입 병합: "폴 킵케모이 킵코리르"(케냐+청양군청) → 한 카드로 병합, cards 16,853→**16,852**,
    소속이력 [케냐,청양군청] 연도 [2018~2026], 기록 7건(5+2) 통합, 총 records 64,712 불변 ✅
  - HTTP 4종(filters/search/athlete/season) 모두 **200** ✅
  - 프론트 빌드 **성공**(13.82s) — API 응답형태 불변(athleteKey 필드 유지) ✅
- 매핑 파일은 검증 후 **빈 상태로 복원**(프로덕션 기본=현행 동작).

### 세션 G — S1 구현 (공공데이터포털 연동 골격)
- 트리거: 선생님 "좋아 1 진행" + 서비스 미리보기 링크 제공.
- 대상 데이터셋: 공공데이터포털 **대한체육회_선수등록정보**(data.go.kr/15052695).
  - 필드: 등록년도/성별/종별/종목/세부종목/소속/소속구분/소속세부구분/시도. 약 3,495,371행. 연 1회 갱신.
  - 라이선스: **이용허락범위 제한 없음(영리 가능)**. **개인식별정보(이름·개인번호·생년월일) 없음** → 익명 거시통계 전용.
- 설계 결정:
  - Open API는 활용신청 키 필요 → 골격은 **키 없이 CSV(ZIP) ingestion** 우선.
  - **동일인 식별 아님**(데이터에 ID/이름 없음). 연도별/시도별/종목별 **익명 분포**만 산출. (식별은 S3 PoC 영역)
  - **출처표기(source attribution)** 항상 동봉. 공란="미집계" 처리.
- 산출:
  - `card-studio/services/publicDataService.js` (신규) — 의존성 없는 CSV 파서 + 거시통계(getDistribution/getBreakdown) + getStatus/clearCache. 파일 없으면 `available:false`+ingestion 안내(throws never). mtime 캐시. 네트워크 호출 0.
  - `data/public/krsport/README.md` (신규) — 출처·필드·ingestion 경로(다운로드→`athlete-registry.csv` 배치, CP949→UTF-8 변환) 문서화.
  - `.gitignore` — `data/public/krsport/*.csv` 추적 제외(대용량 갱신물). README/스키마만 추적.
- **검증:**
  - CSV 없을 때: `available:false`, `reason:'no_file'`, ingestion 안내 반환 — 예외 없음 ✅
  - 샘플 6행: byYear(2025=4/2024=2), byRegion(서울3/경기2/부산1), byGender(남3/여3), bySport(육상5/수영1) 정확 ✅
  - 공란→"미집계" 집계 정상 ✅ / 필터(시도=서울)+차원(종목) breakdown 정확(육상2/수영1) ✅
  - 회귀: recordAnalyticsService athlete cards **16,853** 불변(독립 추가물, 기존 영향 0) ✅
  - 프론트 빌드 **성공**(14.57s) / HTTP filters·health·spa **200** ✅
- 샘플 CSV는 검증 후 **제거**(프로덕션 기본=파일 없음=현행 동작).

### 세션 H — 실서비스 직전 정비: 진단 + S3 PoC + 운영데이터 API 노출
- 트리거: 선생님 "실제 운영 직전에 필요한 것만 정리. 1(S3)·3(운영데이터)만 하되,
  3은 어차피 재정비할 것을 염두. 지금 웹은 정보·구조·검색이 중구난방."
- **(A) 현태 진단 + 재정비 설계서** `docs/athletetime-ia-search-redesign-plan.md` (신규)
  - 실측: **검색 진입점 3중 분열** — Header SearchBar(`console.log`만, 미작동) /
    MainPage 검색(→`/competitions`) / RecordsPage(진짜 `/analytics`). 목적지 불일치.
  - 사이드바 **깨진 링크**(`/events`,`/track`,`/market`,`.html` 직접링크) = 구버전 IA 잔재.
  - 페이지 26개 과잉·위계 없음, "통합 플랫폼" 카피 ↔ "기록 아카이브" 정체성 충돌.
  - To-Be: 단일검색 / 3-tier IA / 신뢰프레임 일관. **불변식 계약**(백엔드 단일·출처필드·식별자격리·부가결합0·라우트단일출처)로 재수정 비용 최소화.
- **(B) S3 PoC** `tools/identity-poc.js` (신규, 오프라인/무해, 네트워크0·파일쓰기0)
  - 로컬 인덱스만으로 동일인 매칭 거동 측정 + person_no 폐기(B안) assert 검증.
  - 측정: 전체 16,853명 중 **동명 클러스터 3,383개**(약 20%). 후보쌍(100클러스터) 6,879.
  - 1차(흔함패널티 없음): 김민서30명·김민지29명을 0.95로 **과병합**(오매칭) → 위험 확인.
  - 보정(이름 흔함=클러스터크기 강한 감점) 후: **자동병합 0.0%**, 흔한 이름 전부 reject.
  - **핵심 결론**: 이름+소속만으론 자동 동일인 판정 불가 → **person_no(B안) 정당화** 정량 입증.
  - person_no 유출 0(assert 통과). `docs/athletetime-kaaf-poc-plan.md` §5.5 에 결과 기록.
- **(C) 운영데이터 API 노출(골격)** `card-studio/routes/publicDataRoutes.js` (신규, Claude 소유)
  - `/api/public-data/{status,distribution,breakdown}` — publicDataService 계약 그대로 노출.
  - 모든 응답에 `source` 동봉(신뢰프레임). CSV 미배치=available:false+안내(HTTP 200).
  - `src/server.js` 에 `/api/public-data` 마운트(publicLimiter). Codex 소유 publicRoutes.js 미수정.
- **검증:**
  - CSV 없음: status/distribution `available:false`+출처+안내, HTTP 200 ✅
  - CSV 샘플5행: distribution(연도/시도/성별/종목/종별) 정확, breakdown(서울→육상2/수영1) 정확 ✅
  - dimension 누락: HTTP 400 ✅ / 샘플 제거 후 available:false 복원 ✅
  - 기존 analytics/filters·health·spa **200**(영향 없음) ✅ / 모듈 로드 OK ✅

### 세션 I — Trust 문서 정비 (Codex 안전감사 병행, 코드 hot-zone 미수정)
- 트리거: Codex가 head 4899eed 동기화·안전감사 진행 / Claude는 문서·카피·정책만.
- Codex 감사 결과(공유받음): node --check 통과, public-data graceful(available:false/no_file),
  identityResolver 빈매핑 fallback, identity PoC 자동병합 0건·person_no 유출 false.
- **(1) person_no 표현 B안 통일**
  - `legal-review.md`: 권장경로(c)·약관 금지행위7·R3·R6·정도원칙5·Go체크리스트를
    "저장하되 비노출" → "판단 후 즉시 폐기, 저장 안 함(B안)"으로 일괄 교정. R3 등급 하향.
  - `identity-architecture.md`: Layer3 다이어그램·매칭규칙 표·확정원칙 문단을
    "내부 식별키" → "일시 판단보조, 저장/노출 금지"로 통일. canonicalId가 내부키 역할 대체 명시.
- **(2) `legacy-collector-policy.md`(신규)**: result.kaaf 수집기/데이터 잔재 동결 기준.
  - scraper.js·config.js(resultBase=result.kaaf)·pipeline/watcher/selectors가 전면차단 도메인 하드코딩 확인.
  - "현재 서비스 신규 수집 경로 사용 금지" + 허용/금지 매트릭스. 코드 미수정(allowlist 가드는 Codex 영역).
- **(3) `copy-proposals.md`**: 실서비스 직전 카피(권장/피해야할/이유).
  - /records 검색 5종(보유데이터·공식아님·동명이인·정정요청·출처), 랭킹/성장그래프 공식오해 차단,
    공공데이터="선수 등록 통계"(❌"선수 DB"), 정정요청 담백화.
- 금지 준수: hot-zone 코드 0건 수정 / person_no·생년월일·원본식별자 저장·노출 전제 없음 / 공식랭킹·인증 문구 없음.

### 세션 M — 직접 입력 전환 + 가짜데이터 제거 + 보안 점검 + 디버그 (커밋 `3e62550`)
- 트리거(선생님): "직접 입력하게 해. 예시를 줄 필요 없어. … 남은 관찰…오류/디버그 잡고, 가짜 파일/데이터 지우고, 보안 점검." (Codex 작업로그 참고용 첨부)
- **(1) 직접 입력(예시 제거)**
  - `SearchBar.tsx`: "검색 예시" 드롭다운 전면 제거 → 입력창만.
  - `CompetitionsPage.tsx`: "🔥 검색 예시" 칩 블록 + 힌트 인라인 예시(예:100m…) 제거, 미사용 `quickSearch` 제거.
  - `RecordsPage.tsx`: StartPanel 추천/예시 칩(popularEvents) 제거 → "검색창에 직접 입력" 안내 + "시즌 기록표 보기" 진입만.
- **(2) 가짜 데이터 제거**
  - `frontend/src/data/athleteRecords.ts`: 가짜 선수 3명·샘플 source marker 제거 → `athleteProfiles=[]`(타입 유지). API 없으면 빈 상태로 폴백.
  - 소비처(`recordInsights.ts`/`AthleteInsightShowcase.tsx`) 샘플 표현 정리. (※ `data/results/*.json`은 실제 공개기록 — 동명의 실명은 정상, 삭제 금지로 확인)
- **(3) 보안 점검**
  - `backend/utils/jwt.js`: 운영 JWT_SECRET 미설정 시 기동 실패, 개발은 무작위 임시 secret(하드코딩 기본값 제거).
  - `backend/auth/routes.js` set-admin: 하드코딩 관리자 승격키 제거 → 미설정 시 엔드포인트 비활성화(검증 완료: 기존 기본키로 호출 시 차단).
  - `backend/utils/db.js`: Mock DB 관리자 비번 하드코딩 제거→무작위, 평문 로그 제거, 운영에서 Mock DB 차단.
  - `backend/database/seed.js`: 공지글 비번 `'admin'` → 환경변수/무작위.
- **(4) 디버그/운영안정**: analytics 첫 호출 인덱스 동기빌드 지연(보온 전 6.4s)을 부팅 예열로 해소 → 첫 요청 ~56ms.
- **충돌 해소**: 작업 중 Codex가 동일영역(`fd4369b`)을 push. 내 커밋을 리베이스. 보안 파일=내 안(예측가능 기본값 완전제거) 우선, 데이터 타입(`collected_public_record`)·`warmup()`=Codex 안 우선, 예열 중복 정리. type-check/build 통과.

## 다음 액션 (대기/예정)
- [x] S2 identityResolver 스켈레톤 — 완료(세션 F)
- [x] S1 공공데이터 연동 골격(publicDataService) — 완료(세션 G)
- [x] S3 PoC 오프라인 1차 측정(person_no 정당화 입증) — 완료(세션 H)
- [x] 운영데이터 거시통계 API 노출 골격 — 완료(세션 H)
- [x] IA/검색 재정비 설계서(불변식 계약) — 완료(세션 H)
- [x] Trust 문서 person_no B안 통일 + 레거시 수집기 정책 + 카피 — 완료(세션 I)
- [x] 3차 UX Microcopy Pack(짧은 화면 문구 패키지) — 완료(세션 J, 코드 미수정)
- [x] (Codex) 검색 진입점 단일화 — 완료(커밋 `68de3ac`, Codex 작업)
- [ ] (Codex 협의) 사이드바 링크 교정 + SearchBar 더미 제거 잔여분
- [ ] (운영) data.go.kr CSV 실데이터 배치 → 거시통계 대시보드 노출(프론트=Codex)
- [ ] (선생님 결정) S3 실제 외부 PoC(소수 표본) 착수 여부 — robots/약관 Go조건 충족 후
- [ ] World Athletics 공식 API 약관·키 조건 확인(S4 준비)
- [ ] 삭제 SLA 시간 확정(S6)

---

## 커밋 추적
| 커밋 | 내용 |
|---|---|
| `c9ff4e7` | 데이터 무결성 수정(방향/결합종목/팀정규화/suppression) |
| `6817997` | 화면별 신뢰 카피 제안 |
| `c0908f2` | legal-review + identity-architecture + kaaf-poc-plan |
| `2ffe309` | strategy-master + 진행로그 + 기존문서 갱신 |
| `b188c96` | S2: identityResolver 스켈레톤 + recordAnalyticsService 연동 |
| `d6386fe` | S1: publicDataService(공공데이터 CSV 골격) |
| `4899eed` | 세션H: IA/검색 진단 + S3 PoC + 공공데이터 API |
| `431e394` | 세션I: person_no B안 통일 + legacy-collector-policy + 카피(코드 미수정) |
| `68de3ac` | (Codex) 검색 진입점 단일화 |
| `bd67797` | 세션J: 3차 UX Microcopy Pack(athletetime-records-microcopy.md, 코드 미수정) |
| `29a6a82`/`669c107` | (Codex) microcopy UI 반영 |
| `bdf9f28` | 세션K: 리뷰 후 잔여 카피 패치 — 신뢰칩 긍정형/시즌·선수 고지문 톤통일/지표 라벨 축약(프론트+백엔드) |
| `ba09584`/`c512c4c` | (Codex) records 진입 패널 + Footer 톤 정리 + 커뮤니티 401 빈 상태 |
| (이번) | 세션L: 랜딩 실명 미성년 칩 제거 → 익명 "기록이 많은 종목" 데이터 진입(신규 popular-events API + 프론트 칩 교체 + SearchBar/CompetitionsPage 예시 실명 제거) |
| `fd4369b` | (Codex) records analytics 런타임 안정화(warmup/캐시) + 가짜 seed 제거 + 보안 |
| `3e62550` | 세션M: 직접 입력 전환(검색 예시/추천 칩 전면 제거) + 가짜선수데이터 제거(athleteRecords 빈배열) + 보안 점검(JWT/관리자비번/set-admin 기본값 제거·운영 Mock DB 차단) + analytics 예열 중복 정리. Codex `fd4369b`와 리베이스로 충돌 해소(보안=내 안 우선, 데이터타입/warmup=Codex 안 우선) |
| `d6386fe` | S1: publicDataService(공공데이터 CSV 골격) + krsport README + gitignore |
| (이번) | 세션H: IA/검색 진단·재정비 설계서 + S3 PoC(identity-poc) + 공공데이터 API 노출(publicDataRoutes) |
| `b7a96be` | 세션N(Task1 데이터 정합성·신뢰 검수): data-quality-trust-report.md(91,004행 스캔 — 미성년 노출 58.3% 최우선 리스크, 빈 기록 28.9%는 깨진게 아니라 경기상태 불참/기권/무기록/실격, 종목명 코드노출, 파싱깨짐 8행, 빈 소속 11,154) + recordStatus.ts(빈 기록 → 경기상태 라벨 변환) + RecordsPage 상태 인지 표시. 데이터 파일 미수정(분석만). 탐지엔진/집계 API/코드매핑=Codex 분담(PR 4645126971) |
| `54b8e0c` | 세션N(Task3 빈상태/에러 카피 통일 + Task4 커뮤니티 DB-비활성 빈상태): CompetitionsPage 미래약속 카피('곧 추가될 예정'/'곧 추가됩니다') 제거 → '공개된 결과를 모아 보여줘요' 신뢰톤 / RightBanner '곧 업데이트됩니다!' → '공개된 일정이 모이면 여기에 보여드려요' / PostList ErrorDisplay 비-401 경로의 raw error.message 노출 차단(DB/기술정보 누설 방지) → '커뮤니티를 준비 중이에요' 클린 안내(DB 비활성 케이스 포함) + EmptyState 신뢰톤. 금칙어 스캔 클린, type-check/build 통과 |
| `398ba09` | (Codex) data-quality + anonymous insights API: `/api/card-studio/analytics/data-quality`(읽기전용 mutation:none, 91,004행 진단) + `/analytics/insights`(eventConcentration/regionActivity/seasonPulse, minGroupSize 강제·이름/소속/선수키 비노출) |
| `d62345b` | 세션N(Task2 흥미로운 진입 — 인사이트 카드): Codex insights API를 records 시작 화면에 연결. AnonymousInsightCards 3종(기록이 많은 종목=클릭 시 시즌표로 / 최근 기록이 모인 주=주간 막대 / 기록이 모인 지역=한글 라벨). **신뢰 가드(Claude 도메인): 지역 카드는 식별 지역 ≥2곳일 때만 노출(Unknown 172 vs 9 편중 오해 방지), pulse는 버킷 ≥2일 때만, 카피는 순위/평가/예측/공식 회피 + "순위나 평가가 아니에요" 고지, 로드 실패 시 조용히 숨김.** type-check/build 통과 |
| (이번) | 세션N(아이덴티티 ROI 의사결정): `athletetime-identity-roi-decision.md` — "고유번호로 전체 검증·정제"가 ROI 나쁨을 91,004행 실측으로 입증. **동명이인 의심 행 86.2%(77,286), 같은해 다소속 동명이인 4,735명 vs 진학 712명(6.6배)**. 권고: 전체 정제 ❌ → "합치지 말고 나란히+경고"(이미 구현) + 진학 712명만 규칙기반 안전병합(고유번호 불필요) + 고가치 소수만 나중에 Layer3. Codex 분담: 파싱쓰레기 이름 행 격리 + 동명이인 카운트 지표 + 712명 안전병합 엔진 |
| (이번) | 세션N(아이덴티티 최종 결정 승인 반영): 선생님 회신("더 보수적으로") 반영 — identity-roi-decision.md에 승인 결정 §0-A 확정(동명이인 비합치 / 진학 712명도 확정병합 금지=추정·opt-in만 / Layer3 고가치소수 한정 / person_no 미저장 / 파싱쓰레기 색인제외·원본보존). self-claim-record-grouping.md 신규(본인 인증/요청 기반 "내 기록 묶기" 흐름·L1~L3·shadow cluster·카피원칙). RecordsPage UX 강화: 같은 이름 후보 ≥2명이면 "이름이 같은 선수가 N명 보여요 + 합치지 않아요 + 본인확인 필요" 배너, 카드별 "이 소속·연도 기록만 모았어요·다른 선수일 수 있어요"(ambiguity 기반). type-check/build 통과 |
| (이번) | 세션N(전체 정제 금지 원칙 마스터 문서 교차링크): `athletetime-data-strategy-master.md`에 §2.1 신규 — person_no 기반 "전체 선수 정제" 금지를 B안 연장선에서 마스터 원칙으로 확정(동명이인 비병합 / 진학 712명 추정·opt-in 한정 / Layer3 고가치소수 / 전체 일괄정제 금지 / "내 기록 묶기"=본인 인증·요청 기반 / 파싱쓰레기 색인제외·원본보존). §7 No-Go에 "전체 정제·동명이인 자동병합" 추가, §8 추적항목 결정완료 체크 + Codex 분담 명시, 헤더 갱신일·관련문서 링크 보강(roi-decision/self-claim). 코드 미수정(docs only), 금칙어 클린 |
| `9ef723a` | (Codex) 보수적 shadow cluster: 파싱쓰레기 이름 색인 제외(numeric-name 0) + data-quality에 동명이인/진학 후보 지표 + 추정 전용 `GET /analytics/identity/shadow-cluster?athleteKey=`(확정병합❌·person_no 미사용/미저장·athleteKey 없으면 summary만) + 전체 person_no 정제 금지 코드 가드(identityPolicy.js). 실측: indexed 64,325/16,467, shadowClusterNames 904 / keys 2,008 |
| (이번) | 세션N("같은 선수로 추정되는 기록" 제안 카피 UI 연결 — Claude 몫 완료): recordAnalytics.ts에 ShadowCluster 타입 + getShadowCluster() 추가. EstimatedSameAthleteCard.tsx 신규 — 선수 상세(profile ready + selectedAthleteKey)에서만 노출, 추정 전용 카드. **신뢰 원칙: "추정"은 반드시 "직접 확인" 안내와 짝 / "자동으로 합치지 않아요"·"동명이인일 수 있어요" 명시 / confidence 숫자(0.71 등) 비노출→"추정 강도: 보통/낮음" 정성표현 / cluster 없거나 로드 실패 시 조용히 숨김 / "순위·공식 기록 아니에요" 고지.** 현재 보고 있는 기록은 제외하고 다른 추정 segment만 제안(클릭 시 handleSelectAthlete로 이동). type-check/build 통과, 금칙어 클린(매치는 모두 부정문), 실 API 200(김민조: 서울체육중2018→서울체육고2019-21, band medium) |
| (이번) | 세션N(기록 탐색·비교 설계 + 다종목 선수 추이 1차): athletetime-record-exploration-design.md 신규 — 탐색 5축(선수/종목·시즌/추이/비교/신기록) + 다종목 선수(실측: 5종목↑ 577명·3종목↑ 2,469명·3연도↑ 2,149명, 9시즌 49종목 56부문) 종목별 추이 설계 + 비교(나란히 보기) + 신기록은 "모은 범위 안에서"로만 보수 표기 + Codex/Claude 분담. **AthleteEventTrail.tsx 신규(Claude 1차 구현): 선수 프로필 "기록 발자취"를 종목 전환 칩(events≥2일 때만) + 기간 토글(전체/최근3년/최근1년) + 종목별 추이 그래프로 업그레이드.** 단위 다른 종목 미혼합(종목 1개만 그림), 변화량은 사실값만+"순위·평가 아님" 고지, 기록 2개 미만이면 그래프 대신 안내. 현재는 records[]를 종목별 그룹핑(서버 events[].trail 나오면 교체 예정). 기존 RecordTrailChart 제거. type-check/build 통과, 금칙어 클린(매치는 부정문) |
| `dbd0f82` | 세션N(기록 발자취 종목 칩 투명 버그 수정): `brand` 컬러 토큰에 DEFAULT 키가 없어 bare `bg-brand`/`border-brand`가 무배경(투명)으로 렌더 → 선택된 종목 칩이 흰 글자/투명 배경으로 "사라져" 보임. tailwind.config.js의 brand 토큰에 `DEFAULT:'#0D5F5A'` 추가(Header/MainPage의 bare bg-brand도 정상화) + AthleteEventTrail.tsx 활성 칩을 명시적 `bg-brand-500`/`border-brand-500`(Footer가 쓰는 정상 컨벤션)로 스코프. 검증: 활성 칩 computed bg = rgb(13,95,90)=#0D5F5A 솔리드, type-check/build 통과 |
| (이번) | 세션N(비교 UX + 확산 전략 제안서): `athletetime-compare-and-virality-strategy.md` 신규 — (A)선수 비교 두 모드(1:1 직접 + 다중선택 "비교 트레이"→"나란히 보기", 같은 종목·단위만·다선수 라인 오버레이) + 신뢰 가드(대결/순위 단어 금지, 공통종목 없음/표본 2개 미만 처리, windLegal 배지, 학생 보호 고지) + compare API 보강(commonEvents). (B)확산 전략 핵심: **"누가 이겼나"가 아니라 "내가 얼마나 왔나"** — 자랑 기준점을 타인이 아니라 "과거의 나/자신의 폭"으로 이동시켜 공격적 확산과 비랭킹 원칙을 양립. 성장/다종목/꾸준함 자랑 카드(정사각·세로, 딥링크 워터마크 "모은 공개 기록·공식 아님"), 확산 루프(놀람 트리거→자랑카드→공유=신규유입), "조금 네거티브"는 본인 opt-in 사실값 한정(타인 낙인 금지). 신뢰 정합성 표 + 선생님 확인 필요 4개 결정포인트(확산톤 승인/부정사실 노출/비교인원 상한/워터마크 문구). 코드 미수정(docs only) |
| `3a5cea4` | 세션N(P1-7-3 하이라이트 배지): `AthleteHighlightBadges.tsx` 신규 — 선수 요약 지표 아래 "눈에 띄는 점" 사실 배지(기록 가장 많은 종목/모은 종목 수+상위3/기록 모은 기간·N년 연속/기록 변화 가장 큰 종목=같은 종목 처음→최근 부호값). 신뢰: 평가어 금지·타인 비교 없음·표본부족 조용히 숨김(≥2건/≥2종목/≥2연도)·단위 혼합 금지·"순위나 평가가 아니에요" 고지. profile.events/records 클라 계산. type-check/build 통과, 금칙어 클린(주석/부정문) |
| `90e0f27` | 세션N(P1-7-1 비교 트레이): `useCompareTray.ts`(localStorage v1, add/remove/toggle/clear, 상한 4, 커스텀이벤트+storage 동기화) + `CompareTray.tsx`(하단 고정 바, 제거가능 칩, 비우기/나란히보기[≥2], "순위·우열 아님·동명이인" 고지) + RecordsPage("+비교에 담기" 검색결과 카드·선수패널 헤더, 초과 시 "최대 4명" 안내, ?compare= 라우팅). 검색결과 카드 button→div+내부 select-button 재구성(중첩 버튼 방지). 활성 토글 bg-brand-500. type-check/build 통과, 실측 2명 담기→2/4명 |
| `9c91aeb` | 세션N(P1-7-2 나란히 보기): `CompareView.tsx` 신규 — ?compare=k1..k4, 선수별 profile 개별조회→공통 종목(교집합)만 비교(단위 혼합 방지) + 공통종목 칩 + 다선수 라인 오버레이 SVG(색으로만 구분, y축 방향은 가독성 목적·중립) + 선수별 베스트/기록수/기간 표(windLegal=false면 "참고용·풍속 초과" 배지) + 빈약상태 처리(2명 미만/공통종목 없음/표본<2) + "순위·우열 아님·동명이인·풍속·제공:대한육상연맹" 고지. Codex compare API 나오면 교체 가능. type-check/build 통과, 실측 김우현 2명(높이뛰기/멀리뛰기/포환 공통) |
| PR `4688101478` | Codex 브리핑: compare API(athleteKeys≤4, commonEvents+direction) + events[].trail/delta 요청, KAAF·빈 sourceUrl 공유, 경계 명시 |
