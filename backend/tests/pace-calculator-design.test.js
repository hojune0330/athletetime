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

test('PACE-DS-003: pace page copy is direct and not a training-plan duplicate', () => {
  const index = readSource(`${PACE_DIR}/index.tsx`);

  assert.match(index, /페이스 계산기/);
  assert.match(index, /목표 기록으로 km·400m·100m 페이스를 바로 확인해요/);
  assert.doesNotMatch(index, /훈련 계획 도구/);
  assert.doesNotMatch(index, /페이스 계산기 & 차트/);
});
