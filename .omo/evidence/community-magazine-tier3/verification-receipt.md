# C단계 검증 영수증

검증일: 2026-07-23

## 실행 결과

| 실행 | 결과 |
|---|---|
| package test 목록을 `node --test --test-concurrency=1`로 실행 | 423 total, 389 pass, 0 fail, 34 skip |
| `npm run test:community-editorial` | 158 total, 130 pass, 0 fail, 28 skip |
| embedded PostgreSQL C단계 suite | 33 pass, 0 fail, 0 skip |
| `npm --prefix frontend run type-check` | exit 0 |
| `npm --prefix frontend run build` | exit 0, production build 생성 |
| `git diff --check` | exit 0 |

34개와 28개의 skip은 `TEST_DATABASE_URL`이 없는 일반 실행에서 PostgreSQL
통합 테스트를 건너뛴 결과다. 같은 PostgreSQL 테스트는 격리된 embedded
PostgreSQL에서 별도로 33/33 통과했으며 skip은 0이었다.

## 전체 테스트 시간 초과 재검증

최초 병렬 전체 실행에서 아래 세 파일의 네 test case가 서버 또는 브라우저 대기
시간 초과로 실패했다.

- `launch-week-zero-result.test.js`
- `operator-guide.test.js`
- `records-flow-e2e.test.js`

각 파일을 단독 실행하면 모두 통과했고, package의 전체 파일 목록을
`--test-concurrency=1`로 다시 실행했을 때 실패 0이었다. Track J 브라우저
결과에는 `consoleErrors=[]`, `pageErrors=[]`가 기록됐다. 테스트가 갱신한
시각과 임시 포트는 검증 후 기존 tracked evidence로 복원했다.

## 증거 보관 정책

- embedded PostgreSQL 상세 TAP:
  `.omo/evidence/community-magazine-tier3/embedded-postgres-tests.txt`
- clone 격리·복원과 checksum:
  `.omo/evidence/community-magazine-tier3/clone-rehearsal-agent.md`
- 최종 승인 판단:
  `.omo/evidence/community-magazine-tier3/fable-approval-package.md`
- 대용량 전체 TAP 원문은 동일 정보를 중복시키므로 커밋하지 않는다.

## 안전·정리 영수증

- 운영 `DATABASE_URL` 사용 0회
- scheduler 활성화 0회
- 임시 PostgreSQL listener 0개
- 임시 clone 디렉터리 0개
- 테스트가 만든 tracked 결과 변경 0개
- `.omo/boulder.json`과 `.omo/start-work/*` 로컬 실행 파일 제거

## 경쟁 조건 추가 검증

격리 write가 advisory lock을 잡은 상태에서 목록·상세·댓글·추천·poll 요청 5개를
동시에 시작했다. 다섯 요청이 잠금에서 대기하는 것을 `pg_locks`로 확인한 뒤
격리를 commit했다. 목록은 200이지만 해당 글 0건, 나머지는 모두 404였고 모든
응답은 `Cache-Control: no-store`였다. 조회수와 댓글 수도 변하지 않았다. 상세
요청은 `/api/posts/01`로 보내 숫자 표기가 달라도 post `1`과 같은 잠금 키를
쓰는지 확인했다. 테스트 라우트 순서는 운영 서버와 동일하게
posts→comments→votes→polls였고, 격리를 release한 뒤 상세 요청은 다시 200이었다.

공개 경계는 잠금을 잡은 같은 database client를 downstream handler가 재사용한다.
운영 pool 크기와 같은 20개 비격리 상세 요청을 동시에 보내도 두 번째 connection을
기다리지 않고 20개 모두 200으로 완료되는 것을 실 PostgreSQL에서 확인했다.
