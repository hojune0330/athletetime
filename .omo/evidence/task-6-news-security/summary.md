# Task 6 보안·정책·동시성 검수

- 대상 커밋: `28f1cf7`, `8faefd4`
- 독립 리뷰: Critical 0, High 0, Medium 0
- 집중 공격·경계 테스트: 109 통과, 실패 0
- 전체 테스트: 445 통과, 실패 0, 로컬 PostgreSQL 환경 의존 43 skip
- 프론트 운영 빌드: `tsc -b && vite build` 통과
- 실제 PostgreSQL CI:
  - [migration-contract](https://github.com/hojune0330/athletetime/actions/runs/30183893229/job/89745094394)
  - [postgres-contract](https://github.com/hojune0330/athletetime/actions/runs/30183893232/job/89745094416)

## 닫은 문제

- 호출 한도를 메모리에서 PostgreSQL 원장으로 옮겨 재시작·다중 인스턴스 우회 차단
- 재시도마다 호출 예산 선점
- 성공·실패 동시 요청을 한 실행으로 묶고 이후 명시적 재시도만 허용
- 실행 시작·완료와 감사 이벤트를 같은 트랜잭션으로 저장
- 감사 이벤트의 호출 수를 DB 반환값으로 기록
- collector flag를 fail-closed로 적용하고 API HUB 환경변수 이름으로 통일
- 저장 실패를 무관 기사로 오인하지 않고 실행 실패로 기록
- HTML entity 선처리, 태그 제거, 길이 제한으로 저장형 XSS 경계 강화
- 미성년자·선정적 제목 관리자 경고
- 잘못된 cursor UUID를 DB 전에 400으로 차단
- run 보존 후 migration 012 rollback 가능
- 관리자 수동 화면을 공개 초기 번들에서 분리

## 공개 경계

- 공개 route에 news discovery endpoint 0
- 공개 초기 번들에 `news-discoveries`, `소식 발견함`, `reviewNote`,
  `NAVER_API_HUB_KEY`, `NAVER_NEWS_COLLECTOR_ENABLED` 0
- 기사 본문·description·원본 HTML·키 저장 0
- 자동 초안·승인·발행 0

## 별도 P0

기존 의존성 감사 결과는 이 기능이 만든 회귀가 아니지만 배포 전 별도 보안 PR이
필요하다. `npm audit fix --force`는 사용하지 않는다.
