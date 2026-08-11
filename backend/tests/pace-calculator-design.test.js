const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const PACE_DIR = 'frontend/src/pages/PaceCalculatorPage';
const DEFAULT_SURFACE_FILES = [
  `${PACE_DIR}/index.tsx`,
  `${PACE_DIR}/components/TargetPaceInputs.tsx`,
  `${PACE_DIR}/components/TargetPaceResult.tsx`,
];

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readTargetPaceSurface() {
  return [
    `${PACE_DIR}/components/TargetPaceCalculator.tsx`,
    `${PACE_DIR}/components/TargetPaceInputs.tsx`,
    `${PACE_DIR}/components/TargetPaceResult.tsx`,
  ].map(readSource).join('\n');
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

test('PACE-UX-012: calculator surface does not depend on unavailable external fonts', () => {
  const document = readSource('frontend/index.html');

  assert.doesNotMatch(document, /fonts\.googleapis\.com|fonts\.gstatic\.com/, 'calculator loading must not depend on an external font request');
});

test('PACE-DS-002: target pace result uses TRAINORACLE numeric primitives', () => {
  const target = readTargetPaceSurface();

  assert.match(target, /MetricCell/, 'target pace results use MetricCell strip');
  assert.match(target, /PACE OUTPUT/, 'result section has a mono technical label');
  assert.match(target, /font-mono/, 'numeric inputs and labels use mono');
  assert.match(target, /tabular-nums/, 'numeric values use tabular figures');
});

test('PACE-SC-001: track events 800m/1500m/3000mSC with water-jump placement are supported', () => {
  const target = readTargetPaceSurface();
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
  const target = readTargetPaceSurface();

  assert.match(index, /페이스 계산기/);
  assert.match(index, /목표 기록으로 페이스를 바로 확인해요/);
  assert.doesNotMatch(index, /훈련 계획 도구/);
  assert.doesNotMatch(index, /페이스 계산기 & 차트/);
  assert.match(target, /페이스 계산하기/);
  assert.doesNotMatch(target, /Calculate pace/);
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

test('PACE-UX-005: invalid custom input stays in-page and cannot reuse a prior distance', () => {
  const target = readTargetPaceSurface();

  // Given a runner clears a custom distance after selecting another distance.
  // When they ask to calculate a pace.
  // Then the page keeps feedback in context and rejects the stale distance.
  assert.match(target, /role="alert"/, 'invalid input is announced inside the calculator');
  assert.doesNotMatch(target, /\balert\(/, 'browser alerts do not block the calculator');
  assert.match(target, /setDistance\(0\)/, 'an empty custom distance clears the prior selected distance');
  assert.match(target, /aria-label="직접 거리 \(km\)"/, 'the custom-distance field has an accessible label');
  assert.match(target, /aria-label=\{label\}/, 'every time field exposes its label to assistive technology');
});

test('PACE-UX-006: split calculator rejects zero values before showing pace output', () => {
  const hook = readSource(`${PACE_DIR}/hooks/usePaceCalculator.ts`);
  const split = readSource(`${PACE_DIR}/components/SplitCalculator.tsx`);
  const splitInput = readSource(`${PACE_DIR}/components/SplitPlannerInput.tsx`);

  // Given a runner clears the target distance or finish time.
  // When the split screen recalculates its preview or result.
  // Then it cannot expose NaN or Infinity as a pace.
  assert.match(hook, /hasValidInput/, 'the split state has one explicit valid-input boundary');
  assert.match(hook, /if \(!hasValidInput\)/, 'invalid split inputs skip result generation');
  assert.match(split, /role="alert"/, 'the split screen explains invalid input in context');
  assert.match(splitInput, /aria-label="목표 거리 \(km\)"/, 'the split distance field has an accessible label');
  assert.match(splitInput, /aria-label=\{label\}/, 'the split time fields have accessible labels');
});

test('PACE-UX-007: track-event time input rejects impossible clock values in context', () => {
  const trackEvents = readSource(`${PACE_DIR}/components/TrackEventSplits.tsx`);

  // Given a runner clears a time field or enters 60 seconds.
  // When the track-event split calculator updates.
  // Then it keeps an in-page explanation and skips the invalid calculation.
  assert.match(trackEvents, /hasValidTargetTime/, 'track-event time has one explicit validity boundary');
  assert.match(trackEvents, /seconds < 60/, 'seconds must stay within a clock minute');
  assert.match(trackEvents, /role="alert"/, 'invalid time is announced inside the calculator');
  assert.match(trackEvents, /aria-label="목표 시간 \(분\)"/, 'minutes input has an accessible label');
  assert.match(trackEvents, /aria-label="목표 시간 \(초\)"/, 'seconds input has an accessible label');
  assert.match(trackEvents, /aria-pressed=\{event === option\.id\}/, 'the selected event is exposed to assistive technology');
});

test('PACE-UX-008: lane calculator rejects zero target time before lane math runs', () => {
  const hook = readSource(`${PACE_DIR}/hooks/usePaceCalculator.ts`);
  const lane = readSource(`${PACE_DIR}/components/TrackLaneCalculator.tsx`);

  assert.match(hook, /hasValidTargetTime/, 'lane time has an explicit validity boundary');
  assert.match(hook, /if \(!hasValidTargetTime\) return \[\]/, 'invalid lane time produces no lane data');
  assert.match(lane, /role="alert"/, 'invalid lane time receives an in-page explanation');
  assert.match(lane, /aria-label="400m 목표 시간 \(초\)"/, 'lane target-time input has an accessible label');
  assert.match(lane, /hasValidTargetTime && selectedLaneData/, 'the visual result area is gated by valid input and a computed lane');
});

test('PACE-DS-005: lane calculator keeps the current numeric-first calculator language', () => {
  const lane = readSource(`${PACE_DIR}/components/TrackLaneCalculator.tsx`);

  assert.match(lane, /TRACK LANE/, 'lane view has a compact technical label');
  assert.match(lane, /MetricCell/, 'lane output uses the shared numeric strip');
  assert.match(lane, /aria-pressed=\{selected\}/, 'lane selection exposes its state');
  assert.doesNotMatch(lane, /bg-gradient-to|linearGradient|font-awesome|fas /, 'legacy decorative effects are removed');
  assert.doesNotMatch(lane, /🏟️|🎯|🏃|🚀|⏱️|📏|📐|💡/, 'emoji decoration is removed');
});

test('PACE-UX-009: calculator tabs stay compact on mobile and identify their panels', () => {
  const index = readSource(`${PACE_DIR}/index.tsx`);

  assert.match(index, /hidden border border-line bg-surface p-4 md:block/, 'duplicate quick actions are hidden on small screens');
  assert.match(index, /grid grid-cols-5 border border-line bg-surface/, 'five calculator tabs stay in one mobile row');
  assert.match(index, /id=\{`tab-\$\{tab\.id\}`\}/, 'tab panel labels point to real tab ids');
});

test('PACE-UX-010: target pace rejects invalid clock values and clears stale output', () => {
  const target = readTargetPaceSurface();

  assert.match(target, /hasValidFinishTime/, 'target time has an explicit validity boundary');
  assert.match(target, /isOptionalClockValue\(minutes, 59\)/, 'target minutes stay within a clock hour');
  assert.match(target, /isOptionalClockValue\(seconds, 59\)/, 'target seconds stay within a clock minute');
  assert.match(target, /id="target-time-error" role="alert"/, 'invalid target time is announced in context');
  assert.match(target, /setResult\(null\)/, 'an invalid input cannot leave a stale pace result visible');
  assert.match(target, /aria-pressed=\{isSteeple\}/, 'distance mode selection exposes its current state');
});

test('PACE-UX-011: calculator tabs support compact keyboard navigation', () => {
  const index = readSource(`${PACE_DIR}/index.tsx`);

  assert.match(index, /event\.key === 'ArrowRight'/, 'right arrow advances the focused tab');
  assert.match(index, /event\.key === 'ArrowLeft'/, 'left arrow returns to the previous tab');
  assert.match(index, /event\.key === 'Home'/, 'Home moves to the first tab');
  assert.match(index, /event\.key === 'End'/, 'End moves to the last tab');
  assert.match(index, /tabIndex=\{activeTab === tab\.id \? 0 : -1\}/, 'only the active tab enters the tab order');
});

test('PACE-DS-006: chart surfaces keep the numeric-first visual language and in-page export feedback', () => {
  const downloads = readSource(`${PACE_DIR}/components/ChartDownloadButtons.tsx`);
  const paceChart = readSource(`${PACE_DIR}/components/PaceChartTable.tsx`);
  const targetChart = readSource(`${PACE_DIR}/components/TargetPaceTable.tsx`);

  assert.match(downloads, /role="alert"/, 'export failures stay in the page');
  assert.doesNotMatch(downloads, /\balert\(/, 'browser alerts do not interrupt export recovery');
  assert.doesNotMatch(downloads, /bg-gradient-to|font-awesome|fas /, 'export controls remove legacy decoration');
  assert.match(paceChart, /DISTANCE TABLE/, 'distance table has a compact technical label');
  assert.match(targetChart, /TARGET TABLE/, 'target table has a compact technical label');
  assert.doesNotMatch(`${paceChart}\n${targetChart}`, /제작:\s*박호준|font-awesome|fas /, 'charts remove old creator and icon decoration');
});
