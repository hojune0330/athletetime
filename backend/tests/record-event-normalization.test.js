const assert = require('node:assert/strict');
const test = require('node:test');

require('./test-cleanup-boundary.test');

const { normalizeEvent } = require('../../card-studio/services/recordAnalyticsService');

test('Given vault and high-jump labels When public events are normalized Then their distinct event keys and labels are preserved', () => {
  const poleVault = normalizeEvent('남자 장대높이뛰기 결승', '남자 일반부');
  const combinedPoleVault = normalizeEvent('남자 장대높이뛰기(10종) 결승', '남자 일반부');
  const highJump = normalizeEvent('남자 높이뛰기 결승', '남자 일반부');

  assert.deepEqual(
    [poleVault, combinedPoleVault, highJump].map(({ eventKey, eventLabel, direction }) => ({ eventKey, eventLabel, direction })),
    [
      { eventKey: 'pole-vault', eventLabel: '장대높이뛰기', direction: 'higher' },
      { eventKey: 'pole-vault-combined', eventLabel: '장대높이뛰기', direction: 'higher' },
      { eventKey: 'high-jump', eventLabel: '높이뛰기', direction: 'higher' },
    ],
  );
});
