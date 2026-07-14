# G004 로컬 검증 증거

검증일: 2026-07-14
브랜치: `codex/durable-rights-storage`

## 구현 범위

- 운영 PostgreSQL 저장소와 migration-004
- 공개 티켓 SHA-256 저장, 연락처 AES-256-GCM 암호화
- 요청·이벤트·suppression 트랜잭션과 버전 충돌 처리
- 관리자 목록 최소정보/상세 명시 조회 분리
- 검색 원문·fingerprint 없는 일별 0건 집계
- 기존 JSON dry-run 기본 이관 도구와 체크섬 멱등성
- PostgreSQL 16.4 GitHub Actions 계약 테스트

## 로컬 결과

- 권리요청 집중 테스트: 10개 통과, 0개 실패, 실제 PostgreSQL 1개 로컬 조건 skip
- 전체 테스트: 251개 중 246 통과, 0 실패, 비공개 원본 미보유 조건 5개 skip
- 프론트 타입 검사 및 프로덕션 빌드 통과
- 수동 HTTP 확인: 접수 201, 최소정보 상태 조회 200, 0건 집계 원문 저장 없음
- `data/results`, `data/competitions`, `data/manual`, `data/sources` 변경 0

## 검수 반영

- PostgreSQL 상태 변경 SQL의 타입 추론 오류를 실제 PostgreSQL QA에서 발견해 명시적
  `varchar(20)` 캐스팅으로 수정했다.
- 상태 변경 트랜잭션이 suppression 스냅샷까지 함께 반환해, 커밋 후 재조회 실패로
  관리자에게 거짓 실패를 주는 창을 제거했다.
- 운영 TLS 인증서 검증, 기존 티켓 HMAC pepper, 요청번호 로그·응답 비노출,
  만료 연락처 파기, event 범위 suppression, readiness 503을 추가했다.
- 이관은 중복 티켓·중복 또는 미연결 suppression이 하나라도 있으면 전체 롤백한다.

`npm audit --omit=dev --audit-level=high`는 기존 의존성에서 high 4건과 moderate 8건을
보고했다. 이번 변경이 새 패키지를 추가한 결과는 아니지만 실제 서비스 보안 게이트로
별도 후속 업그레이드가 필요하다.

## 남은 게이트

로컬에는 격리 PostgreSQL이 없으므로 재시작·동시성·실제 트랜잭션 검증은 GitHub Actions
`Data rights PostgreSQL contract`의 통과 결과로만 인정한다. 이 workflow가 초록색이 되기
전에는 운영 배포 또는 G004 완료를 주장하지 않는다.
