const assert = require('node:assert/strict');
const test = require('node:test');

const anonymousInsightsService = require('../../card-studio/services/anonymousInsightsService');

test('ANONYMOUS-INSIGHTS-BOUNDARY-001: public insight callers cannot lower the minimum aggregate cohort', () => {
  const requestedCohortOfOne = anonymousInsightsService.getAnonymousInsights({
    minGroupSize: 1,
    limit: 24,
  });
  const requestedCohortOfTwo = anonymousInsightsService.getAnonymousInsights({
    minGroupSize: 2,
    limit: 24,
  });
  const stricterRequest = anonymousInsightsService.getAnonymousInsights({
    minGroupSize: 8,
    limit: 24,
  });

  assert.equal(requestedCohortOfOne.privacy.minGroupSize, 5);
  assert.equal(requestedCohortOfTwo.privacy.minGroupSize, 5);
  assert.equal(stricterRequest.privacy.minGroupSize, 8);

  for (const response of [requestedCohortOfOne, requestedCohortOfTwo]) {
    assert.ok(response.eventConcentration.every((item) => item.recordCount >= 5));
    assert.ok(response.regionActivity.every((item) => item.recordCount >= 5));
    assert.ok(response.seasonPulse.buckets.every((item) => item.recordCount >= 5));
  }
});
