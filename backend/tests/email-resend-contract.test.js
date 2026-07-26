const assert = require('node:assert/strict');
const test = require('node:test');

const resendModule = require('resend');
const dependencyManifest = require('../../package.json');
const emailUtilityPath = require.resolve('../utils/email');

function restoreEnvironment(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function loadEmailUtility({ apiKey = 're_test_key', sendResult }) {
  const originalResend = resendModule.Resend;
  const originalApiKey = process.env.RESEND_API_KEY;
  const sentMessages = [];

  class FakeResend {
    constructor(receivedApiKey) {
      assert.equal(receivedApiKey, apiKey);
      this.emails = {
        send: async (message) => {
          sentMessages.push(message);
          return sendResult;
        },
      };
    }
  }

  resendModule.Resend = FakeResend;
  if (apiKey) {
    process.env.RESEND_API_KEY = apiKey;
  } else {
    delete process.env.RESEND_API_KEY;
  }
  delete require.cache[emailUtilityPath];

  return {
    email: require('../utils/email'),
    sentMessages,
    restore() {
      delete require.cache[emailUtilityPath];
      resendModule.Resend = originalResend;
      restoreEnvironment('RESEND_API_KEY', originalApiKey);
    },
  };
}

test('Resend uses the supported v6 dependency line', () => {
  assert.equal(dependencyManifest.dependencies.resend, '^6.18.0');
});

test('verification email returns the v6 data.id and sends the expected message', async () => {
  const harness = loadEmailUtility({
    sendResult: { data: { id: 'email_123' }, error: null },
  });

  try {
    const result = await harness.email.sendVerificationEmail('runner@example.test', '123456', 'Runner');

    assert.deepEqual(result, { success: true, messageId: 'email_123' });
    assert.equal(harness.sentMessages.length, 1);
    assert.equal(harness.sentMessages[0].to, 'runner@example.test');
    assert.equal(harness.sentMessages[0].subject, '[애슬리트 타임] 이메일 인증 코드: 123456');
  } finally {
    harness.restore();
  }
});

test('provider error responses are not reported as successful email delivery', async () => {
  const harness = loadEmailUtility({
    sendResult: { data: null, error: { message: 'provider rejected request' } },
  });

  try {
    await assert.rejects(
      harness.email.sendResetPasswordCodeEmail('runner@example.test', '123456', 'Runner'),
      /이메일 발송에 실패했습니다/
    );
  } finally {
    harness.restore();
  }
});

test('missing API configuration keeps email disabled without creating a client', async () => {
  const harness = loadEmailUtility({
    apiKey: '',
    sendResult: { data: { id: 'must-not-send' }, error: null },
  });

  try {
    const result = await harness.email.sendVerificationEmail('runner@example.test', '123456', 'Runner');

    assert.deepEqual(result, { success: false, error: 'Email service not configured' });
    assert.deepEqual(harness.sentMessages, []);
  } finally {
    harness.restore();
  }
});
