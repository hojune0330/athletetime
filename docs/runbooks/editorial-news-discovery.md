# 네이버 육상 소식 발견함 운영 안내

이 기능은 네이버 뉴스 검색 결과에서 육상 관련 링크를 관리자에게 모아 주는
`발견 도구`다. 글을 만들거나 발행하지 않으며, 제목과 링크를 사람이 확인한
뒤 기존 매거진 편집 절차로 넘긴다.

## 변하지 않는 운영 원칙

- 기본 상태는 꺼짐이다. `NAVER_NEWS_COLLECTOR_ENABLED=true`일 때만 호출한다.
- 실행은 관리자 화면의 `오늘 소식 가져오기` 버튼으로만 한다. 자동 실행기는 없다.
- 기사 본문, 설명문, 사진, 검색한 사람의 정보는 저장하지 않는다.
- 발견 링크는 발행 근거가 아니다. 원출처를 따로 확인한 뒤에만 편성에 연결한다.
- 원출처 확인과 편성 연결도 글 생성이나 발행을 일으키지 않는다.
- 미성년자 관련 가능성이나 선정적 제목은 경고를 보여 주고 사람이 더 엄격히 본다.
- 하루 40회, 한 달 800회가 AthleteTime의 하드 한도다. 이보다 큰 값은 서버가 거부한다.

## 1. API HUB 키 발급

2026-07-31부터 신규 검색 API 신청은 NAVER 개발자센터가 아니라 NAVER Cloud
Platform의 `NAVER API HUB`를 사용한다.

1. NAVER Cloud Platform 콘솔에 로그인한다.
2. `All Services > Application Services > NAVER API HUB`로 이동한다.
3. `Application > Application 등록`에서 뉴스 검색 API를 선택한다.
4. 등록한 Application의 `인증 정보`에서 Client ID와 Client Secret을 확인한다.
5. 값은 비밀번호 관리자에 보관하고 Render 환경변수에만 입력한다.

공식 문서:

- [NAVER API HUB 개요](https://api.ncloud-docs.com/docs/naver-api-hub-overview)
- [뉴스 검색 결과 조회](https://api.ncloud-docs.com/docs/en/naver-api-hub-search-news)
- [기존 검색 API의 API HUB 이관 안내](https://developers.naver.com/notice/article/32530)

키를 GitHub, PR, 채팅, 스크린샷, 브라우저 코드, Netlify 환경변수에 넣지 않는다.
노출이 의심되면 API HUB에서 Client Secret을 재발급하고 Render 값을 교체한다.

## 2. Render 설정

| 환경변수 | 기본값 | 역할 |
| --- | --- | --- |
| `NAVER_NEWS_COLLECTOR_ENABLED` | `false` | 정확히 `true`일 때만 관리자 수동 호출 허용 |
| `NAVER_API_HUB_KEY_ID` | 없음 | API HUB Client ID, Render 서버에만 저장 |
| `NAVER_API_HUB_KEY` | 없음 | API HUB Client Secret, Render 서버에만 저장 |
| `NAVER_NEWS_DAILY_CALL_LIMIT` | `40` | 1~40만 허용 |
| `NAVER_NEWS_MONTHLY_CALL_LIMIT` | `800` | 1~800만 허용 |

Netlify에는 위 변수를 하나도 설정하지 않는다. 프론트 빌드 산출물에 변수명이나
값이 들어가면 배포를 멈춘다.

## 3. 안전한 최초 배포

1. 운영 PostgreSQL의 암호화 백업과 복원 가능 시각을 기록한다.
2. Render에서 collector를 `false`로 두거나 설정하지 않는다.
3. migration 011, 012, 013을 순서대로 적용한다.
4. Render 백엔드를 먼저 배포하고 `/health`와 기존 공개 API를 확인한다.
5. 관리자 편집실 `/admin/content/magazine`을 열어 소식 발견함이 보이는지 확인한다.
6. `오늘 소식 가져오기`를 한 번 누른다.
7. 상태가 `수집 기능 꺼짐`이고 외부 호출 수가 0인지 확인한다.
8. Netlify 프론트를 배포하고 `/`, `/records`, `/community`를 확인한다.
9. 14일 수동 시험을 시작하기로 결정한 날에만 Render 값을 `true`로 바꾼다.

`true`는 자동 수집을 켜는 값이 아니다. 현재 코드에는 예약 실행기가 없으므로
관리자가 버튼을 눌렀을 때만 호출한다.

## 4. 하루 한 번 수동 처리

1. 관리자 계정으로 `/admin/content/magazine`에 로그인한다.
2. `오늘 소식 가져오기`를 한 번 누른다.
3. 최근 실행의 호출·신규·중복·제외 수와 안전 상태를 기록한다.
4. 후보의 원문 링크를 새 탭에서 직접 연다.
5. 쓸 가치가 있으면 `검토 시작`을 누른다.
6. 원출처 URL, 제목, 발행처, 출처 종류를 직접 확인해 저장한다.
7. 이미 만든 `예정` 상태의 편성에만 연결한다.
8. 부적합하면 이유를 남기고 제외한다.
9. [14일 기록표](../templates/editorial-news-discovery-pilot.md)에 그날 수치를 적는다.

같은 날 성공한 실행을 다시 요청하면 같은 실행 결과를 돌려준다. 실패한 실행은
동시에 누른 여러 요청이 한 번만 처리되고, 처리가 끝난 뒤 관리자가 명시적으로
다시 누를 때만 재시도한다.

`이번 달` 화면은 네이버에 월간 검색을 다시 요청한 결과가 아니다. 매일 저장한
발견 메타데이터를 `published_at` 기준으로 모아 보여 주는 관리자용 보기다.

## 5. 안전 상태와 대응

| 화면 상태 | 뜻 | 조치 |
| --- | --- | --- |
| `수집 기능 꺼짐` | collector flag가 꺼짐 | 시험 중이 아니라면 정상 |
| `연결 설정 확인 필요` | 키가 없음 | Render secret 이름만 확인 |
| `연결 인증 확인 필요` | 401/403 | API HUB Application과 키를 확인, 필요 시 재발급 |
| `사용량 한도 초과` | AthleteTime 내부 한도 소진 | 다음 날 또는 다음 달까지 호출 중지 |
| `제공처 한도 초과` | NAVER가 429 응답 | 호출 중지 후 NAVER 콘솔 사용량 확인 |
| `일부 주제 수집 실패` | 일부 요청만 실패 | 해당 날짜 수치 기록 후 한 번만 명시적 재시도 |
| `저장소 확인 필요` | 후보 저장 실패 | collector를 끄고 DB 상태 확인 |

화면과 API에는 위 안전 상태만 노출한다. 원문 오류, SQL, 키, 관리자 UUID는
운영 기록표나 PR 코멘트에 붙이지 않는다.

## 6. 사용량과 보존 확인

읽기 전용으로 일별 사용량을 확인한다.

```sql
SELECT run_date_kst,
       SUM(api_call_count) AS api_calls,
       SUM(inserted_count) AS new_items,
       SUM(duplicate_count) AS duplicates,
       SUM(irrelevant_count) AS irrelevant
FROM editorial_news_runs
GROUP BY run_date_kst
ORDER BY run_date_kst DESC
LIMIT 31;
```

보존 정책:

- 제외·만료 후보는 마지막 발견 후 90일이 지나면 정리 대상이다.
- 완료·실패 실행 이력은 완료 후 13개월이 지나면 정리 대상이다.
- 14일 시험 중에는 보존 기간이 지나지 않으므로 purge를 실행하지 않는다.
- 이후 purge는 승인된 유지보수 창에서 repository의 `purgeExpired()`와
  `purgeRuns()`를 호출하는 별도 운영 작업으로만 수행한다. 직접 임의 SQL 삭제는
  감사 이벤트를 우회하므로 금지한다.

## 7. 사고 중지 절차

1. Render에서 `NAVER_NEWS_COLLECTOR_ENABLED=false`로 바꾸고 재배포한다.
2. 관리자 화면에서 `오늘 소식 가져오기`가 `수집 기능 꺼짐`으로 끝나는지 확인한다.
3. 신규 외부 호출이 0인지 NAVER 콘솔과 실행 이력에서 확인한다.
4. 키 노출 가능성이 있으면 Client Secret을 재발급한다.
5. 저장 오류면 공개 서비스는 그대로 두고 발견함만 중지한다.
6. 기존 기록 검색, 커뮤니티, 매거진 글이 정상인지 확인한다.

발견함 테이블을 지우거나 migration을 되돌리지 않아도 수집은 즉시 멈춘다.

## 8. 데이터베이스 롤백

롤백은 단순 중지로 해결되지 않고, 배포 버전도 011 이전으로 되돌려야 할 때만
실행한다.

1. collector를 `false`로 바꾸고 백엔드를 재배포한다.
2. 운영 DB의 암호화 백업과 복원 시험 결과를 확인한다.
3. 코드 롤백 버전이 뉴스 repository와 route를 import하지 않는지 확인한다.
4. 013, 012, 011 down SQL을 이 순서로 한 트랜잭션 안에서 실행한다.
5. 기존 `editorial_issues`, `editorial_sources`, `editorial_calendar`, `posts` 행 수가
   전과 같은지 확인한다.
6. 공개 서비스와 기존 매거진 편집실을 다시 점검한다.

주의: 011 down은 발견함의 run·discovery 데이터를 삭제한다. 012 down은 이미
보존 기한으로 run이 제거돼 고아가 된 발견 후보만 정리한 뒤 이전 제약을 복원한다.
기존 매거진 원고·출처·편성·게시글은 변경하지 않는다.

## 9. 자동 실행 전 필수 조건

다음 조건을 모두 증거로 확인하기 전에는 `GO-DAILY`로 바꾸지 않는다.

- 14일 연속 실제 수동 기록이 있다.
- Critical/High 보안 취약점이 0이다.
- 별도 의존성 보안 PR과 운영 복원 리허설이 완료됐다.
- 예산 초과 0, 본문 저장 0, 자동 글 생성·발행 0이다.
- 미성년자·선정적 후보의 사람 검토가 빠짐없이 기록됐다.
- 중지 절차를 staging에서 실제로 실행했다.
- 서비스 책임자가 PR에 `GO-DAILY`를 명시적으로 승인했다.

그 전의 운영 결정은 항상 `GO-MANUAL`이다.
