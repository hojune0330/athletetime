# 선수이력 기반 누락 기록 확인 플레이북

작성일: 2026-07-07

## 결론

페이블, 오푸스, 담당자가 웹에서 확인하는 데 필요한 공개 경로는 있다. 다만 AthleteTime은 이를 자동 대량 수집 경로로 쓰지 않는다. 랭킹/상위기록권 선수는 사용자님 또는 담당자가 직접 워치리스트를 관리하고, 선수이력조회는 누락 해외대회를 발견하는 힌트로만 사용한다.

## 확인 가능한 공개 경로

| 경로 | 용도 | 사용 방식 |
| --- | --- | --- |
| KAAF 선수이력조회 `https://www.kaaf.or.kr/ver3/run/player.asp` | 선수별 경기실적 힌트 확인 | 담당자가 직접 검색. 원문 저장 금지 |
| KAAF 국내경기 `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=YYYY` | 국내 대회 일정/결과 첨부 확인 | 연도별 행 문맥 + 첨부파일 확인 |
| KAAF 국제경기 `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=YYYY` | KAAF가 관리하는 국제대회 목록 확인 | 국제대회가 일정표에 있는지 확인 |
| World Athletics Calendar & Results `https://worldathletics.org/competition/calendar-results` | 해외대회 공식 결과 재확인 | 대회명/연도/국가로 검색 |
| World Athletics Stats `https://worldathletics.org/stats-zone` | 선수 기록·Toplists 보조 확인 | 확정 원천이 아니라 교차 확인 |
| JAAF / 대회 주최 측 페이지 | 일본 대회 결과 재확인 | PDF/HTML 원출처 확보 |
| 대만육협/대회 주최 측 페이지 | 대만오픈 등 결과 재확인 | PDF/HTML 원출처 확보 |

## 랭킹/상위기록권 선수 확인 방식

1. 담당자가 내부 `operator watchlist`를 직접 관리한다.
2. 워치리스트에는 최소 정보만 둔다: 선수명, 종목, 성별/부별, 확인 이유, 마지막 확인일, 담당자, 상태.
3. 생년월일, person_no, 기관 식별자, 선수이력 원문 전문은 저장하지 않는다.
4. 담당자가 KAAF 선수이력조회에서 누락 의심 해외대회를 직접 확인한다.
5. 필요한 경기 한 줄만 임시 파일로 옮겨 `tools/extract-athlete-history-evidence.js`를 실행한다.
6. 도구가 만든 힌트는 바로 공개하지 않는다.
7. World Athletics, JAAF, 대만육협, 대회 공식 PDF/HTML 등 외부 공식 결과로 다시 확인한다.
8. 확인된 사실만 AthleteTime 정규 결과 스키마에 입력한다.
9. 동명이인 가능성이 있으면 선수 프로필에 합치지 말고 별도 후보로 둔다.
10. 공개 카피는 “담당자가 확인해 보강한 기록”으로 쓰고 “공식 랭킹”, “전체 랭킹”, “전국 N위 확정”은 쓰지 않는다.

## 추천 검색어

| 상황 | 검색어 |
| --- | --- |
| 일본 디스턴스 챌린지 | `World Athletics HOKUREN Distance Challenge results`, `JAAF Distance Challenge results`, `HOKUREN Distance Challenge results` |
| 오사카 계열 대회 | `JAAF Osaka Open athletics results`, `World Athletics EDION Distance Challenge in Osaka results`, `大阪オープン 陸上 結果` |
| 대만오픈 | `Taiwan Open Athletics results`, `Chinese Taipei Athletics Open results`, `World Athletics Taiwan Open results` |
| 선수이력 확인 | `대한육상연맹 선수이력조회`, `site:kaaf.or.kr/ver3/run/player.asp 선수이력조회` |
| 경기실적 증명 맥락 | `대한육상연맹 경기실적증명서`, `대한체육회 경기실적증명서 선수` |

## 페이블/리뷰어 체크리스트

- PR 본문과 코멘트만 보고도 “자동 수집이 아니라 수동 보강”임을 이해할 수 있는가.
- `docs/athletetime-manual-athlete-history-update.md`와 이 문서의 금지 원칙이 충돌하지 않는가.
- 사용자 화면에 “랭킹”을 공식처럼 보이게 하는 문구가 생기지 않는가.
- 담당자가 확인한 기록과 외부 공식 결과 URL/hash가 분리되어 남는가.
- 원본 선수이력 전문이나 제한 식별자가 Git, 로그, 리포트에 남지 않는가.

## 다음 구현 후보

운영자 전용 보강 큐를 만든다.

상태:

- `watchlist`
- `history_hint_found`
- `external_confirmation_needed`
- `confirmed`
- `published`
- `held`

필드:

- `operator`
- `checkedAt`
- `athleteDisplayName`
- `event`
- `category`
- `competitionHint`
- `externalConfirmationUrl`
- `sourceHash`
- `confidenceNote`
- `publishDecision`

금지 필드:

- `birthDate`
- `personNo`
- `rawAthleteHistoryText`
- `institutionIdentifier`
