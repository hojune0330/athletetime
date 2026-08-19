/**
 * 토스식 단계 공개 UX + 기기 안 기록 모아보기 + 훈련 일지 라이트 계약 테스트
 *
 * 계약:
 * - UX-DISCLOSE-001: 선수 패널의 발자취/전체 기록은 눌러야 열리는 DisclosureSection
 * - UX-MYREC-001: 사용자가 고른 카드만 localStorage에 저장 → 모아 보는 기록 카드는 버튼 없이 항상 표시(접기만 가능)
 * - UX-COLLECT-001: 추정 묶음은 자동 병합하지 않으며, 선택한 카드만 이 기기에서 함께 본다
 * - UX-TRAINLOG-001: 훈련 일지 라이트 — 로컬 저장, 주간 요약, 복구 가능한 저장 상태
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
  assert.match(hook, /자동 매칭\/추정 지정은 하지 않는다/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /useMyAthlete/);
  assert.match(page, /<RecordsMineFlow/, 'self flow stays separate from public browsing');
  assert.match(page, /<RecordCandidatesSurface/, 'general browsing uses the routed workspace candidate surface');
  assert.match(page, /workspaceStore\.saveWorkspaceDraft/, 'general selection writes only the workspace draft');
  assert.doesNotMatch(page, /<MyRecordsCard|<RecordSearchResults/, 'legacy aggregate surfaces are not mounted');
  assert.doesNotMatch(page, /내 기록이에요/, 'the page must not assert that a searched athlete is the visitor');
});

test('UX-COLLECT-001: local collection is opt-in, reversible, and never auto-merges an estimated identity', () => {
  const editor = readSource('frontend/src/features/record-workspace/useRecordWorkspaceEditor.ts');
  assert.match(editor, /removeWorkspaceSubject/, 'profile fragments can be removed independently');
  assert.match(editor, /excludedRecordIds/, 'record hiding stays local to one workspace');
  assert.match(editor, /undoWorkspaceEdit/, 'the latest destructive action is reversible');
  assert.match(editor, /restoreAllWorkspaceRecords/, 'all hidden records remain recoverable');

  const estimated = readSource('frontend/src/components/record-insights/EstimatedSameAthleteCard.tsx');
  assert.match(estimated, /onSelectAthlete/, 'each suggested record can be inspected first');
  assert.match(estimated, /같은 선수라고 단정하지 않아요/);
  assert.doesNotMatch(estimated, /onCombine/, 'estimated clusters must not trigger automatic collection');
  assert.doesNotMatch(estimated, /모두 내 기록으로 합치기/);

  const candidateSurface = readSource('frontend/src/features/record-workspace/components/RecordCandidatesSurface.tsx');
  assert.match(candidateSurface, /navigate\('\/records\/workspaces\/new'/, 'selected candidates enter explicit review');
  assert.match(candidateSurface, /workspaceDraftQuery/, 'returning to the candidate screen keeps only the current query in navigation state');

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /clearWorkspaceDraft/, 'cancel clears the general selection draft');
  assert.doesNotMatch(page, /<MyRecordsCard|<RecordSearchResults/, 'the instant aggregate path stays removed');
  assert.doesNotMatch(page, /<EstimatedSameAthleteCard[\s\S]*onCombine/, 'estimated candidates require individual review');
});

test('UX-COMBINE-002: search candidates require explicit collect mode and review', () => {
  const results = readSource('frontend/src/features/record-workspace/components/RecordCandidateList.tsx');
  assert.match(results, /선수 기록 모아 보기/, 'collection mode has an explicit entry');
  assert.match(results, /mode=\{selectionMode \? 'collect' : 'browse'\}/, 'card activation has one meaning per mode');
  assert.match(results, /한 모음에는 \$\{WORKSPACE_LIMITS\.workspaceDraftSubjects\}명까지 담을 수 있어요/, 'selection limit is disclosed');
  assert.match(results, /<WorkspaceDraftTray/, 'review is reached through one action bar');
  assert.doesNotMatch(results, /onToggleMine|isMine|비교에 담기/, 'ownership and comparison stay outside browse selection');

  const candidateSurface = readSource('frontend/src/features/record-workspace/components/RecordCandidatesSurface.tsx');
  assert.match(candidateSurface, /onReviewDraft=/, 'selection review is triggered from the candidate surface');
  assert.match(candidateSurface, /workspaceDraftQuery/, 'review can return to the visible candidate selection state');

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /draftSubjectKeys=\{workspaceDraftKeys\}/, 'candidate selection comes from the isolated draft');
  assert.doesNotMatch(page, /onToggleMine=\{|onViewMyRecords=\{/, 'general search cannot write the self collection');
});

test('UX-COMBINE-003: workspace editing is unambiguous and record details stay optional', () => {
  const review = readSource('frontend/src/features/record-workspace/components/WorkspaceReviewContent.tsx');
  assert.match(review, /같은 이름이어도 같은 사람으로 확인됐다는 뜻은 아니에요/);
  assert.match(review, /한 기록 모음으로 저장할 수 없어요/);
  assert.doesNotMatch(review, /한 사람의 기록 모음/);
  assert.match(review, /선택 계속 고치기/, 'mixed names can return to the visible candidate selection');
  assert.match(review, /선택 모두 비우고 새로 찾기/, 'mixed names can explicitly erase the current draft');
  assert.doesNotMatch(review, /선수 비교로 옮기기/, 'a mixed-name draft must not promise a comparison handoff');

  const workspace = readSource('frontend/src/features/record-workspace/pages/WorkspaceRecordTab.tsx');
  assert.match(workspace, /이 모음에서 숨기기/);
  assert.match(workspace, /다시 모두 보기/);
  assert.doesNotMatch(workspace, /내 기록이에요|하나로 합쳐져요|합친 기록 보기/);

  const pref = readSource('frontend/src/components/record-insights/useRecordDetailPref.ts');
  assert.match(pref, /athletetime\.record-detail\.v1/, 'stable storage key');
  assert.match(pref, /localStorage/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /useRecordDetailPref/);
  assert.match(page, /record\.rank/, 'per-record rank shown');
  assert.match(page, /간단히 보기|자세히 보기|detailToggleLabel/, 'toggle label');
  assert.match(page, /자료가 있는 대회 기록만 보여드려요/, 'coverage transparency');
  assert.match(page, /연도와 대회별로/, 'coverage scope stays explicit');
  assert.match(page, /빠진 기록이 있을 수 있어요/, 'no continuous-coverage claim');
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
  assert.match(confirm, /선택한 후보의 공개 기록만 이 기기에서 함께 보여줘요/);
  assert.match(confirm, /선택한 선수 담기/);
  assert.doesNotMatch(confirm, /선택한 기록 담기/);
  assert.match(done, /모아 보는 기록이 준비됐어요/);
  assert.match(frame, /기록 모아보기/);
  assert.doesNotMatch(confirm, /회원님 것 같아요|기본으로 모두 합치기|이대로 합치기/);
  assert.doesNotMatch(candidates, /내 기록을 고르세요|내 것만 고르세요/);
});

test('UX-TRAINLOG-001: training log lite stores locally with weekly summary and recoverable storage', () => {
  const log = readSource('frontend/src/pages/TrainingCalculatorPage/components/TrainingLogLite.tsx');
  const storage = readSource('frontend/src/pages/TrainingCalculatorPage/components/trainingLogStorage.ts');
  assert.match(storage, /athletetime\.training-log\.v1/, 'stable storage key');
  assert.match(storage, /MAX_TRAINING_LOG_ENTRIES = 60/, 'local history has a bounded size');
  assert.match(storage, /readTrainingLog|saveTrainingLog|clearTrainingLog/, 'storage supports safe read, save, and removal');
  assert.match(log, /localStorage/);
  assert.match(log, /readTrainingLog|saveTrainingLog|clearTrainingLog/, 'the UI uses the safe storage boundary');
  assert.match(log, /최근 7일 훈련/, 'weekly summary');
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
