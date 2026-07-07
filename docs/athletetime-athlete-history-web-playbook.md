# 선수이력·상위기록권 자료 조회 플레이북

작성일: 2026-07-07

## 한 줄 결론

필요한 자료는 한 곳에서 끝나지 않는다. 순서는 **대회 결과 첨부 → KAAF TOP 기록 → 선수이력조회 → 해외 공식 결과 재확인**이다. 선수이력조회는 누락 기록을 발견하는 수동 힌트로만 쓰고, 랭킹/상위기록권 워치리스트는 사용자님 또는 담당자가 직접 관리한다.

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

## 7. 운영자 보강 큐 설계

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

## 8. 페이블/리뷰어 체크리스트

- 이 문서만 보고 담당자가 실제 조회 화면에 들어갈 수 있는가.
- `result.kaaf.or.kr`가 자동 대량 조회 대상이 아니라는 점이 충분히 선명한가.
- 상위권 후보를 “공식 랭킹”이라고 노출하지 않는가.
- 선수이력조회에서 발견한 내용이 곧바로 공개되지 않고 외부 공식 결과로 재확인되는가.
- 원본 선수이력 전문과 제한 식별자가 Git, 로그, 리포트, DB에 남지 않는가.
