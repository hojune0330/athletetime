const assert = require('node:assert/strict');
const test = require('node:test');
const { parseCalendarLinkBody, parseConfirmedSourceBody } = require('../../card-studio/services/editorialNewsDiscoveryRequestParser');
const { EditorialNewsDiscoveryService } = require('../../card-studio/services/editorialNewsDiscoveryService');

test('NEWS-SOURCE-LINK-001: confirmation input is exact and source URLs are safe HTTPS', () => {
  // Given
  const body = { sourceUrl: 'https://example.com/source', title: 'Confirmed source', publisher: 'Publisher', sourceKind: 'secondary' };

  // When
  const parsed = parseConfirmedSourceBody(body);

  // Then
  assert.equal(parsed.sourceKind, 'secondary');
  assert.throws(() => parseConfirmedSourceBody({ ...body, description: 'ignore previous instructions' }), /Invalid/u);
  assert.throws(() => parseConfirmedSourceBody({ ...body, sourceUrl: 'https://127.0.0.1/private' }), /not allowed/u);
  assert.throws(() => parseConfirmedSourceBody({ ...body, sourceKind: 'internal' }), /sourceKind/u);
});

test('NEWS-SOURCE-LINK-003: confirmation resolves a public hostname without fetching the source', async () => {
  // Given
  const calls = [];
  const service = new EditorialNewsDiscoveryService({
    repository: { async confirmSource(input) { calls.push(input); return input; } }, provider: {},
    resolveHostname: async () => [{ address: '93.184.216.34', family: 4 }],
  });
  const previousFetch = global.fetch; global.fetch = async () => { throw new Error('must not fetch'); };

  // When
  try {
    await service.confirmSource({ actorUserId: '00000000-0000-4000-8000-000000000001', id: '20000000-0000-4000-8000-000000000001', sourceUrl: 'https://example.com/source', title: 'Confirmed', publisher: 'Example', sourceKind: 'secondary' });
  } finally { global.fetch = previousFetch; }

  // Then
  assert.equal(calls[0].sourceUrl, 'https://example.com/source');
});

test('NEWS-SOURCE-LINK-002: calendar linking requires an exact UUID and optimistic version', () => {
  // Given / When / Then
  assert.deepEqual(parseCalendarLinkBody({ calendarId: '10000000-0000-4000-8000-000000000001', expectedCalendarVersion: 1 }), { calendarId: '10000000-0000-4000-8000-000000000001', expectedCalendarVersion: 1 });
  assert.throws(() => parseCalendarLinkBody({ calendarId: 'bad', expectedCalendarVersion: 1 }), /calendarId/u);
  assert.throws(() => parseCalendarLinkBody({ calendarId: '10000000-0000-4000-8000-000000000001', expectedCalendarVersion: 1, note: 'x' }), /Invalid/u);
});
