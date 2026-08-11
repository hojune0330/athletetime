const assert = require('node:assert/strict');
const test = require('node:test');

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
