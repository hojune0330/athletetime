# AthleTime Data Privacy Guardrails

이 문서는 향후 대한육상연맹, 실업육상연맹, 학교/대회 운영 주체 등 외부 기록 데이터를 검색 UX에 연결하기 전 반드시 확인해야 할 운영 기준입니다. 법률 자문이나 최종 법적 판단이 아니며, 아래 항목이 확인되기 전에는 수집, 저장, 캐시, 색인, 공개 노출을 시작하지 않습니다.

## Source Inventory

- 데이터 출처별로 운영 주체, 원본 URL 또는 제공 경로, 제공 방식, 이용 조건, 담당 연락 창구를 기록합니다.
- 공개 페이지에 보이는 경기 결과라도 저장, 재배포, 조합 검색, 프로필화가 항상 허용된다고 가정하지 않습니다.
- 출처 권한과 이용 범위를 확인하지 못한 데이터는 제품 데이터베이스, 캐시, 검색 색인에 넣지 않습니다.

## Allowed Fields

- UX에 꼭 필요한 최소 필드만 허용합니다: 선수명, 소속, 종목, 대회명, 기록, 순위, 경기일, 출처 링크.
- 생년월일, 주소, 연락처, 학년, 학교 세부 정보, 사진, 식별번호 등 추가 개인정보는 별도 필요성 검토 전까지 금지합니다.
- 새 필드를 추가할 때는 목적, 공개 필요성, 보관 기간, 삭제 방법을 함께 문서화합니다.

## Minor Athlete Data

- 유소년 및 미성년 선수 데이터는 공개 여부와 관계없이 높은 주의가 필요한 데이터로 취급합니다.
- 미성년 여부가 불명확하면 미성년 데이터로 간주하고 더 엄격한 기준을 적용합니다.
- 보호자/선수 고지 또는 동의 필요성, 출처 제공 권한, 노출 범위, 정정/삭제 요청 경로가 확인되기 전에는 수집과 저장을 보류합니다.
- 미성년 선수 화면은 과도한 평가, 비교 낙인, 스카우팅성 노출을 만들 수 있는 표현을 피합니다.

## Retention

- 보관 목적, 기간, 삭제 트리거, 백업/캐시 만료 기준이 정해지기 전에는 영구 저장을 만들지 않습니다.
- 임시 캐시가 필요하면 위치, 접근 권한, 만료 시점, 삭제 절차를 기록하고 최소 기간만 유지합니다.
- 목적이 사라진 데이터는 재사용하지 않고 삭제 대상으로 표시합니다.

### Concrete data-rights retention schedule

- Identifiable data-rights request fields and the public lookup key are anonymized 3 years after receipt, regardless of request status.
- Contact data is retained no later than 90 days after receipt and no later than 30 days after terminal closure. The earlier deadline controls.
- Inactive suppression records are deleted when the associated request expires. Active suppression records are retained only while needed to honor a hide or removal request; they are not retained as general request history.
- Aggregate zero-result metrics are retained for 24 months. They must not contain raw queries, query fingerprints, IP addresses, user agents, user IDs, or other identifiers.
- Data-rights HTTP responses use `Cache-Control: no-store`; the application must not cache request details or public lookup responses.
- Production backups containing data-rights data must be encrypted, access-controlled, and retained for at most 35 days. Data already purged or anonymized in the live system ages out no later than the next backup expiry.
- These are concrete operational limits, not a claim of legal safety. Fable/privacy approval remains an explicit launch and production gate, and any approved shorter period takes precedence.

## Correction/Removal

- 선수, 보호자, 소속 단체, 출처 운영자가 정정, 삭제, 비공개 처리를 요청할 수 있는 연락 경로를 제공합니다.
- 요청 처리 중인 데이터는 추천, 랭킹, 비교, 검색 강조에 사용하지 않습니다.
- 원출처가 수정하거나 삭제한 기록을 AthleTime에서도 반영하거나 제거할 절차를 둡니다.

## No Sensitive Inference

- 기록, 소속, 지역, 경기 이력으로 건강 상태, 부상 위험, 경제 상황, 민감한 신원 특성, 정치/종교 성향을 추론하거나 암시하지 않습니다.
- 자동 추천, 비교, 랭킹 기능은 미성년자에게 부당한 압박이나 낙인을 만들 수 있는지 먼저 검토합니다.
- 검색 결과 설명은 확인된 경기 정보로 제한하고 추측성 문장을 사용하지 않습니다.

## Launch Checklist

- 출처 권한과 이용 범위가 문서화되어 있다.
- 허용 필드와 금지 필드가 정의되어 있다.
- 미성년 선수 데이터 처리 기준과 보류 조건이 정의되어 있다.
- 보관 기간, 삭제 트리거, 캐시/백업 만료 기준이 정해져 있다.
- 정정/삭제 요청 접수 및 반영 절차가 준비되어 있다.
- 민감정보 추론 금지와 미성년자 안전 검토가 완료되어 있다.
- 위 항목이 완료되기 전에는 외부 기록 데이터의 수집, 저장, 색인, 공개 노출을 시작하지 않는다.
