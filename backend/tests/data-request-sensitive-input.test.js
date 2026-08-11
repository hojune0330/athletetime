const assert = require('node:assert/strict');
const test = require('node:test');

require('./anonymous-insights-boundary.test');
require('./public-search-cache-contract.test');

const { validateRequest } = require('../../card-studio/services/dataRequestValidation');

function validateReason(reason) {
  return validateRequest({
    type: 'correction',
    athleteName: '테스트 선수',
    reason,
  }, () => 'record-key');
}

test('DATA-RIGHTS-REASON-001 Given a reason with a resident registration number When validating Then it is rejected before storage', () => {
  const result = validateReason('주민등록번호는 900101-1234567 입니다.');

  assert.deepEqual(result, {
    ok: false,
    error: '요청 사유에는 주민등록번호·전화번호·이메일을 적을 수 없습니다. 해당 내용은 지우고 다시 접수해 주세요.',
  });
});

test('DATA-RIGHTS-REASON-002 Given a reason with a phone number or email When validating Then it is rejected without returning the input', () => {
  for (const reason of ['010-1234-5678로 연락해 주세요.', 'guardian@example.com으로 회신해 주세요.']) {
    const result = validateReason(reason);

    assert.equal(result.ok, false);
    assert.equal(result.error.includes(reason), false);
  }
});

test('DATA-RIGHTS-REASON-003 Given a normal correction explanation When validating Then it remains accepted', () => {
  const result = validateReason('2024년 대회 소속 표기가 현재와 달라 정정을 요청합니다.');

  assert.equal(result.ok, true);
  assert.equal(result.request.reason, '2024년 대회 소속 표기가 현재와 달라 정정을 요청합니다.');
});

test('DATA-RIGHTS-PUBLIC-IDENTIFIER-001 Given a public request carrying an internal record or source identifier When validating Then it is rejected without echoing the identifier', () => {
  const { validatePublicRequest } = require('../../card-studio/services/dataRequestValidation');
  const maliciousIdentifier = 'SRC-INTERNAL-ONLY';

  const result = validatePublicRequest({
    type: 'deletion',
    athleteName: '테스트 선수',
    affiliation: '테스트고',
    competition: '테스트 대회',
    event: '100m',
    sourceId: maliciousIdentifier,
    recordKey: 'rk_attacker_supplied',
    reason: '공개 식별자 주입을 시도합니다.',
  }, () => 'rk_derived');

  assert.equal(result.ok, false);
  assert.equal(result.error.includes(maliciousIdentifier), false);
  assert.equal(result.error.includes('rk_attacker_supplied'), false);
});

test('DATA-RIGHTS-PUBLIC-IDENTIFIER-002 Given a public request with only visible context When submitting Then it derives its scope and stores no supplied source identifier', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  const { MemoryDataRightsRepository } = require('../../card-studio/repositories/memoryDataRightsRepository');
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  const repository = new MemoryDataRightsRepository();

  try {
    await service.initialize({ repository });
    const receipt = await service.submitPublicRequest({
      type: 'deletion',
      athleteName: '테스트 선수',
      affiliation: '테스트고',
      competition: '테스트 대회',
      event: '100m',
      reason: '공개 문맥만으로 정정을 요청합니다.',
    });

    assert.equal(receipt.ok, true);
    const [stored] = repository.requests;
    assert.equal(stored.sourceId, '');
    assert.match(stored.recordKey, /^rk_[a-f0-9]{64}$/u);
  } finally {
    await service.shutdown();
    delete require.cache[require.resolve(servicePath)];
  }
});
