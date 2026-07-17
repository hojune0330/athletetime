# AthleteTime 매거진 소재 후보 계약

## 목적

이 단계는 글을 쓰거나 발행하지 않는다. 보유 중인 대회 일정, 정규화 경기 결과, 기록 변화 통계에서 운영자가 검토할 **사실 후보**만 만든다. 후보에는 제목·본문이 없으며 `autoPublish`는 항상 `false`다.

## 입력 흐름

1. `data/competitions/{year}.json`의 일정은 `createCompetitionPreviewFact()`로 변환한다.
2. 정규화 결과와 `recordAnalyticsService` 계산값은 같은 fact 계약으로 전달한다.
3. 출처는 원문 본문이 아니라 승인된 장부 참조만 `sourceRefs`에 넣는다.
4. `generateEditorialCandidates()`가 품질, 출처, 중복, 대회별 상한을 검사한다.
5. 운영자가 후보를 고른 뒤에만 기존 편집 API로 초안을 직접 작성한다.

```js
{
  factId: 'result-2026-100m-final',
  kind: 'competition_result',
  seasonYear: 2026,
  competitionId: 'competition-2026-01',
  sectionKey: 'record-story',
  subjectAgeGroup: 'adult',
  occurredAt: '2026-07-16T09:00:00.000Z',
  whyNow: '대회 결과가 이번 주 공개됐어요.',
  qualityScore: 92,
  factPayload: { event: '100m', phase: 'final', record: '10.23', wind: '+0.8' },
  sourceRefs: [{
    ref: 'SRC-20260717-0001',
    provider: '대한육상연맹',
    url: 'https://www.kaaf.or.kr/results/2026.pdf',
    reviewStatus: 'approved',
    sourceClass: 'official'
  }],
  relatedLinks: ['/competitions/competition-2026-01', '/records?event=100m']
}
```

## 출력과 운영 판단

- `ready_for_human_review`: 출처 허용 목록과 품질 기준을 통과했다. 자동 발행은 여전히 불가하다.
- `review_only`: 출처가 HTTPS 공개 주소이지만 허용 목록 밖이다. 운영자가 출처 정책을 추가 검토하기 전에는 승인할 수 없다.
- `blocked`: 출처 없음, 최근 30일 중복, 대회별 상한, 제한 필드 등으로 후보 사용이 불가하다.
- `calendarDisposition: skipped`: `whyNow` 없음, 품질 미달, 현재 연결고리 없는 아카이브다. 관리자는 사유와 version을 넣어 `/calendar/:id/skip`으로 종결한다.

대회 패키지 상한은 프리뷰 1건 + 결과 맥락 1건 + 독립 가치가 있는 기록 후속 1건이다. fingerprint는 후보 ID나 출처 URL이 아니라 사실 유형, 대회, 발생 시각, 정규화된 사실 payload로 계산한다.

허용 출처와 목록 밖 출처를 섞어도 전체 후보는 `review_only`다. 미승인·형식 오류 출처가 하나라도 섞이면 전체 후보를 차단한다. `result.kaaf.or.kr`은 운영 옵션으로도 허용할 수 없는 영구 제외 호스트다.

## 저장 금지

후보 payload에는 기사 전문, 원문 HTML, 선수 원천 고유번호, 생년월일, 연락처, 주소, 쿠키·세션·Authorization 값을 넣지 않는다. 발견하면 값을 제거하고 `restricted_fact_payload`로 차단한다. 선수 이름은 공개 경기 사실을 설명하는 최소 범위에서만 사용할 수 있으며 동명이인 확정 근거로 사용하지 않는다.

## AI 경계

4주 수동 파일럿과 별도 승인 전에는 외부 AI provider/API를 연결하지 않는다. AI 결과는 사실 근거가 아니고, 자동 초안과 자동 발행 기능도 없다. 향후 실험이 승인되더라도 입력은 이 후보 계약의 검증된 fact/source 필드로 제한하고 사람 승인을 유지한다.
