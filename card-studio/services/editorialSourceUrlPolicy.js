const dns = require('node:dns').promises;
const net = require('node:net');

const blockedIpv4 = new net.BlockList();
const blockedIpv6 = new net.BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.31.196.0', 24], ['192.52.193.0', 24], ['192.88.99.0', 24],
  ['192.168.0.0', 16], ['192.175.48.0', 24], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blockedIpv4.addSubnet(network, prefix, 'ipv4');

for (const [network, prefix] of [
  ['::', 96], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['100:0:0:1::', 64], ['2001::', 23], ['2001:db8::', 32],
  ['2002::', 16], ['2620:4f:8000::', 48], ['3fff::', 20], ['5f00::', 16],
  ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
]) blockedIpv6.addSubnet(network, prefix, 'ipv6');

function normalizedHostname(hostname) {
  return hostname.replace(/^\[|\]$/gu, '').toLowerCase();
}

function assertPublicAddress(address) {
  const normalized = normalizedHostname(address);
  const family = net.isIP(normalized);
  const blocked = family === 4
    ? blockedIpv4.check(normalized, 'ipv4')
    : family === 6 && blockedIpv6.check(normalized, 'ipv6');
  if (!family || blocked) {
    throw new TypeError('sourceUrl host is not allowed');
  }
}

function assertSafeSourceUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError('sourceUrl must be a valid HTTPS URL');
  }
  if (parsed.protocol !== 'https:') throw new TypeError('sourceUrl must use HTTPS');
  if (parsed.username || parsed.password) throw new TypeError('sourceUrl must not contain credentials');
  const hostname = normalizedHostname(parsed.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new TypeError('sourceUrl host is not allowed');
  }
  if (net.isIP(hostname)) assertPublicAddress(hostname);
  return parsed.toString();
}

async function defaultResolver(hostname) {
  let timer;
  try {
    return await Promise.race([
      dns.lookup(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('DNS timeout')), 2000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function assertResolvableSourceUrl(value, resolver = defaultResolver) {
  const normalized = assertSafeSourceUrl(value);
  const hostname = normalizedHostname(new URL(normalized).hostname);
  if (net.isIP(hostname)) return normalized;
  let addresses;
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new TypeError('sourceUrl host could not be safely resolved');
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new TypeError('sourceUrl host could not be safely resolved');
  }
  for (const entry of addresses) assertPublicAddress(entry.address);
  return normalized;
}

module.exports = { assertResolvableSourceUrl, assertSafeSourceUrl };
