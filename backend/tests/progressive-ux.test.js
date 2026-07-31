/**
 * 토스식 단계 공개 UX + 기기 안 기록 모아보기 + 훈련 일지 라이트 계약 테스트
 *
 * 계약:
 * - UX-DISCLOSE-001: 선수 패널의 발자취/전체 기록은 눌러야 열리는 DisclosureSection
 * - UX-MYREC-001: 사용자가 고른 카드만 localStorage에 저장 → 모아 보는 기록 카드는 버튼 없이 항상 표시(접기만 가능)
 * - UX-COLLECT-001: 추정 묶음은 자동 병합하지 않으며, 선택한 카드만 이 기기에서 함께 본다
 * - UX-TRAINLOG-001: 훈련 일지 라이트 — 로컬 저장, 주간 요약, TRAINORACLE 기대감 카드
 * - UX-TONE-001: 신규 표면에 공식/랭킹/예측/평가 표현 금지
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('UX-DISCLOSE-001: athlete panel uses click-to-open disclosure sections', () => {
  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /DisclosureSection/, 'DisclosureSection component must exist');
  assert.match(page, /aria-expanded=\{open\}/, 'disclosure must expose aria-expanded');
  // 발자취와 전체 기록이 단계 공개 대상
  assert.match(page, /title="기록 발자취"/);
  assert.match(page, /title="최근 모은 기록"/);
  // 접힌 상태에서는 내용 렌더 안 함 (한번에 다 보여주지 않기)
  assert.match(page, /\{open && <CardContent/);
});

test('UX-MOBILE-001: anonymous insight cards do not widen the records page on narrow screens', () => {
  const insights = readSource('frontend/src/components/record-insights/AnonymousInsightCards.tsx');
  assert.match(
    insights,
    /className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3"/,
    'the insight grid must allow its intrinsic width to shrink',
  );

  const cardClassNames = [...insights.matchAll(/<Card className="([^"]*)">/g)]
    .map((match) => match[1]);
  assert.equal(cardClassNames.length, 3, 'all three insight cards must declare a shrinkable width');
  for (const className of cardClassNames) {
    assert.match(className, /\bmin-w-0\b/, 'each insight card must shrink within the mobile grid');
  }
});

test('UX-MYREC-001: a user-selected local collection stays visible without claiming identity', () => {
  const hook = readSource('frontend/src/components/record-insights/useMyAthlete.ts');
  assert.match(hook, /athletetime\.my-athlete\.v1/, 'stable storage key');
  assert.match(hook, /localStorage/);
  // 자동 지정 금지 — 사용자가 직접 누른 것만
  assert.match(hook, /자동 매칭\/추정 지정은 하지 않는다/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /useMyAthlete/);
  // 담긴 게 있으면 버튼 없이 바로 보임 — 숨김이 아니라 접기만 가능
  assert.match(page, /myEntries\.length > 0 && \(/, 'card renders whenever entries exist');
  assert.match(page, /myRecordsCollapsed/, 'collapse-not-hide model');
  assert.match(page, /펼치기/, 'collapsed slim bar reopens the card');
  assert.doesNotMatch(page, /내 기록 바로 보기/, 'separate view button removed — card itself is the entry');
  assert.match(page, /내가 모아 보는 기록/);
  assert.match(page, /이 기록 담기/);
  assert.doesNotMatch(page, /내 기록이에요/, 'the page must not assert that a searched athlete is the visitor');
});

test('UX-COLLECT-001: local collection is opt-in, reversible, and never auto-merges an estimated identity', () => {
  const hook = readSource('frontend/src/components/record-insights/useMyAthlete.ts');
  assert.match(hook, /addMany/, 'manually selected candidates may be collected together');
  assert.match(hook, /remove/, 'hook must support after-the-fact removal');
  assert.match(hook, /toggle/, 'hook must support one-tap toggle');

  const card = readSource('frontend/src/components/record-insights/MyRecordsCard.tsx');
  assert.match(card, /sourceTeam/, 'each record keeps its source team badge');
  assert.match(card, /onRemove/, 'removal chips are the correction path');
  assert.match(card, /원본 데이터는 그대로/, 'screen-only merge disclosure');
  assert.match(card, /이 기기에만 저장/, 'collection scope is explicit');

  const estimated = readSource('frontend/src/components/record-insights/EstimatedSameAthleteCard.tsx');
  assert.match(estimated, /onSelectAthlete/, 'each suggested record can be inspected first');
  assert.match(estimated, /같은 선수라고 단정하지 않아요/);
  assert.doesNotMatch(estimated, /onCombine/, 'estimated clusters must not trigger automatic collection');
  assert.doesNotMatch(estimated, /모두 내 기록으로 합치기/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /MyRecordsCard/);
  assert.match(page, /addManyMyAthletes/);
  assert.match(page, /toggleMyAthlete/);
  assert.doesNotMatch(page, /<EstimatedSameAthleteCard[\s\S]*onCombine/, 'estimated candidates require individual review');
});

test('UX-COMBINE-002: search candidates offer direct "나" designation with instant merge', () => {
  // 검색 후보 카드에서 바로 "나" 지정 — 여러 카드를 누르면 전부 내 기록으로 합산
  const results = readSource('frontend/src/components/records/RecordSearchResults.tsx');
  assert.match(results, /onToggleMine/, 'candidate card exposes one-tap mine toggle');
  assert.match(results, /이 기록 담기/, 'action names the collection action, not athlete ownership');
  assert.match(results, /✓ 내가 모아 보는 기록/, 'selected card shows collection state');
  assert.match(results, /모아 보는 기록 보기/, 'collection entry point is clear');
  assert.match(results, /aria-pressed=\{mine\}/, 'mine toggle is accessible');
  assert.doesNotMatch(results, /내 기록이에요|하나로 합쳐져요|합친 기록 보기/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /onToggleMine=\{/, 'page wires candidate mine toggle');
  assert.match(page, /onViewMyRecords=\{/, 'page wires merged dashboard opener');

  // 대시보드: 종목별 베스트·시즌 베스트도 묶음 전체 합산
  const card = readSource('frontend/src/components/record-insights/MyRecordsCard.tsx');
  assert.match(card, /eventBests/, 'per-event bests merged across clusters');
  assert.match(card, /seasonBest/, 'season best merged across clusters');
  assert.match(card, /markSortValue/, 'record marks compared numerically');
});

test('UX-COMBINE-003: mine designation is unambiguous and detail info is toggleable', () => {
  // 후보 카드: 모호한 "나" 대신 문장형 라벨 + 담김 상태 + 해제 안내
  const results = readSource('frontend/src/components/records/RecordSearchResults.tsx');
  assert.match(results, /이 기록 담기/, 'plain collection label');
  assert.match(results, /내가 모아 보는 기록에 담김/, 'designated state is explicit');
  assert.match(results, /누르면 빼요/, 'undo affordance on the same button');
  // 담긴 묶음이 있으면 하단 고정 바(장바구니 패턴)로 다음 행동 안내
  assert.match(results, /fixed inset-x-0 bottom-0/, 'sticky merge bar');
  assert.match(results, /이 기기에서만 모아 봐요/, 'device-local scope is explicit');
  assert.match(results, /모아 보는 기록 보기/);
  assert.doesNotMatch(results, /내 기록이에요|하나로 합쳐져요|합친 기록 보기/);

  // 순위·날짜·비고 보기/숨기기 토글 — 기기 단위 기억
  const pref = readSource('frontend/src/components/record-insights/useRecordDetailPref.ts');
  assert.match(pref, /athletetime\.record-detail\.v1/, 'stable storage key');
  assert.match(pref, /localStorage/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /useRecordDetailPref/);
  assert.match(page, /record\.rank/, 'per-record rank shown');
  assert.match(page, /간단히 보기|자세히 보기|detailToggleLabel/, 'toggle label');
  assert.match(page, /자료가 있는 대회 기록만 보여드려요/, 'coverage transparency');
  assert.match(page, /연도와 대회별로 빠진 기록이 있을 수 있어요/, 'no continuous-coverage claim');

  const myCard = readSource('frontend/src/components/record-insights/MyRecordsCard.tsx');
  assert.match(myCard, /useRecordDetailPref/);
  assert.match(myCard, /record\.rank/, 'rank in merged dashboard rows');
});

test('UX-COLLECT-004: the guided collection flow never defaults an identity or a merge', () => {
  const name = readSource('frontend/src/components/records/RecordsMineNameStep.tsx');
  const candidates = readSource('frontend/src/components/records/RecordsMineCandidateStep.tsx');
  const confirm = readSource('frontend/src/components/records/RecordsMineConfirmStep.tsx');
  const done = readSource('frontend/src/components/records/RecordsMineDoneStep.tsx');
  const frame = readSource('frontend/src/components/records/RecordsMineFrame.tsx');

  assert.match(name, /기록 모아보기/);
  assert.match(candidates, /화면에 모아 볼 기록을 고르세요/);
  assert.match(candidates, /원하는 기록만 고르세요/);
  assert.match(confirm, /선택한 기록만 이 기기에서 함께 보여줘요/);
  assert.match(confirm, /선택한 기록 담기/);
  assert.match(done, /모아 보는 기록이 준비됐어요/);
  assert.match(frame, /기록 모아보기/);
  assert.doesNotMatch(confirm, /회원님 것 같아요|기본으로 모두 합치기|이대로 합치기/);
  assert.doesNotMatch(candidates, /내 기록을 고르세요|내 것만 고르세요/);
});

test('UX-TRAINLOG-001: training log lite stores locally with weekly summary and TRAINORACLE teaser', () => {
  const log = readSource('frontend/src/pages/TrainingCalculatorPage/components/TrainingLogLite.tsx');
  assert.match(log, /athletetime\.training-log\.v1/, 'stable storage key');
  assert.match(log, /localStorage/);
  assert.match(log, /최근 7일 훈련/, 'weekly summary');
  assert.match(log, /TRAINORACLE|트레인오라클/, 'TRAINORACLE anticipation');
  assert.match(log, /이 기기에만 저장/, 'local-only storage disclosure');

  const calculator = readSource('frontend/src/pages/TrainingCalculatorPage/index.tsx');
  assert.match(calculator, /TrainingLogLite/);
});

test('UX-TONE-001: new surfaces avoid trust-violating words', () => {
  const files = [
    'frontend/src/components/record-insights/MyRecordsCard.tsx',
    'frontend/src/components/record-insights/EstimatedSameAthleteCard.tsx',
    'frontend/src/components/record-insights/useMyAthlete.ts',
    'frontend/src/pages/TrainingCalculatorPage/components/TrainingLogLite.tsx',
  ];
  for (const file of files) {
    const source = readSource(file);
    assert.doesNotMatch(source, /공식 인증|공식 기록입니다|랭킹|검증된 기록|예측 결과/, `${file} must avoid trust-violating words`);
  }
});

test('UX-WORKFLOW-001: workflow doc anchors the athletetime-first development flow', () => {
  const workflow = readSource('WORKFLOW.md');
  assert.match(workflow, /athletetime/);
  assert.match(workflow, /2026-first-item/);
  assert.match(workflow, /Codex는 athletetime에 직접 커밋/);
  const readme = readSource('README.md');
  assert.match(readme, /WORKFLOW\.md/);
});
