/**
 * 토스식 단계 공개 UX + 내 기록 원버튼 + 모아 보기 + 훈련 일지 라이트 계약 테스트
 *
 * 계약:
 * - UX-DISCLOSE-001: 선수 패널의 발자취/전체 기록은 눌러야 열리는 DisclosureSection
 * - UX-MYREC-001: "나로 지정" → localStorage 저장 → "내 기록 바로 보기" 버튼
 * - UX-COMBINE-001: 추정 묶음 "모아 보기"는 화면 임시 모음 (자동 병합 아님, 소속 배지 유지)
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

test('UX-COMBINE-001: combined view is screen-only merge with source badges', () => {
  const card = readSource('frontend/src/components/record-insights/CombinedRecordsCard.tsx');
  // 화면 임시 모음 명시 — 데이터 병합 아님
  assert.match(card, /화면에서만 임시로 모았/);
  assert.match(card, /동명이인일 수 있으니/);
  // 각 기록에 원래 소속 배지 유지
  assert.match(card, /sourceTeam/);

  const estimated = readSource('frontend/src/components/record-insights/EstimatedSameAthleteCard.tsx');
  assert.match(estimated, /모아 보기/);
  assert.match(estimated, /onCombine/);

  const page = readSource('frontend/src/pages/RecordsPage.tsx');
  assert.match(page, /CombinedRecordsCard/);
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
    'frontend/src/components/record-insights/CombinedRecordsCard.tsx',
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
