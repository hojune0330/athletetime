const { QUERY_PROFILE_VERSION, QUERY_PROFILES } = require('./editorialNewsQueryProfile');
const { classifyEditorialNewsRelevance, normalizeNaverNewsItem } = require('./editorialNewsNormalizer');
const { assertResolvableSourceUrl } = require('./editorialSourceUrlPolicy');

const SAFE_PROVIDER_ERROR_CODES = new Map([
  ['CREDENTIALS_MISSING', 'credentials_missing'],
  ['QUOTA_EXCEEDED', 'quota_exceeded'],
  ['HTTP_401', 'credentials_rejected'],
  ['HTTP_403', 'credentials_rejected'],
  ['HTTP_429', 'provider_quota'],
]);

function assertActor(actorUserId) {
  if (typeof actorUserId !== 'string' || !/^[0-9a-f-]{36}$/iu.test(actorUserId)) throw new TypeError('actorUserId is required');
}

function kstDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function safeProviderErrorCode(error) {
  return SAFE_PROVIDER_ERROR_CODES.get(error?.code) || 'partial_failure';
}

class EditorialNewsDiscoveryService {
  constructor({ repository, provider, profiles = Object.keys(QUERY_PROFILES), now = () => new Date(), resolveHostname } = {}) {
    if (!repository || !provider) throw new TypeError('news discovery repository and provider are required');
    this.repository = repository; this.provider = provider; this.profiles = profiles; this.now = now; this.resolveHostname = resolveHostname;
  }

  async runManual({ actorUserId, runDateKst = kstDate(this.now()) }) {
    assertActor(actorUserId);
    return this.repository.withRunLock({ actorUserId, runDateKst, profileVersion: QUERY_PROFILE_VERSION }, async (locked) => {
      if (locked.existing) return locked.existing;
      const counts = { apiCallCount: 0, resultCount: 0, insertedCount: 0, duplicateCount: 0, irrelevantCount: 0 };
      let successfulProfiles = 0;
      const failureCodes = new Set();
      for (const profile of this.profiles) {
        try {
          const response = await this.provider.search({ profile });
          successfulProfiles += 1;
          counts.apiCallCount += Number.isInteger(response.apiCallCount) && response.apiCallCount > 0
            ? response.apiCallCount : 1;
          for (const raw of response.items) {
            counts.resultCount += 1;
            try {
              const item = normalizeNaverNewsItem(raw);
              const relevance = classifyEditorialNewsRelevance([profile], item.title);
              if (relevance.relevanceScore === 0) { counts.irrelevantCount += 1; continue; }
              const saved = await this.repository.upsertDiscovery(locked.client, { ...item, ...relevance, queryKeys: [profile], runId: locked.id });
              if (saved.inserted) counts.insertedCount += 1; else counts.duplicateCount += 1;
            } catch { counts.irrelevantCount += 1; }
          }
        } catch (error) {
          counts.apiCallCount += Number.isInteger(error?.apiCallCount) && error.apiCallCount >= 0
            ? error.apiCallCount : 1;
          failureCodes.add(safeProviderErrorCode(error));
        }
      }
      const failed = failureCodes.size > 0;
      const uniformFailure = successfulProfiles === 0 && failureCodes.size === 1;
      return this.repository.finishRun(locked.client, {
        id: locked.id,
        ...counts,
        status: failed ? 'failed' : 'completed',
        safeErrorCode: failed ? (uniformFailure ? [...failureCodes][0] : 'partial_failure') : null,
      });
    });
  }

  listRuns(query) { return this.repository.listRuns(query); }
  listDiscoveries(query) { return this.repository.listDiscoveries(query); }
  transitionDiscovery(input) { assertActor(input.actorUserId); return this.repository.transitionDiscovery(input); }
  async confirmSource(input) {
    assertActor(input.actorUserId);
    const sourceUrl = await assertResolvableSourceUrl(input.sourceUrl, this.resolveHostname);
    return this.repository.confirmSource({ ...input, sourceUrl });
  }
  linkCalendar(input) { assertActor(input.actorUserId); return this.repository.linkCalendar(input); }
  purgeExpired() { return this.repository.purgeExpired(); }
  purgeRuns() { return this.repository.purgeRuns(); }
}

module.exports = { EditorialNewsDiscoveryService, kstDate };
