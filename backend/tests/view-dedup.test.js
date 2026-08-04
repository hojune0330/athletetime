/**
 * 조회수 dedup 단위 테스트 (P0-F1).
 *
 * 위협:
 *   동일 클라이언트가 짧은 시간 안에 GET /api/posts/:id 를 폭주시키면 views 가
 *   무한히 증가. = 인기 게시물 즉시 등극, 사용자 신뢰 손상.
 *
 * 검증:
 *   - 같은 (sessionId, ip, ua) 조합으로 TTL 안 두번째 호출은 skip
 *   - 다른 IP면 카운트 인정
 *   - TTL 지나면 카운트 인정
 */

const test = require('node:test');
const assert = require('node:assert');
const { createViewDedup } = require('../utils/viewDedup');

function fakeReq({ ip = '1.1.1.1', ua = 'ua', session = '', cookieKey = 'athletetime_anon' } = {}) {
  const req = {
    ip,
    headers: { 'user-agent': ua },
    get: (k) => (k.toLowerCase() === 'user-agent' ? ua : undefined),
    cookies: { [cookieKey]: session },
  };
  return req;
}

test('같은 세션/IP/UA 조합의 첫 호출은 허용', () => {
  const d = createViewDedup({ ttlMs: 1000 });
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), true);
  assert.strictEqual(d._size(), 1);
});

test('같은 세션/IP/UA 안 두번째 호출은 차단', () => {
  const d = createViewDedup({ ttlMs: 1000 });
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), true);
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), false);
});

test('다른 IP는 별개 키로 카운트 인정', () => {
  const d = createViewDedup({ ttlMs: 1000 });
  assert.strictEqual(d.shouldIncrement(fakeReq({ ip: '1.1.1.1' }), 'post-1'), true);
  assert.strictEqual(d.shouldIncrement(fakeReq({ ip: '2.2.2.2' }), 'post-1'), true);
});

test('다른 게시물은 별개 키', () => {
  const d = createViewDedup({ ttlMs: 1000 });
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), true);
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-2'), true);
});

test('TTL 지나면 다시 카운트 인정', () => {
  let now = 1_000_000;
  const d = createViewDedup({ ttlMs: 100, now: () => now });
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), true);
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), false);
  now += 200;
  assert.strictEqual(d.shouldIncrement(fakeReq(), 'post-1'), true, 'after TTL fallback');
});

test('maxEntries 초과 시 자동 트리밍되어 메모리 폭주 방지', () => {
  const d = createViewDedup({ ttlMs: 60_000, maxEntries: 10 });
  for (let i = 0; i < 100; i += 1) {
    d.shouldIncrement(fakeReq({ ip: `ip-${i}`, ua: 'ua' }), `post-${i}`);
  }
  assert.ok(d._size() <= 100, 'size reasonable');
});

test('다른 익명 세션(쿠키) 는 별개 키', () => {
  const d = createViewDedup({ ttlMs: 1000 });
  assert.strictEqual(d.shouldIncrement(fakeReq({ session: 'A' }), 'post-1'), true);
  assert.strictEqual(d.shouldIncrement(fakeReq({ session: 'A' }), 'post-1'), false);
  assert.strictEqual(d.shouldIncrement(fakeReq({ session: 'B' }), 'post-1'), true);
});

test('IP가 없거나 unknown이면 동일 키로 묶이되 폭주 차단', () => {
  const d = createViewDedup({ ttlMs: 1000 });
  // ip, ua 모두 동일 fallback으로 들어와도 두번째는 거부
  assert.strictEqual(d.shouldIncrement(fakeReq({ ip: '' }), 'post-1'), true);
  assert.strictEqual(d.shouldIncrement(fakeReq({ ip: '' }), 'post-1'), false);
});
