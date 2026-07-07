/**
 * 토스식 단계 공개 UX + 원탭 나로 지정 즉시 합산 + 훈련 일지 라이트 계약 테스트
 *
 * 계약:
 * - UX-DISCLOSE-001: 선수 패널의 발자취/전체 기록은 눌러야 열리는 DisclosureSection
 * - UX-MYREC-001: "나로 지정" → localStorage 저장 → "내 기록 바로 보기" 버튼
 * - UX-COMBINE-001: 원탭 즉시 합산 — 누르면 바로 내 기록, 사후 ×로 빼기, 원본 데이터 불변
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

test('UX-MYREC-001: my-athlete pin saves locally and offers one-tap view', () => {
  const hook = readSource('frontend/src/components/record-insights/useMyAthlete.ts');
  assert.match(hook, /athletetime\.my-athlete\.v1/, 'stable storage key');
  assert.match(hook, /localStorage/);
  // 자동 지정 금지 — 사용자가 직접 누른 것만
  assert.match(hook, /자동 매칭\/추정 지정은 하지 않는다/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /useMyAthlete/);
  assert.match(page, /내 기록 바로 보기/);
  assert.match(page, /나로 지정/);
});

test('UX-COMBINE-001: one-tap merge — instant summation, after-the-fact removal, originals untouched', () => {
  // 훅: 다중 지정 배열 + 한 번에 묶음 지정(addMany) + 사후 제거(remove)
  const hook = readSource('frontend/src/components/record-insights/useMyAthlete.ts');
  assert.match(hook, /addMany/, 'hook must support one-tap cluster merge');
  assert.match(hook, /remove/, 'hook must support after-the-fact removal');
  assert.match(hook, /toggle/, 'hook must support one-tap toggle');

  // 내 기록 카드: 지정한 묶음 전부 합산 표시 + 소속 배지 유지 + × 빼기 + 원본 불변 안내
  const card = readSource('frontend/src/components/record-insights/MyRecordsCard.tsx');
  assert.match(card, /sourceTeam/, 'each record keeps its source team badge');
  assert.match(card, /onRemove/, 'removal chips are the correction path');
  assert.match(card, /원본 데이터는 그대로/, 'screen-only merge disclosure');

  // 추정 묶음 카드: 확인 대화 없이 원탭 합치기 CTA
  const estimated = readSource('frontend/src/components/record-insights/EstimatedSameAthleteCard.tsx');
  assert.match(estimated, /모두 내 기록으로 합치기/, 'single one-tap merge CTA');
  assert.match(estimated, /onCombine/);
  assert.doesNotMatch(estimated, /모아 보기/, 'two-step screen-only view removed');

  // 페이지 배선: 누르면 바로 합쳐진 내 기록 카드가 열린다 (중간 단계 없음)
  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /MyRecordsCard/);
  assert.match(page, /addManyMyAthletes/);
  assert.match(page, /toggleMyAthlete/);
  assert.doesNotMatch(page, /CombinedRecordsCard/, 'legacy screen-only card removed');
  assert.doesNotMatch(page, /window\.confirm/, 'no confirmation dialogs in one-tap flow');
});

test('UX-COMBINE-002: search candidates offer direct "나" designation with instant merge', () => {
  // 검색 후보 카드에서 바로 "나" 지정 — 여러 카드를 누르면 전부 내 기록으로 합산
  const results = readSource('frontend/src/components/records/RecordSearchResults.tsx');
  assert.match(results, /onToggleMine/, 'candidate card exposes one-tap mine toggle');
  assert.match(results, /✓ 내 기록/, 'designated card shows mine badge');
  assert.match(results, /합친 기록 보기/, 'merged dashboard entry point above candidates');
  assert.match(results, /aria-pressed=\{mine\}/, 'mine toggle is accessible');

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
  assert.match(results, /내 기록이에요/, 'plain-sentence designation label');
  assert.match(results, /내 기록에 담김/, 'designated state is explicit');
  assert.match(results, /누르면 빼요/, 'undo affordance on the same button');
  // 담긴 묶음이 있으면 하단 고정 바(장바구니 패턴)로 다음 행동 안내
  assert.match(results, /fixed inset-x-0 bottom-0/, 'sticky merge bar');
  assert.match(results, /합친 기록 보기/);

  // 순위·날짜·비고 보기/숨기기 토글 — 기기 단위 기억
  const pref = readSource('frontend/src/components/record-insights/useRecordDetailPref.ts');
  assert.match(pref, /athletetime\.record-detail\.v1/, 'stable storage key');
  assert.match(pref, /localStorage/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /useRecordDetailPref/);
  assert.match(page, /record\.rank/, 'per-record rank shown');
  assert.match(page, /간단히 보기|자세히 보기|detailToggleLabel/, 'toggle label');
  // 데이터 범위 투명성 — 2005-2017은 아직 정리 중임을 명시
  assert.match(page, /2018년 이후 기록/, 'coverage transparency');

  const myCard = readSource('frontend/src/components/record-insights/MyRecordsCard.tsx');
  assert.match(myCard, /useRecordDetailPref/);
  assert.match(myCard, /record\.rank/, 'rank in merged dashboard rows');
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
