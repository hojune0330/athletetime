const { QUERY_PROFILE_VERSION, QUERY_PROFILES } = require('./editorialNewsQueryProfile');
const { classifyEditorialNewsRelevance, normalizeNaverNewsItem } = require('./editorialNewsNormalizer');
const { assertResolvableSourceUrl } = require('./editorialSourceUrlPolicy');

const SAFE_PROVIDER_ERROR_CODES = new Map([
  ['COLLECTOR_DISABLED', 'disabled'],
  ['CREDENTIALS_MISSING', 'credentials_missing'],
  ['QUOTA_EXCEEDED', 'quota_exceeded'],
  ['HTTP_401', 'credentials_rejected'],
  ['HTTP_403', 'credentials_rejected'],
  ['HTTP_429', 'provider_quota'],
]);
const MINOR_TITLE_PATTERN = /(?:유소년|초등(?:학생|학교|부)?|중등부|중학생|중학교|고등부|고등학생|고등학교|U\s?-?(?:18|20))/iu;

function assertActor(actorUserId) {
  if (typeof actorUserId !== 'string' || !/^[0-9a-f-]{36}$/iu.test(actorUserId)) throw new TypeError('actorUserId is required');
}

function kstDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function safeProviderErrorCode(error) {
  return SAFE_PROVIDER_ERROR_CODES.get(error?.code) || 'partial_failure';
}

function subjectAgeGroup(title) {
  return MINOR_TITLE_PATTERN.test(title) ? 'minor' : 'unknown';
}

function callLimit(value, maximum, name) {
  if (value === undefined || value === '') return maximum;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) throw new TypeError(`${name} is invalid`);
  return parsed;
}

class EditorialNewsDiscoveryService {
  constructor({ repository, provider, profiles = Object.keys(QUERY_PROFILES), now = () => new Date(), resolveHostname, env = process.env } = {}) {
    if (!repository || !provider) throw new TypeError('news discovery repository and provider are required');
    this.repository = repository; this.provider = provider; this.profiles = profiles; this.now = now; this.resolveHostname = resolveHostname;
    this.dailyCallLimit = callLimit(env.NAVER_NEWS_DAILY_CALL_LIMIT, 40, 'NAVER_NEWS_DAILY_CALL_LIMIT');
    this.monthlyCallLimit = callLimit(env.NAVER_NEWS_MONTHLY_CALL_LIMIT, 800, 'NAVER_NEWS_MONTHLY_CALL_LIMIT');
  }

  async runManual({ actorUserId, runDateKst = kstDate(this.now()) }) {
    assertActor(actorUserId);
    return this.repository.withRunLock({ actorUserId, runDateKst, profileVersion: QUERY_PROFILE_VERSION }, async (locked) => {
      if (locked.existing) return locked.existing;
      const counts = { apiCallCount: Number(locked.apiCallCount) || 0, resultCount: 0, insertedCount: 0, duplicateCount: 0, irrelevantCount: 0 };
      let successfulProfiles = 0;
      const failureCodes = new Set();
      let storageFailed = false;
      for (const profile of this.profiles) {
        let response;
        try {
          response = await this.provider.search({
            profile,
            reserveCall: () => this.repository.reserveProviderCall(locked.client, {
              runId: locked.id,
              runDateKst,
              dailyLimit: this.dailyCallLimit,
              monthlyLimit: this.monthlyCallLimit,
            }),
          });
        } catch (error) {
          counts.apiCallCount += Number.isInteger(error?.apiCallCount) && error.apiCallCount >= 0
            ? error.apiCallCount : 1;
          failureCodes.add(safeProviderErrorCode(error));
          continue;
        }
        successfulProfiles += 1;
        counts.apiCallCount += Number.isInteger(response.apiCallCount) && response.apiCallCount > 0
          ? response.apiCallCount : 1;
        for (const raw of response.items) {
          counts.resultCount += 1;
          let item;
          let relevance;
          try {
            item = normalizeNaverNewsItem(raw);
            relevance = classifyEditorialNewsRelevance([profile], item.title);
          } catch {
            counts.irrelevantCount += 1;
            continue;
          }
          if (relevance.relevanceScore === 0) {
            counts.irrelevantCount += 1;
            continue;
          }
          try {
            const saved = await this.repository.upsertDiscovery(locked.client, {
              ...item,
              ...relevance,
              queryKeys: [profile],
              runId: locked.id,
              subjectAgeGroup: subjectAgeGroup(item.title),
            });
            if (saved.inserted) counts.insertedCount += 1; else counts.duplicateCount += 1;
          } catch {
            failureCodes.add('storage_failure');
            storageFailed = true;
            break;
          }
        }
        if (storageFailed) break;
      }
      const failed = failureCodes.size > 0;
      const uniformFailure = successfulProfiles === 0 && failureCodes.size === 1;
      return this.repository.finishRun(locked.client, {
        id: locked.id,
        ...counts,
        status: failed ? 'failed' : 'completed',
        safeErrorCode: failed
          ? (failureCodes.has('storage_failure') ? 'storage_failure' : uniformFailure ? [...failureCodes][0] : 'partial_failure')
          : null,
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
