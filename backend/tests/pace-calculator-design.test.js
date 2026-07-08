const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const PACE_DIR = 'frontend/src/pages/PaceCalculatorPage';
const DEFAULT_SURFACE_FILES = [
  `${PACE_DIR}/index.tsx`,
  `${PACE_DIR}/components/TargetPaceCalculator.tsx`,
];

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('PACE-DS-001: default pace surface removes old decorative UI', () => {
  for (const file of DEFAULT_SURFACE_FILES) {
    const source = readSource(file);
    assert.doesNotMatch(source, /bg-gradient-to|from-blue-500|to-blue-600/, `${file}: gradients are banned`);
    assert.doesNotMatch(source, /className={`?fas |fa-solid|font-awesome/, `${file}: font-awesome icons are banned`);
    assert.doesNotMatch(source, /⏱️|🎯|📋|💡|📏/, `${file}: emoji icons are banned on the default surface`);
    assert.doesNotMatch(source, /rounded-(xl|2xl|3xl)"/, `${file}: large radius decoration banned`);
  }
});

test('PACE-DS-002: target pace result uses TRAINORACLE numeric primitives', () => {
  const target = readSource(`${PACE_DIR}/components/TargetPaceCalculator.tsx`);

  assert.match(target, /MetricCell/, 'target pace results use MetricCell strip');
  assert.match(target, /PACE OUTPUT/, 'result section has a mono technical label');
  assert.match(target, /font-mono/, 'numeric inputs and labels use mono');
  assert.match(target, /tabular-nums/, 'numeric values use tabular figures');
});

test('PACE-SC-001: track events 800m/1500m/3000mSC with water-jump placement are supported', () => {
  const target = readSource(`${PACE_DIR}/components/TargetPaceCalculator.tsx`);
  const calc = readSource(`${PACE_DIR}/utils/paceCalculations.ts`);

  // 800m / 1500m quick distances on the target calculator
  assert.match(target, /label: '800m', value: 800/, '800m quick distance exists');
  assert.match(target, /label: '1500m', value: 1500/, '1500m quick distance exists');

  // 3000mSC mode uses the pre-computed STEEPLECHASE_SPECS (user-verified inside/outside water-jump variants)
  assert.match(target, /STEEPLECHASE_SPECS/, 'steeplechase specs are wired into the calculator');
  assert.match(target, /3000mSC/, '3000mSC mode button exists');
  assert.match(target, /물웅덩이/, 'water-jump placement is surfaced in Korean');
  assert.match(target, /트랙 안쪽/, 'inside-track placement option exists');
  assert.match(target, /트랙 바깥쪽/, 'outside-track placement option exists');
  assert.match(target, /스타트 구간/, 'start segment split row exists');
  assert.match(target, /SC LAP SPLITS/, 'SC lap splits table has a mono technical label');

  // Specs themselves stay locked to the user's calculations (start + 7 laps = 3000m)
  assert.match(calc, /lapDistance: 396\.084/, 'INSIDE lap distance preserved');
  assert.match(calc, /startDistance: 227\.412/, 'INSIDE start distance preserved');
  assert.match(calc, /lapDistance: 419\.407/, 'OUTSIDE lap distance preserved');
  assert.match(calc, /startDistance: 64\.151/, 'OUTSIDE start distance preserved');
});

test('PACE-DS-003: pace page copy is direct and not a training-plan duplicate', () => {
  const index = readSource(`${PACE_DIR}/index.tsx`);

  assert.match(index, /페이스 계산기/);
  assert.match(index, /목표 기록으로 km·400m·100m 페이스를 바로 확인해요/);
  assert.doesNotMatch(index, /훈련 계획 도구/);
  assert.doesNotMatch(index, /페이스 계산기 & 차트/);
});

test('PACE-DS-004: track event splits expose steeplechase water-jump variants', () => {
  const component = readSource(`${PACE_DIR}/components/TrackEventSplits.tsx`);
  const utils = readSource(`${PACE_DIR}/utils/paceCalculations.ts`);
  const index = readSource(`${PACE_DIR}/index.tsx`);

  // 사용자가 직접 계산해 둔 물웅덩이 위치별 랩 거리 — 절대 변경 금지
  assert.match(utils, /lapDistance:\s*396\.084/, 'inside lap distance preserved');
  assert.match(utils, /startDistance:\s*227\.412/, 'inside start distance preserved');
  assert.match(utils, /lapDistance:\s*419\.407/, 'outside lap distance preserved');
  assert.match(utils, /startDistance:\s*64\.151/, 'outside start distance preserved');

  // 두 variant 모두 정확히 3000m
  assert.ok(Math.abs(227.412 + 7 * 396.084 - 3000) < 0.01, 'inside variant sums to 3000m');
  assert.ok(Math.abs(64.151 + 7 * 419.407 - 3000) < 0.01, 'outside variant sums to 3000m');

  assert.match(component, /물웅덩이 안쪽|STEEPLECHASE_SPECS/, 'component uses steeple specs');
  assert.match(utils, /물웅덩이 안쪽/, 'inside label present');
  assert.match(utils, /물웅덩이 바깥쪽/, 'outside label present');
  assert.match(component, /랩별 통과 목표/, 'splits table heading present');
  assert.match(component, /SPLIT OUTPUT/, 'mono technical label present');
  assert.match(component, /MetricCell/, 'uses MetricCell strip');
  assert.match(component, /tabular-nums/, 'numeric values use tabular figures');
  assert.doesNotMatch(component, /bg-gradient-to|font-awesome|⏱️|🎯|📋|💡|📏/, 'TRAINORACLE bans respected');

  assert.match(index, /TrackEventSplits/, 'track tab wired into pace page');
  assert.match(index, /트랙 종목/, 'track tab label present');
});
