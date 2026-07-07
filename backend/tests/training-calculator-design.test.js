/**
 * 훈련 계산기 TRAINORACLE 디자인 계약 테스트
 *
 * - CALC-DS-001: 금지 규칙 — 그라데이션/font-awesome/이모지 아이콘 제거
 * - CALC-DS-002: TRAINORACLE 프리미티브 사용 — MetricCell/EnergyTag/MainMark
 * - CALC-DS-003: 시각화 — 페이스 스펙트럼(구역 마커), 메조사이클 볼륨 바, 7일 레일
 * - CALC-DS-004: 숫자는 mono + tabular-nums
 * - CALC-DS-005: 신뢰 톤 — 공식/랭킹/검증/예측 표현 금지
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const CALC_DIR = 'frontend/src/pages/TrainingCalculatorPage';

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const COMPONENT_FILES = [
  `${CALC_DIR}/index.tsx`,
  `${CALC_DIR}/components/CalcSection.tsx`,
  `${CALC_DIR}/components/AthleteProfileForm.tsx`,
  `${CALC_DIR}/components/PerformanceInput.tsx`,
  `${CALC_DIR}/components/SpecialConditions.tsx`,
  `${CALC_DIR}/components/VdotScoreCard.tsx`,
  `${CALC_DIR}/components/TrainingZones.tsx`,
  `${CALC_DIR}/components/WeeklyPlanView.tsx`,
  `${CALC_DIR}/components/MesocycleView.tsx`,
  `${CALC_DIR}/components/WorkoutDetailsView.tsx`,
  `${CALC_DIR}/components/RecommendationsView.tsx`,
  `${CALC_DIR}/components/TrainingLogLite.tsx`,
];

test('CALC-DS-001: calculator surfaces obey TRAINORACLE prohibitions', () => {
  for (const file of COMPONENT_FILES) {
    const source = readSource(file);
    assert.doesNotMatch(source, /bg-gradient-to|gradient-bg/, `${file}: gradients are banned`);
    assert.doesNotMatch(source, /className="fas |fa-solid|font-awesome/, `${file}: font-awesome icons are banned`);
    assert.doesNotMatch(source, /rounded-(xl|2xl|3xl|full)"/, `${file}: large radius decoration banned (square corners)`);
  }
  // 이모지 아이콘 헤더 금지 (UI 이모지 금지 규칙)
  const index = readSource(`${CALC_DIR}/index.tsx`);
  assert.doesNotMatch(index, /icon="🏋️"|icon='🏋️'/, 'emoji page icon removed');

  const css = readSource(`${CALC_DIR}/styles/training-calculator.css`);
  assert.doesNotMatch(css, /linear-gradient\(135deg, #4f46e5|training-zone-easy/, 'legacy gradient classes removed');
});

test('CALC-DS-002: calculator uses TRAINORACLE primitives', () => {
  const vdot = readSource(`${CALC_DIR}/components/VdotScoreCard.tsx`);
  assert.match(vdot, /MetricCell/, 'VDOT summary uses MetricCell strip');

  const zones = readSource(`${CALC_DIR}/components/TrainingZones.tsx`);
  assert.match(zones, /EnergyTag/, 'zones carry energy tags (dot + underline only)');

  const workouts = readSource(`${CALC_DIR}/components/WorkoutDetailsView.tsx`);
  assert.match(workouts, /MainMark/, 'key sessions carry MAIN marker');

  const profile = readSource(`${CALC_DIR}/components/AthleteProfileForm.tsx`);
  assert.match(profile, /CalcSection/, 'input steps share CalcSection wrapper');
});

test('CALC-DS-003: results include visual encodings', () => {
  const zones = readSource(`${CALC_DIR}/components/TrainingZones.tsx`);
  assert.match(zones, /positionOf/, 'pace spectrum places zone markers on an axis');
  assert.match(zones, /FAST → SLOW/, 'spectrum axis is labelled');

  const meso = readSource(`${CALC_DIR}/components/MesocycleView.tsx`);
  assert.match(meso, /heightPct/, 'mesocycle renders volume bars');

  const weekly = readSource(`${CALC_DIR}/components/WeeklyPlanView.tsx`);
  assert.match(weekly, /bg-ink text-bg/, 'high-intensity day inverted like CycleRail MAIN cell');
});

test('CALC-DS-004: numerics are monospaced with tabular figures', () => {
  for (const file of [
    `${CALC_DIR}/components/TrainingZones.tsx`,
    `${CALC_DIR}/components/PerformanceInput.tsx`,
    `${CALC_DIR}/components/WorkoutDetailsView.tsx`,
    `${CALC_DIR}/components/TrainingLogLite.tsx`,
  ]) {
    const source = readSource(file);
    assert.match(source, /font-mono/, `${file}: numerics use mono`);
    assert.match(source, /tabular-nums/, `${file}: tabular figures`);
  }
});

test('CALC-DS-005: calculator copy keeps trust tone', () => {
  const banned = /공식 인증|공식 기록입니다|랭킹|검증된 기록|예측 결과/;
  for (const file of COMPONENT_FILES) {
    assert.doesNotMatch(readSource(file), banned, `${file}: trust-violating words banned`);
  }
});

test('CALC-ROUTE-001: legacy calculators route opens the training calculator instead of 404', () => {
  const app = readSource('frontend/src/App.tsx');

  assert.match(app, /path="\/training-calculator"/, 'canonical training calculator route exists');
  assert.match(app, /path="\/calculators"/, 'legacy calculators route stays compatible');
});
