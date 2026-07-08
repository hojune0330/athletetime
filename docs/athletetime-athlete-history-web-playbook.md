# 선수이력·상위기록권 자료 조회 플레이북

작성일: 2026-07-07

## 한 줄 결론

필요한 자료는 한 곳에서 끝나지 않는다. 순서는 **대회 결과 첨부 → KAAF TOP 기록 → 선수이력조회 → 해외 공식 결과 재확인**이다. 선수이력조회는 누락 기록을 발견하는 수동 힌트로만 쓰고, 랭킹/상위기록권 워치리스트는 사용자님 또는 담당자가 직접 관리한다.

## 바로 복붙할 작업지시서

아래 지시문을 다른 에이전트나 담당자에게 그대로 전달하면 된다.

```text
AthleteTime 누락 기록 보강 작업을 진행하세요.

목표:
- KAAF 국내/국제 일정 첨부만으로 빠지는 기록을 찾되, 자동 대량 수집은 하지 않는다.
- 상위기록권 후보를 수동으로 확인하고, 선수이력조회와 외부 공식 결과로 교차 확인한다.
- 확인된 사실만 정규화 후보로 남기고, 제한 식별자는 저장하지 않는다.

진행 순서:
1. `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=YYYY`와 `international.asp?currentYear=YYYY`에서 대상 대회의 결과 첨부가 있는지 먼저 확인한다.
2. 결과 첨부가 있으면 대회명, 연도, 날짜, 파일명, 다운로드 URL, 파일 hash를 기록한다.
3. 결과 첨부가 없거나 해외대회 누락이 의심되면 `https://result.kaaf.or.kr/recInfo/topRecList.do`에서 TOP 기록을 수동 조회한다.
4. TOP 기록 조회는 종목·부별·기간·TOP 개수를 명확히 적고, 응답의 `PERSON_NO1` 같은 제한 식별자는 절대 저장하지 않는다.
5. TOP 기록 후보의 선수명을 `https://result.kaaf.or.kr/history/playerHistory.do`에서 수동 조회한다.
6. 동명이인이 있으면 소속, 등록년도, 종목, 선수구분으로 사람이 직접 후보를 고른다. 이름만으로 확정하지 않는다.
7. 상세 팝업은 열 수 있지만 `person_no`는 저장하지 않는다. 원본 HTML도 저장하지 않는다.
8. 상세 팝업에서 필요한 경기실적 한 줄만 임시 메모로 옮긴다.
9. 해당 경기실적은 World Athletics, JAAF, 대만육협, 대회 공식 PDF/HTML 등 외부 공식 결과로 다시 확인한다.
10. 외부 확인이 되면 정규화 후보에 넣고, 안 되면 `held`로 보류한다.

금지:
- `result.kaaf.or.kr` 자동 대량 조회 금지.
- `person_no`, 생년월일, 원본 선수이력 HTML, 주민번호, 전화번호, 이메일 저장 금지.
- 선수이력조회만 보고 공식 기록처럼 공개 금지.
- 동명이인 자동 병합 금지.
- “공식 랭킹”, “전국 N위 확정”, “전체 랭킹” 같은 표현 금지.

완료 조건:
- 확인한 조회 조건과 결과를 표로 남긴다.
- 외부 공식 확인 URL 또는 파일명을 남긴다.
- 저장하지 않은 제한 식별자 목록을 명시한다.
- 공개 가능/보류/폐기 판단을 남긴다.
```

## 완료 보고 양식

담당자는 아래 양식으로 보고한다.

```text
작업명:
담당자:
작업일:

1. 조회 목적
- 예: 2025 남자일반부 800m 상위기록권 누락 해외대회 확인

2. KAAF 일정/결과 첨부 확인
- 국내 일정 URL:
- 국제 일정 URL:
- 결과 첨부 있음/없음:
- 첨부 파일명:
- 첨부 URL:
- 파일 hash:

3. TOP 기록 수동 조회
- URL: https://result.kaaf.or.kr/recInfo/topRecList.do
- 기간:
- gubun:
- kind_cd:
- detail_class_cd:
- rank_cnt:
- check_round:
- check_ref:
- 확인한 후보:

4. 선수이력조회 수동 확인
- URL: https://result.kaaf.or.kr/history/playerHistory.do
- 검색 선수명:
- 동명이인 수:
- 선택 근거:
- 확인한 경기실적 한 줄:

5. 외부 공식 결과 재확인
- 확인 출처:
- URL 또는 파일명:
- 일자:
- 대회명:
- 종목:
- 기록:
- 순위/라운드:

6. 제한 식별자 처리
- person_no 저장 여부: 저장 안 함
- 생년월일 저장 여부: 저장 안 함
- 원본 HTML 저장 여부: 저장 안 함
- 기타 제한 정보:

7. 판정
- 공개 가능 / 보류 / 폐기:
- 이유:
- 다음 조치:
```

## 자료를 모아두는 위치

다른 에이전트나 직원이 같이 쓰려면 자료를 세 종류로 나눠 저장한다.

| 자료 종류 | 저장 위치 | Git 공유 | 설명 |
| --- | --- | --- | --- |
| 원본 PDF/XLS/XLSX | `data/sources/import/originals/{batch}/` | 아니오 | 공개 첨부라도 원본은 대용량·권리·재배포 이슈가 있어 비공개 저장 |
| 임시 선수이력 메모/HTML | 로컬 임시 폴더 | 절대 아님 | 작업 후 삭제. `person_no`, 생년 정보가 섞일 수 있음 |
| 공유 가능한 후보 | `docs/data-candidates/batches/{YYYYMMDD-topic}/` | 예 | 제한 식별자를 제거한 후보 기록, 출처 원장, 리뷰 보고서 |

공유 후보 배치 구조:

```text
docs/data-candidates/batches/20260707-distance-challenge-proof/
  candidate-records.jsonl
  source-ledger.jsonl
  review-report.md
```

파일 역할:

- `candidate-records.jsonl`: 정규화 후보 1줄당 JSON 1개.
- `source-ledger.jsonl`: 출처 URL, 파일명, hash, 수동 확인 여부.
- `review-report.md`: 사람이 읽는 작업 보고서.

규격:

- 스키마: `docs/data-candidates/missing-result-candidate.schema.json`
- 설명: `docs/data-candidates/README.md`

중요:

- `docs/data-candidates`에는 공개·리뷰 가능한 후보만 둔다.
- 원본 응답 JSON, 원본 HTML, `person_no`, `PERSON_NO1`, 생년월일, 쿠키, 세션 ID는 넣지 않는다.
- 외부 공식 결과 재확인 전에는 `status`를 `needs_external_confirmation`으로 둔다.

## 0. 조회 경로 지도

| 단계 | 조회 경로 | 주 용도 | 자동화 판단 |
| --- | --- | --- | --- |
| 1 | `kaaf.or.kr/ver3/info/internal.asp?currentYear=YYYY` | 국내 대회 일정, 상세 페이지, 결과 첨부 파일 | 허용 범위 내 파일 중심 수집 |
| 2 | `kaaf.or.kr/ver3/info/international.asp?currentYear=YYYY` | KAAF가 관리/공지한 국제대회 일정·첨부 | 허용 범위 내 파일 중심 수집 |
| 3 | `kaaf.or.kr/ver3/info/top.asp` | 기간·부별·종목별 TOP 기록 후보 | 담당자 수동 조회 권장 |
| 4 | `result.kaaf.or.kr/recInfo/topRecList.do` | 실제 TOP 기록 조회 앱 | `robots.txt Disallow:/`이므로 자동 대량 조회 금지 |
| 5 | `result.kaaf.or.kr/history/playerHistory.do` | 선수별 이력 목록 조회 | `robots.txt Disallow:/`이므로 담당자 수동 확인만 |
| 6 | `result.kaaf.or.kr/history/popHistoryPlayer.do` | 선수 상세 팝업 | `person_no` 사용. 저장 금지 |
| 7 | World Athletics/JAAF/대만육협/대회 주최 측 | 해외대회 결과 확정 | URL/hash/파일명 등 출처 기록 |

## 1. 대회 결과 첨부 조회

먼저 대회 단위로 확인한다. 이 단계에서 파일이 있으면 선수이력조회까지 갈 필요가 줄어든다.

### 국내 대회

기본 URL:

```text
https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2026
```

연도만 바꾼다:

```text
https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2025
https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2024
...
```

화면에서 확인할 것:

- 대회명
- 기간
- 장소
- 상세 페이지 링크
- 결과 첨부 여부

상세 페이지 패턴:

```text
https://www.kaaf.or.kr/ver3/info/view.asp?SEQ={seq}&WPAGE=1&YEAR={year}
```

결과 첨부 파일 패턴:

```text
https://www.kaaf.or.kr/DATA/schedule/{year}/{month}/FILEs_4/{filename}
```

작업 기준:

- 파일명이 `종합기록지.pdf`, `종합기록(전체).xlsx`처럼 일반명이어도 같은 행의 대회명으로 묶는다.
- 원본 파일은 private ignored path에 저장한다.
- Git에는 원본 PDF/XLS/XLSX를 올리지 않는다.
- Git에는 manifest/catalog/report만 올린다.

### 국제 대회

기본 URL:

```text
https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2026
```

용도:

- KAAF가 일정표에 올린 국제대회 확인
- 참가·파견 성격 대회 확인
- 첨부 결과가 있으면 1차 출처로 보관

주의:

- 일본 디스턴스 챌린지, 오사카 오픈, 대만오픈처럼 KAAF 일정/결과 첨부에 없을 수 있는 대회는 여기서 끝내지 않는다.
- 없으면 선수이력조회와 해외 공식 결과로 넘어간다.

## 2. KAAF TOP 기록 조회

상위기록권 워치리스트를 만들 때 가장 먼저 볼 화면이다.

### 공개 안내 화면

```text
https://www.kaaf.or.kr/ver3/info/top.asp
```

확인한 입력값:

| 화면 항목 | HTML name/id | 예시 | 의미 |
| --- | --- | --- | --- |
| 조회 시작일 | `txtFromDT` | `2025-01-01` | 기간 시작 |
| 조회 종료일 | `txtToDT` | `2025-12-31` | 기간 종료 |
| 전체기간 | `chkAll` | checked/unchecked | 전체 기간 조회 |
| 부별 | `ddlGjong` | `15` | 남자일반부 |
| 종목 | `ddlGjmok` | `18` | 5000m |
| TOP 개수 | `strQueryCnt` | `10` | 상위 몇 명/몇 기록을 볼지 |

### 실제 조회 앱

```text
https://result.kaaf.or.kr/recInfo/topRecList.do
```

이 앱은 내부적으로 다음 API를 호출한다.

```text
/recInfo/searchTopRecList.do
```

확인한 파라미터:

| 파라미터 | 예시 | 의미 |
| --- | --- | --- |
| `start_dt` | `20250101` | 조회 시작일 |
| `end_dt` | `20251231` | 조회 종료일 |
| `check_dt` | `Y` / `N` | 전체기간 여부 |
| `check_round` | `Y` / `N` | 예선·준결승 포함 여부 |
| `check_ref` | `Y` / `N` | 참고기록 포함 여부 |
| `gubun` | `E` / `M` | 엘리트 / 마스터즈 |
| `kind_cd` | `15` | 부별 코드 |
| `detail_class_cd` | `18` | 세부종목 코드 |
| `rank_cnt` | `10` | TOP 개수 |

확인한 결과 필드:

| 필드 | 의미 |
| --- | --- |
| `FINAL_RANK` | 순위 |
| `GREC_FORMAT` | 기록 |
| `GTOOL` | 용기구 |
| `GWIND_FORMAT` | 풍속 |
| `GDATE` | 일자 |
| `KOR_NM` | 성명 |
| `TEAM_NM` | 소속 |
| `TO_NM` | 대회명 |
| `GBIGO_NM` | 신기록/비고 |
| `GROUND_NM` | 라운드 |
| `ENG_NM` | 영문 성명 |
| `TO_ENM` | 영문 대회명 |

운영 원칙:

- 이 화면은 `result.kaaf.or.kr`에 있으며 `robots.txt`가 `Disallow:/`다.
- 따라서 자동 대량 수집하지 않는다.
- 담당자가 수동으로 TOP 10, TOP 20 등 필요한 범위만 확인한다.
- 확인 결과는 바로 “공식 랭킹”이라고 노출하지 않는다.
- 내부 워치리스트의 시작점으로만 쓴다.

추천 워치리스트 생성 예:

| 목적 | 입력 |
| --- | --- |
| 2025 남자일반부 5000m 상위권 | `start_dt=20250101`, `end_dt=20251231`, `gubun=E`, `kind_cd=15`, `detail_class_cd=18`, `rank_cnt=10` |
| 2025 여자고등부 100m 상위권 | `kind_cd=23`, `detail_class_cd=11`, `rank_cnt=10` |
| 전체기간 남자마라톤 상위권 | `check_dt=Y`, `kind_cd=15`, `detail_class_cd=62`, `rank_cnt=20` |

## 3. 선수이력조회

실제 선수이력조회는 `kaaf.or.kr/ver3/run/player.asp`가 아니라 아래 경로다.

```text
https://result.kaaf.or.kr/history/playerHistory.do
```

KAAF 안내 페이지에서 연결되는 링크:

```text
https://www.kaaf.or.kr/ver3/run/player.asp
```

### 선수 목록 조회 입력값

확인한 form:

```text
form name="playerForm"
```

확인한 파라미터:

| 파라미터 | 예시 | 의미 |
| --- | --- | --- |
| `pageIndex` | `1` | 페이지 번호 |
| `gubun` | `E` / `M` | 엘리트 / 마스터즈 |
| `kor_nm` | 선수명 | 검색할 선수명 |
| `status` | `A` / `R` / empty | 활동선수 / 은퇴선수 / 전체 |
| `kind_cd` | `15` | 부별 |
| `detail_class_cd` | `18` | 세부종목 |
| `searchKey` | `S` | 조회 실행 플래그 |

목록 테이블 열:

| 열 | 의미 |
| --- | --- |
| 번호 | 목록 번호 |
| 성명 | 선수명 |
| 등록년도 | 등록 연도 |
| 출생년도 | 출생 연도 |
| 소속 | 소속 |
| 선수구분 | 활동/은퇴 등 |
| 종목 | 등록 종목 |

### 상세 팝업

목록에서 선수를 누르면 상세 팝업을 연다.

```text
/history/popHistoryPlayer.do
```

확인한 호출 방식:

```js
param.person_no = person_no
```

운영 원칙:

- `person_no`는 조회를 위해 화면 내부에서 쓰이는 값이다.
- AthleteTime은 `person_no`를 저장하지 않는다.
- 상세 팝업 원문 HTML도 저장하지 않는다.
- 필요한 해외대회 한 줄만 임시 메모로 옮기고, 작업 후 삭제한다.

## 4. 부별·종목 코드

### 선수 상태

| 코드 | 의미 |
| --- | --- |
| empty | 전체 |
| `A` | 활동선수 |
| `R` | 은퇴선수 |

### 부별 주요 코드

| 코드 | 의미 |
| --- | --- |
| `10` | 남자부 |
| `11` | 남자초등학교부 |
| `12` | 남자중학교부 |
| `13` | 남자고등학교부 |
| `14` | 남자대학교부 |
| `15` | 남자일반부 |
| `20` | 여자부 |
| `21` | 여자초등학교부 |
| `22` | 여자중학교부 |
| `23` | 여자고등학교부 |
| `24` | 여자대학교부 |
| `25` | 여자일반부 |
| `30` | 통합부 |
| `32` | 중학교부 |
| `33` | 고등학교부 |
| `34` | 대학교부 |
| `35` | 일반부 |
| `3X` | U18 |
| `3Y` | U20 |

### 종목 주요 코드

| 코드 | 종목 |
| --- | --- |
| `11` | 100m |
| `12` | 200m |
| `13` | 400m |
| `14` | 800m |
| `16` | 1500m |
| `17` | 3000m |
| `18` | 5000m |
| `19` | 10000m |
| `1A` | 2000SC |
| `1B` | 3000mSC |
| `1C` | 100mH |
| `1D` | 110mH |
| `1E` | 400mH |
| `1K` | 10km |
| `1Y` | 5km |
| `21` | 높이뛰기 |
| `22` | 장대높이뛰기 |
| `23` | 멀리뛰기 |
| `24` | 세단뛰기 |
| `25` | 포환던지기 |
| `26` | 원반던지기 |
| `27` | 해머던지기 |
| `28` | 창던지기 |
| `31` | 3000mW |
| `32` | 5000mW |
| `33` | 10000mW |
| `35` | 10kmW |
| `36` | 20kmW |
| `39` | 35kmW |
| `41` | 10종경기 |
| `42` | 7종경기 |
| `51` | 4x100mR |
| `52` | 4x400mR |
| `61` | 하프마라톤 |
| `62` | 마라톤 |

## 5. 해외대회 재확인

선수이력에서 발견한 해외대회는 독립 공식 출처로 다시 확인한다.

### World Athletics

```text
https://worldathletics.org/competition/calendar-results
https://worldathletics.org/stats-zone
```

검색어:

```text
World Athletics HOKUREN Distance Challenge results
World Athletics EDION Distance Challenge in Osaka results
World Athletics Taiwan Open results
```

### 일본 대회

검색어:

```text
JAAF Distance Challenge results
HOKUREN Distance Challenge results
JAAF Osaka Open athletics results
EDION Distance Challenge in Osaka results
大阪オープン 陸上 結果
```

### 대만 대회

검색어:

```text
Taiwan Open Athletics results
Chinese Taipei Athletics Open results
World Athletics Taiwan Open results
```

## 6. 담당자 실제 작업 순서

1. KAAF TOP 기록 화면에서 종목·부별 상위권 후보를 수동 확인한다.
2. 후보를 `operator watchlist`에 넣는다.
3. KAAF 국내/국제 일정에서 해당 대회의 결과 파일이 있는지 먼저 확인한다.
4. 결과 파일이 있으면 파일/URL/hash/대회명/연도/일자를 출처로 남긴다.
5. 결과 파일이 없는데 선수 기록이 누락된 것으로 보이면 선수이력조회로 간다.
6. 선수이력조회에서 선수명, 부별, 종목으로 직접 검색한다.
7. 목록에서 소속·등록년도·출생년도는 동명이인 구분에만 사용하고 저장하지 않는다.
8. 상세 팝업에서 누락 해외대회 한 줄만 확인한다.
9. 원문 전체, `person_no`, 생년 정보는 저장하지 않는다.
10. 필요한 한 줄만 임시 파일로 옮겨 `tools/extract-athlete-history-evidence.js`를 실행한다.
11. 도구 출력은 `needs_external_confirmation` 상태로 둔다.
12. World Athletics/JAAF/대만육협/대회 공식 PDF·HTML로 재확인한다.
13. 확인되면 정규 스키마에 입력한다.
14. 불확실하면 `held` 상태로 둔다.

## 7. 단일 실측 사례

목표:

- KAAF 국내/국제 일정 페이지에는 보이지 않지만, 외부 공식 결과에서 한국 선수 기록을 확인할 수 있는 사례 1건을 찾는다.
- 사용자님이 제안한 `result.kaaf.or.kr/recInfo/topRecList.do`와 선수이력조회 경로가 실제로 이어지는지 확인한다.

확인일:

- 2026-07-07

### 7-1. TOP 기록 화면에서 후보 찾기

조회 화면:

```text
https://result.kaaf.or.kr/recInfo/topRecList.do
```

실제 조회 조건:

| 파라미터 | 값 |
| --- | --- |
| `start_dt` | `20250101` |
| `end_dt` | `20251231` |
| `check_dt` | `N` |
| `check_round` | `Y` |
| `check_ref` | `N` |
| `gubun` | `E` |
| `kind_cd` | `15` |
| `detail_class_cd` | `14` |
| `rank_cnt` | `5` |

조회 의미:

- 2025년 남자일반부 800m, 예선·준결승 포함, 참고기록 제외, 상위 5개 기록.

실제 응답에서 확인한 후보:

| 항목 | 값 |
| --- | --- |
| 대회명 | `2025 디스턴스첼린지대회(5차)` |
| 날짜 | `2025-07-19` |
| 선수 | `이재웅` |
| 소속 | `국군체육부대` |
| 종목 | `800m` |
| 기록 | `1:46.51` |
| 라운드 | `결승` |

중요 발견:

- 응답에는 `PERSON_NO1` 같은 제한 식별자가 함께 내려온다.
- 따라서 `topRecList` 응답을 그대로 저장하면 안 된다.
- 저장 가능 필드는 대회명, 날짜, 선수 표시명, 소속 표시명, 종목, 기록, 라운드, 출처 확인 상태 정도로 제한해야 한다.

### 7-2. 선수이력조회에서 같은 후보 확인

조회 화면:

```text
https://result.kaaf.or.kr/history/playerHistory.do
```

실제 목록 조회 조건:

| 파라미터 | 값 |
| --- | --- |
| `pageIndex` | `1` |
| `gubun` | `E` |
| `kor_nm` | `이재웅` |
| `status` | empty |
| `kind_cd` | empty |
| `detail_class_cd` | empty |
| `searchKey` | `S` |

목록 결과:

- 동명이인 4명 확인.
- `국군체육부대`, 등록년도 `(2026)`, 선수구분 `전문선수`, 종목 `1500m` 행이 확인됨.

상세 팝업:

```text
/history/popHistoryPlayer.do
```

주의:

- 상세 팝업 호출에는 `person_no`가 필요하다.
- 이번 확인에서는 메모리에서만 사용했고 출력·저장하지 않았다.
- 실제 운영에서도 `person_no`는 저장하지 않는다.

상세 팝업에서 확인한 경기실적 한 줄:

```text
2025.07.19 | 2025 디스턴스첼린지대회(5차) | 800m | 결승 2 | 1:46.51
```

해석:

- `topRecList`에서 찾은 후보와 선수이력조회 상세의 경기실적이 서로 맞물린다.
- 그래서 사용자님 말처럼 “랭킹/상위기록권 후보 → 선수이력조회 확인” 방식은 실제로 가능하다.
- 다만 동명이인이 있으므로, 선수명만으로 자동 연결하면 안 된다.

### 7-3. KAAF 국내/국제 일정 첨부에 없는지 확인

대회:

- `HOKUREN Distance Challenge 2025 in ABASHIRI`

KAAF 일정 페이지 확인:

| 페이지 | 검색어 | 결과 |
| --- | --- | --- |
| `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2025` | `HOKUREN`, `호쿠렌`, `디스턴스`, `Distance Challenge`, `ABASHIRI` | 없음 |
| `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2025` | 같은 검색어 | 없음 |
| `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2026` | 같은 검색어 | 없음 |
| `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2026` | 같은 검색어 | 없음 |

외부 공식 확인:

- World Athletics Calendar & Results에서 `HOKUREN Distance Challenge 2025 in ABASHIRI` 결과 확인.
- 예시 기록: 2025-07-19, Men 800m Final 1, `Jae-ung LEE`(KOR) 1:46.51, 2위.
- 같은 결과 묶음에서 `Kang Dong-hyung`(KOR) 1:49.44도 확인 가능.

이 사례의 의미:

- KAAF 국내/국제 일정 첨부만 보면 누락될 수 있는 해외 경기다.
- 선수이력조회에서 해당 기록을 발견했다면, AthleteTime은 그 줄을 바로 공개하지 않고 World Athletics 결과로 재확인한 뒤 반영한다.
- 이 기록을 반영할 때 출처는 `선수이력조회에서 발견`과 `World Athletics 공식 결과로 확인`을 분리해 남긴다.
- KAAF 내부 대회명은 `2025 디스턴스첼린지대회(5차)`이고, 외부 공식 대회명은 `HOKUREN Distance Challenge 2025 in ABASHIRI`로 다를 수 있다. 정규화 시 alias로 묶는다.

금지:

- `person_no` 저장 금지.
- 선수이력 원문 저장 금지.
- 이 사례를 근거로 `HOKUREN` 계열 전체를 자동 대량 수집하지 않기.

## 8. 운영자 보강 큐 설계

권장 상태:

- `watchlist`
- `top_record_checked`
- `kaaf_attachment_checked`
- `history_hint_found`
- `external_confirmation_needed`
- `confirmed`
- `published`
- `held`

허용 필드:

- `operator`
- `checkedAt`
- `athleteDisplayName`
- `event`
- `category`
- `teamDisplayName`
- `watchlistReason`
- `topRecordQuery`
- `competitionHint`
- `externalConfirmationUrl`
- `sourceFileName`
- `sourceHash`
- `confidenceNote`
- `publishDecision`

금지 필드:

- `birthDate`
- `personNo`
- `rawAthleteHistoryText`
- `institutionIdentifier`
- `residentRegistrationNumber`
- `phone`
- `email`

## 9. 페이블/리뷰어 체크리스트

- 이 문서만 보고 담당자가 실제 조회 화면에 들어갈 수 있는가.
- `result.kaaf.or.kr`가 자동 대량 조회 대상이 아니라는 점이 충분히 선명한가.
- 상위권 후보를 “공식 랭킹”이라고 노출하지 않는가.
- 선수이력조회에서 발견한 내용이 곧바로 공개되지 않고 외부 공식 결과로 재확인되는가.
- 원본 선수이력 전문과 제한 식별자가 Git, 로그, 리포트, DB에 남지 않는가.
