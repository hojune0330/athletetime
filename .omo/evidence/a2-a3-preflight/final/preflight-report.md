# A-2/A-3 Legacy Expansion Preflight

- Years: 2015, 2016, 2017
- 서비스 데이터는 변경하지 않음: 예
- 원본 파일 git 추적 수: 0
- 내부 원본 경로 제외: 예

## A-2 Held Indoor Workbook

- 2016 전국대구실내육상경기대회: 729행 보류, reason=UNSAFE_EVENT_LABELS, headerRows=131, source=014_2016 전국대구실내육상경기대회 기록지20161201.xlsx

### Parser Rules Required

- strip-indoor-heat-suffix: 60m 4처럼 조/레인 숫자가 붙은 실내 종목명을 종목+보조정보로 분리
- drop-header-pollution: 성명/소속/기록 헤더 행은 선수 결과로 승격하지 않음
- preserve-indoor-event-keys: 실내 60m와 60mH는 실외 100m 계열과 별도 eventKey로 보존
- still-held-on-ambiguity: 파서가 확신하지 못한 행은 삭제하지 않고 still-held로 보류

## A-3 Legacy XLS Queue

- Status: blocked_pending_converter_approval
- .xls files: 83
- By year: 2015=29, 2016=28, 2017=26
- Dependency approval required: yes
- Conversion attempted: no
- Note: SheetJS 같은 BIFF .xls 파서 의존성은 승인 후 추가하고, 변환 결과는 기존 정규화 파이프라인으로 다시 검증한다.

## Next Actions

- A-2 실내 보류 파일 전용 파서를 테스트 먼저 추가한다.
- A-3 .xls 변환 의존성은 PR에서 승인받은 뒤 추가한다.
- 변환 성공 파일만 normalized-candidates -> dry-run promotion -> reviewer 승인 순서로 이동한다.
- 애매한 파일은 still-held 사유를 남기고 서비스 데이터에는 올리지 않는다.
