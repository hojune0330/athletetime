# AthleteTime 팀 성과 대시보드 구현 계획

> 상태: 작업 1-4 완료 · 작업 5 대기
> 기준일: 2026-07-31
> 상위 계획: `.omo/plans/athlete-record-workspace-ux.md`의 6B

## 1. 목표

소속 검색을 다음 두 단계로 분리한다.

1. `실업팀 · 대학팀 · 고등부 · 중등부 · 초등부`에서 팀을 찾는다.
2. 한 팀을 누르면 독립 주소에서 모은 공개 기록 기준 성과를 통계로 본다.

팀 페이지의 첫 화면은 다음 네 질문에 바로 답해야 한다.

- 이 팀은 선택한 기간에 1~3위로 확인된 결과가 몇 건인가?
- 몇 개 대회에 참가한 것으로 확인되는가?
- 몇 명의 선수가 이 소속으로 확인되는가?
- 모은 기록 안에서 최고 기록을 갱신한 흐름이 몇 건인가?

개별 선수의 긴 기록 목록은 팀 페이지에 넣지 않는다. 팀 통계에서 선수를
감시하거나 평가하는 화면이 아니라, 팀의 시즌 활동과 종목 구성을 이해하는
화면으로 제한한다.

## 2. 현재 기반

이미 다음 기반이 구현되어 있다.

- `card-studio/services/teamStatisticsService.js`
  - 정규화 소속별 선수·기록·대회·종목 수 집계
  - 시즌 흐름과 종목 구성 집계
  - 원천 `rank`의 1·2·3위 표기 수 집계
- `card-studio/routes/recordAnalyticsRoutes.js`
  - `GET /api/analytics/teams/search`
- `frontend/src/components/records/TeamStatisticsResults.tsx`
  - 소속 후보 분리
  - 진도군청 실측 19명·138건·36대회·13종목 표시
- `card-studio/services/divisionHierarchyService.js`
  - `general · university · high · middle · elementary` 부문 정규화

따라서 새 기능은 기존 집계를 폐기하지 않고, 분류·근거·상세 주소를 추가한다.

## 3. 핵심 결정

### 3.1 팀 종류는 팀 이름만으로 단정하지 않는다

공개 기록 한 행마다 다음 순서로 `teamCategory`를 판정한다.

1. 운영자가 검토한 `data/config/team-category-overrides.json`이 있으면 우선한다.
2. `divisionLevel`이 `university · high · middle · elementary`이면 그대로 매핑한다.
3. 일반·미상 부문에서도 소속명에 `대학교 · 고등학교 · 중학교 · 초등학교`가
   명시되면 해당 학교급으로 매핑한다.
4. `divisionLevel=general`이고 아래 강한 근거가 하나 이상이면 `corporate`로 본다.
   - 원문 부문 또는 대회명에 `실업`이 있음
   - 소속이 `시청 · 군청 · 구청 · 도청 · 공사 · 공단 · 은행 · 체육회`
     또는 검토된 실업팀 이름 규칙과 일치함
5. 위 조건으로 설명할 수 없으면 `unclassified`로 둔다.

한 팀이 여러 부문에 실제로 나타나면 강제로 하나로 합치지 않는다.
검색 필터에서는 선택한 부문에 해당하는 기록만 집계하고, 상세 화면에는
`다른 부문에서도 확인됨`을 별도 표시한다.

공개 분류값은 다음 여섯 개로 고정한다.

```text
corporate     실업팀
university    대학팀
high          고등부
middle        중등부
elementary    초등부
unclassified  분류 확인 필요
```

### 3.2 `입상 개수`는 원천 순위 행 수와 분리한다

기존 `rankCounts`는 예선·결승·계주 중복 가능성이 있어 그대로 `메달`로 부르지 않는다.

- `confirmedPodiumCount`
  - `rank`가 1~3
  - 단계가 `결승 · final · 종합 · overall`로 확인됨
  - 예선·준결승·조별·heat·qualifying은 제외
- `ambiguousPodiumCount`
  - `rank`가 1~3이지만 단계가 비어 있거나 판정 불가
- 계주·팀 종목
  - `대회 + 종목 + 부문 + 팀 + 순위`가 같은 행은 한 번만 계산
- 개인 종목
  - 서로 다른 선수 행은 각각 계산
  - 공동 순위도 선수 행이 다르면 각각 계산

화면 기본값은 `확인된 입상`이다. 단계 미상 수는 작은 보조 문구로 분리한다.
`메달` 대신 `1위 · 2위 · 3위 · 확인된 입상`을 사용한다.

### 3.3 대회 참가 개수

`competitionId`를 우선하고, 없을 때만 정규화된 대회명과 시즌을 키로 사용한다.
선택한 팀·부문·기간에서 공개 색인 행이 한 건 이상 있으면 참가 대회 한 개로 센다.
기록이 비어 있고 상태만 있는 행은 참가 근거에는 포함하되 성과 기록에는 포함하지 않는다.

### 3.4 개인 신기록은 두 종류로 분리한다

현재 원천의 `personal_best`는 대부분 비어 있고, 소속 변경 전후 동일인 확정도 없다.
따라서 `PB 달성`을 단정하지 않는다.

- `sourceMarkedPersonalBestCount`
  - 원문에 `개인신 · PB · Personal Best`가 명시된 건만 계산
- `indexedImprovementCount`
  - 같은 `athleteKey + eventKey` 안에서 날짜순 비교
  - 비교 가능한 기록만 사용
  - 첫 관찰 기록은 갱신으로 세지 않음
  - 트랙은 더 낮은 값, 필드는 더 높은 값일 때만 갱신
  - 풍속 규정이 필요한 종목은 적법 풍속만 사용
  - 다른 소속의 프로필 조각과 자동 병합하지 않음

화면 주 지표는 `모은 기록 기준 최고 갱신`이다. 원문 표기가 있을 때만
`원문 개인신 표기`를 보조 지표로 추가한다.

### 3.5 기간 기본값

- 첫 진입: 그 팀의 `최근 확인 시즌`
- 전환: `전체 기간` 또는 개별 시즌
- URL: `?category=corporate&scope=latest` 또는 `?category=corporate&season=2025`
- 브라우저 뒤로 가기: 팀 검색어·부문·스크롤 위치 복원

## 4. API 계약

### 4.1 검색

```http
GET /api/analytics/teams/search?q=진도&category=corporate&limit=20
```

검색 응답의 팀 요약은 다음 필드를 가진다.

```text
teamKey, teamLabel, selectedCategory, categoryEvidence,
athleteCount, resultCount, competitionCount,
confirmedPodiumCount, latestSeason, latestDate,
coverageDisclaimer
```

### 4.2 단일 팀 상세

```http
GET /api/analytics/teams/:teamKey?category=corporate&scope=latest
```

상세 응답은 다음 섹션으로 고정한다.

- `identity`: 팀 이름, 선택 부문, 다른 확인 부문
- `summary`: 선수, 기록, 참가 대회, 확인된 1·2·3위, 최고 갱신
- `seasonTrend`: 시즌별 선수·대회·입상·갱신 수
- `eventBreakdown`: 종목별 출전·입상·갱신 수
- `participation`: 대회별 한 줄 통계, 선수 이름 없음
- `improvement`: 시즌·종목별 갱신 수, 선수 이름 없음
- `coverage`: 확인 시즌, 원천 수, 마지막 수집 시각, 단계 미상 수, 면책 문구

`teamKey`는 정규화 소속에서 만든 현재 공개 가명 키를 유지한다. API는 원본 파일,
선수 목록 덤프, 전체 기록 행을 반환하지 않는다.

## 5. 화면 구조

### 5.1 소속 검색

경로는 기존 `/records?flow=browse&browse=team`을 유지한다.

1. 상단에 `전체 · 실업팀 · 대학팀 · 고등부 · 중등부 · 초등부` 세그먼트
2. 검색 결과는 팀 이름, 부문, 최근 시즌, 선수 수, 참가 대회 수만 표시
3. 팀 카드를 누르면 `/records/teams/:teamKey`로 이동
4. 같은 지역명이 들어간 다른 팀은 계속 별도 카드로 유지
5. `분류 확인 필요`는 전체 검색에서만 보이고 별도 표시

### 5.2 단일 팀 페이지

모바일 첫 화면의 최대 정보량을 다음으로 제한한다.

```text
[뒤로] 팀 이름                  [기간]
실업팀 · 2019-2026 확인

확인된 입상   참가 대회
선수           최고 갱신

[시즌 흐름] [종목 구성] [참가 대회] [자료 범위]
```

- 첫 화면에서 개인 이름과 개별 기록은 0개
- 네 지표는 2x2 격자, 숫자는 tabular mono
- 시즌 흐름은 한 시즌 한 줄, 입상과 참가 수를 함께 표시
- 종목 구성은 상위 6개만 먼저 표시하고 `전체 종목`으로 확장
- 참가 대회는 대회명·시즌·입상 수만 표시
- `자료 범위`에서 단계 미상, 누락 가능성, 마지막 수집 시각을 설명
- 탭 전환은 주소 query와 동기화해 새로고침·공유·뒤로 가기가 동작

톤은 기존 TRAINORACLE의 각진 hairline·딥틸·모노 숫자를 유지한다.
새 그라데이션, 이모지, 장식용 애니메이션은 추가하지 않는다.

## 6. 구현 순서

### 작업 1. 팀 부문 판정기 (완료)

**소유 파일**
- 신규 `card-studio/services/teamCategoryService.js`
- 신규 `data/config/team-category-overrides.json`
- 신규 `backend/tests/team-category.test.js`

**구현**
- 위 3.1 우선순위를 순수 함수로 구현한다.
- 결과에 `category`, `confidence`, `reasons`를 남긴다.
- override는 정규화 팀 이름과 검토자 메모만 저장하고 선수 정보는 저장하지 않는다.

**완료 조건**
- 진도군청은 `corporate`, 건국대학교는 `university`, 학교는 각 학제로 분리된다.
- 근거 없는 일반부 소속은 `corporate`로 강제되지 않는다.
- 같은 팀의 혼합 부문 기록은 원본 부문을 잃지 않는다.

### 작업 2. 입상·참가·최고 갱신 계산기 (완료)

**소유 파일**
- 신규 `card-studio/services/teamPerformanceService.js`
- 신규 `backend/tests/team-performance.test.js`

**구현**
- 확정/단계 미상 1~3위를 분리한다.
- 개인과 계주 중복 제거 키를 다르게 적용한다.
- 참가 대회를 안정 키로 집계한다.
- 원문 개인신과 모은 기록 기준 최고 갱신을 분리한다.

**완료 조건**
- 예선 1위는 확정 입상에서 제외된다.
- 같은 계주팀 4행은 입상 1건이다.
- 개인 종목 같은 팀 1·2·3위는 3건이다.
- 첫 관찰 기록은 최고 갱신 0건이다.
- 소속 변경 조각은 자동 연결하지 않는다.

### 작업 3. 검색·상세 API (완료)

**소유 파일**
- `card-studio/services/teamStatisticsService.js`
- 신규 `card-studio/services/teamDetailService.js`
- `card-studio/services/recordAnalyticsService.js`
- `card-studio/routes/recordAnalyticsRoutes.js`
- 신규 `backend/tests/team-performance-api.test.js`

**구현**
- 검색에 category 필터를 추가한다.
- `GET /teams/:teamKey` 상세를 추가한다.
- 잘못된 category·season·teamKey는 400/404로 fail-closed 처리한다.
- 기존 public/search rate limiter와 짧은 서버 캐시를 재사용한다.

**완료 조건**
- 검색 요약과 상세 총계가 같은 필터에서 일치한다.
- 응답에 선수 이름·원본 파일 경로·전체 기록 행이 없다.
- 전체 덤프형 요청과 과도한 limit는 차단된다.

### 작업 4. 프론트 타입과 데이터 경계 (완료)

**소유 파일**
- 신규 `frontend/src/features/team-performance/teamPerformanceContracts.ts`
- 신규 `frontend/src/features/team-performance/teamPerformanceContracts.test.ts`
- 신규 `frontend/src/features/team-performance/teamPerformanceApi.ts`

**구현**
- 공개 응답을 화면 타입으로 파싱한다.
- 카테고리·범위 query를 허용값으로만 정규화한다.
- 숫자 누락과 오래된 응답은 오류/자료 범위 상태로 처리한다.

### 작업 5. 팀 검색 분류와 독립 상세 이동

**소유 파일**
- `frontend/src/components/records/TeamStatisticsResults.tsx`
- 신규 `frontend/src/features/team-performance/TeamCategoryFilter.tsx`
- `frontend/src/pages/RecordsPage.tsx`

**구현**
- 6개 카테고리 세그먼트를 추가한다.
- 검색 결과에서 긴 통계 본문을 제거하고 compact 팀 카드로 바꾼다.
- 카드 선택은 독립 팀 페이지로 이동한다.
- 검색 URL, 뒤로 가기, 키보드 초점을 보존한다.

### 작업 6. 단일 팀 대시보드

**소유 파일**
- 신규 `frontend/src/features/team-performance/TeamPerformancePage.tsx`
- 신규 `TeamPerformanceSummary.tsx`
- 신규 `TeamSeasonTrend.tsx`
- 신규 `TeamEventBreakdown.tsx`
- 신규 `TeamParticipationList.tsx`
- `frontend/src/App.tsx`

**구현**
- 2x2 핵심 지표와 네 섹션을 조립한다.
- 기간 선택과 탭을 URL에 반영한다.
- 로딩·0건·404·429·네트워크 오류를 각각 복구 가능하게 표시한다.
- 개인 이름, 선수 상세 링크, 기록 담기 버튼은 넣지 않는다.

### 작업 7. 신뢰 카피와 접근성

**소유 파일**
- `docs/athletetime-records-microcopy.md`
- 신규 `backend/tests/team-performance-copy.test.js`

**필수 문구**
- `AthleteTime이 모은 공개 기록 기준이에요.`
- `공식 팀 명단이나 공식 입상 집계가 아니에요.`
- `단계가 확인되지 않은 1~3위 표기 N건은 합계에서 뺐어요.`
- `최고 갱신은 같은 공개 프로필 조각 안에서 계산했어요.`

**금지 문구**
- 공식 메달 집계
- 팀 랭킹
- 전체 대회
- 개인 PB 달성 확정
- 현 소속 선수단

### 작업 8. 실데이터 QA와 출시 게이트

**자동 검증**
- 단위 테스트: 분류, 입상 중복, 참가 대회, 방향별 갱신
- API 테스트: 검색/상세 총계 일치, invalid query, rate limit
- 프론트 테스트: category URL, 뒤로 가기, 0건·오류 복구
- 전체 `npm test`, 타입 검사, 프로덕션 빌드

**실브라우저 시나리오**
1. `진도` → 실업팀 → 진도군청 → 최근 시즌
2. `건국` → 대학팀 → 건국대학교
3. 같은 지역명이 들어간 군청·초등학교·중학교가 서로 섞이지 않음
4. 360x800에서 첫 화면에 네 지표와 탭이 가림 없이 보임
5. 시즌 변경 → 새로고침 → 같은 기간 유지
6. 뒤로 가기 → 검색어·부문·스크롤·초점 복원
7. 페이지 어디에도 개인 선수 이름과 `공식·랭킹·PB 확정` 표현이 없음

**출시 중단 조건**
- 예선 1위를 확정 입상으로 셈
- 계주 한 팀을 선수 수만큼 중복 집계
- 일반부만으로 실업팀을 강제 분류
- 첫 기록을 최고 갱신으로 셈
- 소속 변경 조각을 자동 병합
- 검색 요약과 상세 총계 불일치
- 팀 페이지에 개인 기록 목록 노출
- 모바일 가로 스크롤 또는 하단 탭바 중첩

## 7. 작업 1-2 검증 기록

2026-07-31 실제 보유 데이터와 HTTP 응답으로 다음을 확인했다.

- 진도군청: `corporate`, 결과 138건, 참가 대회 36개, 확인된 입상 43건,
  모은 기록 기준 최고 갱신 37건
- 전남진도초등학교: `elementary`, 결과 7건, 참가 대회 5개, 최고 갱신 1건
- 강진도암중학교: `middle`
- 건국대학교(A): `university`, 결과 420건, 참가 대회 63개,
  확인된 입상 120건, 최고 갱신 98건
- 검색 API는 위 집계를 반환하면서 선수별 원본 기록 행은 반환하지 않는다.

자동 검증 결과:

- 사전 계약 테스트 12/12 통과
- 작업 3 반영 후 사전 계약 테스트 16/16 통과
- 전체 테스트 322 통과, 5개 의도적 skip, 실패 0
- 프론트 타입 검사와 프로덕션 빌드 통과
- `GET /api/card-studio/analytics/teams/search?q=진도&limit=20` 실측 통과

작업 3 HTTP 실측 결과:

- `category=corporate` 진도군청 검색과 `scope=all` 상세의 결과 138건,
  참가 대회 36개, 확인된 입상 43건이 일치한다.
- `category=elementary` 검색에는 전남진도초등학교가 별도 팀으로 반환된다.
- 상세 응답에는 `records`, `athleteKey`, `name` 키가 없다.
- 잘못된 category는 `400 INVALID_TEAM_CATEGORY`, 없는 팀은 `404 TEAM_NOT_FOUND`다.
- 상세 응답은 `max-age=60, stale-while-revalidate=300`으로 짧게 캐시된다.
- 검색·상세 응답은 `contractVersion=1`을 명시하며 프론트는 다른 버전을 거부한다.
- Zod 경계 테스트 5/5와 백엔드 API 계약 테스트 5/5가 통과한다.
- category·scope·season URL은 모순 없는 구별된 상태로 변환되고 잘못된 값은
  `INVALID_TEAM_*` 상태로 분리된다.
- 프로덕션 타입 검사가 비교 목록 토글 결과의 분기 누락을 발견했고,
  `removed=false`일 때만 `reason`을 읽도록 기존 기록 화면도 함께 바로잡았다.

다음 작업자는 작업 5부터 시작한다. 작업 1-4의 집계 의미를 변경할 때는
`team-category.test.js`와 `team-performance.test.js`를 먼저 갱신하고, 예선·단계 미상·
계주 중복·첫 관찰 기록 방어 조건을 약화하지 않는다.

## 8. PR 파동과 모델 배정

1. **Sol 높은 추론**: 작업 1·2 의미 검증과 예외 데이터 승인
2. **Terra 높은 추론**: 작업 3·4 API·타입 구현
3. **Terra 중간 추론**: 작업 5·6 UI 구현
4. **Sol 높은 추론**: 작업 7·8 신뢰·완전성·실데이터 최종 검수

각 파동은 직전 테스트가 녹색일 때만 다음으로 이동한다. 첫 구현 PR은 분류와
계산기까지만 포함하고, 데이터 의미가 승인된 뒤 API와 UI를 연결한다.

## 9. 완료 정의

다음 문장이 실제 모바일 브라우저에서 성립해야 한다.

> “실업팀·대학팀·학교급으로 팀을 찾고 한 팀을 누르면 새 페이지가 열린다.
> 최근 시즌의 확인된 입상, 참가 대회, 선수 수, 모은 기록 기준 최고 갱신을
> 한눈에 보고 시즌·종목 흐름을 더 볼 수 있다. 예선과 단계 미상은 입상 합계에서
> 분리되고, 이 숫자가 공식 집계나 개인 PB 확정이 아니라는 범위도 이해된다.”
