# C단계 독립 리뷰 기록

리뷰일: 2026-07-23

## 공개·보안 리뷰

최종 판정: **UNCONDITIONAL APPROVAL**

재검증 결과:

- 전체 테스트: 423 total, 389 pass, 0 fail, 34 skip
- 커뮤니티 매거진: 158 total, 130 pass, 0 fail, 28 skip
- embedded PostgreSQL: 33 pass, 0 fail, 0 skip
- frontend type-check: pass
- frontend build: pass
- 공개 번들 3개 검사: forbidden match 0
- 공개 snapshot 검사: field leak 0, fixture leak 0
- 발행 해제 뒤 list 비노출, slug/by-post 404, `no-store` 확인
- 활성 격리 뒤 list/detail/comment/vote/poll 차단과 release 복구 확인

정리:

- 운영 데이터베이스 연결 없음
- 임시 embedded PostgreSQL 제거
- scheduler 관련 환경변수와 timer 없음

## Scheduler 독립 리뷰

최종 판정: **PASS / UNCONDITIONAL APPROVAL**

재검증 결과:

- 독립 embedded PostgreSQL에서 33/33 pass, skip 0
- worker 2개/job 10개와 worker 10개/job 100개에서 중복·유실 0
- 발행 중 child process 종료 뒤 transaction rollback, 재시작 후 정확히 1회 발행
- 1분·5분 retry와 세 번째 실패 상태 확인
- migration 010 up/down/up 뒤 기존 issue/calendar/source/event snapshot 보존
- KST와 명시적 DST offset을 결정적 UTC로 저장
- actor 누락·비관리자 actor에서 post write 0

정리:

- 검증용 PostgreSQL만 사용
- 검증 listener와 임시 cluster 제거
- production 연결과 scheduler 활성화 없음

## Clone 리허설 리뷰

최종 판정:

- disposable fixture clone: **PASS**
- 공개 경계: **PASS**
- production-backup clone: **BLOCKED**

차단 이유는 승인된 운영 백업, 백업 receipt, post ID allowlist가 없기 때문이다.
이 상태에서 실행하지 않은 것이 fail-closed 계약에 맞다.

## 최종 5개 검토 게이트

현재 코드와 최신 PostgreSQL 증거를 대상으로 재검토했다.

| 검토 | 최종 판정 | 핵심 확인 |
|---|---|---|
| 목표·제약 | PASS / unconditional | 운영 write 0, scheduler 활성화 0, Task 9만 fail-closed |
| 실제 QA | PASS | 423 fail 0, editorial 158 fail 0, PG 33/33, 임시 자원 0 |
| 코드 품질 | PASS | 같은 DB client 재사용, 생산 pool 크기 20 동시 요청 완료 |
| 보안·개인정보 | unconditional approval | 목록 포함 5개 공개 경계 경쟁 차단, ID canonicalization |
| 통합·배포 | PASS | global→per-ID lock 순서, migration→Render→Netlify 순서 유지 |

초기 재검토에서 발견된 운영 라우트 이중 잠금, 비정규 ID 잠금 키, 목록
TOCTOU, connection pool 고갈 가능성은 모두 수정 후 실제 PostgreSQL 회귀로
닫았다. 남은 production-backup clone은 코드 결함이 아니라 승인 입력이 없는
운영 게이트다.
