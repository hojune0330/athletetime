const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const CALCULATOR = 'frontend/src/pages/TrainingCalculatorPage';

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('TRAINING-SAFETY-001: calculator separates unsaved inputs from the local-only training log', () => {
  const page = readSource(`${CALCULATOR}/index.tsx`);
  const log = readSource(`${CALCULATOR}/components/TrainingLogLite.tsx`);

  assert.match(page, /계산에 넣은 값은 저장되지 않아요/);
  assert.match(page, /훈련 일지는 직접 기록할 때만 이 기기에 저장돼요/);
  assert.match(log, /서버나 분석 기능으로 보내지 않아요/);
  assert.doesNotMatch(log, /앞으로 나올|이어질 준비 과정|내 몸에 맞는 분석/);
});

test('TRAINING-SAFETY-002: calculator does not collect health conditions or generate medical guidance', () => {
  const page = readSource(`${CALCULATOR}/index.tsx`);
  const conditions = readSource(`${CALCULATOR}/utils/adjustments.ts`);
  const plans = readSource(`${CALCULATOR}/utils/trainingPlans.ts`);
  const recommendations = readSource(`${CALCULATOR}/components/RecommendationsView.tsx`);

  assert.match(page, /계산 결과는 의료 조언이 아니에요/);
  assert.match(recommendations, /의료·재활 전문가와 상담하세요/);
  assert.doesNotMatch(conditions, /injuryRecovery|highFatigue|weightLoss|morningOnly/);
  assert.doesNotMatch(plans, /Pain Scale|아이싱|압박|항염증|탄수화물|전해질|페리틴|골밀도|건강검진|부상 회복/);
  assert.doesNotMatch(recommendations, /Pain Scale|아이싱|압박|영양 섭취|권장사항/);
});
test('TRAINING-SAFETY-003: calculator rejects invalid clock values and clears a stale plan when an input changes', () => {
  const hook = readSource(`${CALCULATOR}/hooks/useTrainingCalculator.ts`);
  const page = readSource(`${CALCULATOR}/index.tsx`);

  assert.match(hook, /time\.minutes < 60/, 'minutes remain within a clock range');
  assert.match(hook, /time\.seconds < 60/, 'seconds remain within a clock range');
  assert.match(hook, /Number\.isFinite\(Number\(distance\)\)/, 'distance remains finite at the calculation boundary');
  assert.match(hook, /분과 초는 0~59 범위예요/, 'invalid clock input gives a concrete correction');
  assert.match(hook, /const updateDistance = useCallback/, 'distance changes clear the active calculation');
  assert.match(hook, /setResults\(null\)/, 'input changes do not leave a prior plan visible');
  assert.match(page, /onDistanceChange=\{updateDistance\}/, 'the page uses the result-clearing distance action');
});
