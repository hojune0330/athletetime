/**
 * privacyGuardLogger 단위 테스트 (P0-F5).
 *
 * 위협:
 *   routes/posts.js에서 console.log(req.body)로 PII가 새어나감.
 *
 * 검증:
 *   - 운영 모드에서 PII 키 (password, email 등) 가 마스킹되어 출력됨
 *   - dev 모드에서는 그대로 출력됨 (디버깅 우선)
 *   - Error 객체는 그대로
 *   - 키가 PII 패턴이 아니면 그대로
 */

const test = require('node:test');
const assert = require('node:assert');

const mod = require('../utils/privacyGuardLogger');
const { redactObject, maskString } = mod;

function captureLog(fn) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const captured = [];
  console.log = (...args) => captured.push(['log', ...args]);
  console.warn = (...args) => captured.push(['warn', ...args]);
  console.error = (...args) => captured.push(['error', ...args]);
  try { fn(); } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  return captured;
}

test('maskString: 4자 이하 마스킹', () => {
  assert.strictEqual(maskString(''), '');
  assert.strictEqual(maskString('a'), '*');
  assert.strictEqual(maskString('ab'), '**');
  assert.strictEqual(maskString('abc'), '***');
  assert.strictEqual(maskString('abcd'), '****');
  // 정책: 앞 2글자 + (value.length-4) 개 * + 뒤 2글자 — 길이 11이면 7개 *
  assert.strictEqual(maskString('hojune_real'), 'ho' + '*'.repeat(7) + 'al');
  assert.strictEqual(maskString('hello world'), 'he' + '*'.repeat(7) + 'ld');
});

test('redactObject: 운영 모드는 PII 키 자동 마스킹', () => {
  const req = {
    title: 'hello',
    content: 'public',
    password: 'Secret123!',
    email: 'foo@bar.com',
    author: 'some',
    instagram: '@real',
  };
  const out = redactObject(req);
  assert.strictEqual(out.title, 'hello', 'title untouched');
  assert.strictEqual(out.content, 'public');
  assert.notStrictEqual(out.password, 'Secret123!', 'password masked');
  assert.ok(out.password.includes('*'));
  assert.notStrictEqual(out.email, 'foo@bar.com', 'email masked');
  assert.notStrictEqual(out.instagram, '@real', 'instagram masked');
});

test('redactObject: 키 패턴이 대소문자 무시', () => {
  const req = {
    PASSWORD: 'Secret123!',
    EMAIL: 'foo@bar.com',
    JwtToken: 'abc.def.ghi',
    AnonymousId: 'anon_x',
  };
  const out = redactObject(req);
  assert.ok(out.PASSWORD.includes('*'));
  assert.ok(out.EMAIL.includes('*'));
  assert.ok(out.JwtToken.includes('*'));
  assert.ok(out.AnonymousId.includes('*'));
});

test('redactObject: 중첩 객체도 재귀 마스킹', () => {
  const req = {
    outer: {
      inner: {
        password: 'a',
        safe: 'visible',
      },
    },
  };
  const out = redactObject(req);
  assert.ok(out.outer.inner.password.includes('*'));
  assert.strictEqual(out.outer.inner.safe, 'visible');
});

test('redactObject: 배열 안 객체도 마스킹', () => {
  const req = [{ email: 'foo@bar', name: 'safe' }];
  const out = redactObject(req);
  assert.ok(out[0].email.includes('*'));
  assert.strictEqual(out[0].name, 'safe');
});

test('redactObject: 비-PII 키는 그대로', () => {
  const req = { foo: 'bar', count: 3, tags: ['a', 'b'] };
  const out = redactObject(req);
  assert.deepStrictEqual(out, req);
});

test('logger.debug: 운영 mode에서 PII 마스킹', () => {
  mod.__forceProductionForTests(true);
  const captured = captureLog(() => {
    mod.logger.debug('게시글 작성', {
      title: 'ok',
      password: 'Secret123!',
      email: 'foo@bar.com',
    });
  });
  mod.__forceProductionForTests(false);

  assert.strictEqual(captured.length, 1);
  // level prefix [debug] + 첫 인자 ('게시글 작성') + object
  const logged = JSON.stringify(captured[0]);
  assert.match(logged, /\[debug\]/);
  assert.ok(!/Secret123/.test(logged), 'raw password must not appear in stdout');
  assert.ok(!/foo@bar\.com/.test(logged), 'raw email must not appear');
});

test('logger.debug: dev mode에서는 그대로 출력', () => {
  mod.__forceProductionForTests(false);
  const captured = captureLog(() => {
    mod.logger.debug('dev mode', { password: 'Secret123!' });
  });
  const logged = JSON.stringify(captured[0]);
  assert.ok(/Secret123/.test(logged), 'dev mode keeps raw');
});

test('logger.error: Error 객체는 그대로 통과', () => {
  mod.__forceProductionForTests(true);
  const captured = captureLog(() => {
    const err = new Error('boom');
    err.code = 'E_TEST';
    mod.logger.error('fatal:', err);
  });
  mod.__forceProductionForTests(false);
  // captured는 원본 Error를 들고 있어야 함(JSON.stringify에도 message/code 살도록)
  const errArg = captured[0][3];
  assert.ok(errArg instanceof Error, 'should pass Error as-is in production');
  assert.strictEqual(errArg.message, 'boom');
  assert.strictEqual(errArg.code, 'E_TEST');
});

test('isProduction을 노드 환경에서 노출', () => {
  assert.strictEqual(typeof mod.isProduction(), 'boolean');
});
