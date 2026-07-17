const assert = require('node:assert/strict');
const test = require('node:test');

const sourcePolicy = require('../../card-studio/services/editorialSourceUrlPolicy');

test('EDITORIAL-SOURCE-SEC-001: private and reserved IP literals are rejected', () => {
  const blocked = [
    'https://[::ffff:127.0.0.1]/result',
    'https://[::ffff:10.0.0.1]/result',
    'https://[::ffff:169.254.169.254]/result',
    'https://[::127.0.0.1]/result',
    'https://[::192.168.1.1]/result',
    'https://[2001:2::1]/result',
    'https://[2001:db8::1]/result',
    'https://[fec0::1]/result',
    'https://[ff00::1]/result',
    'https://192.88.99.1/result',
  ];

  for (const url of blocked) {
    assert.throws(() => sourcePolicy.assertSafeSourceUrl(url), /sourceUrl/u, url);
  }
});

test('EDITORIAL-SOURCE-SEC-002: hostnames resolving to private addresses are rejected', async () => {
  assert.equal(typeof sourcePolicy.assertResolvableSourceUrl, 'function');
  const privateResolver = async () => [{ address: '169.254.169.254', family: 4 }];

  await assert.rejects(
    sourcePolicy.assertResolvableSourceUrl('https://metadata.example/result', privateResolver),
    /sourceUrl/u,
  );
  const compatibleResolver = async () => [{ address: '::c0a8:101', family: 6 }];
  await assert.rejects(
    sourcePolicy.assertResolvableSourceUrl('https://compatible.example/result', compatibleResolver),
    /sourceUrl/u,
  );
});

test('EDITORIAL-SOURCE-SEC-003: validation never performs an HTTP fetch', async () => {
  let resolutions = 0;
  const publicResolver = async () => {
    resolutions += 1;
    return [{ address: '93.184.216.34', family: 4 }];
  };

  const normalized = await sourcePolicy.assertResolvableSourceUrl(
    'https://example.com/results.pdf',
    publicResolver,
  );
  assert.equal(normalized, 'https://example.com/results.pdf');
  assert.equal(resolutions, 1);
});
