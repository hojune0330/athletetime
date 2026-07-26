# Task 7 운영 runbook·14일 수동 시험 패키지

## 산출물

- `docs/runbooks/editorial-news-discovery.md`
- `docs/templates/editorial-news-discovery-pilot.md`
- `WORKFLOW.md` 교차 링크

## 포함 범위

- NAVER Cloud Platform API HUB Application·키 발급 경로
- Render 서버 전용 환경변수와 Netlify 금지
- collector disabled 기본 배포
- migration 011~013, Render 선배포, Netlify 후배포
- 관리자 하루 한 번 수동 처리
- 일 40회·월 800회 예산 확인
- 안전 오류별 대응
- 90일 후보·13개월 run 보존
- 사고 중지·키 회전·롤백 순서
- 14일 일별 지표와 제외 이유·운영 시간 기록표
- GO-DAILY 전 P0와 책임자 승인 게이트

## 검증

- `NEWS-DISCOVERY-CONTRACT-008` 통과
- secret 값·DB URL·관리자 ID·기사 본문 예시 0
- collector 자동 실행 절차 0
- 월별 보기는 매일 저장한 metadata 집계임을 명시
