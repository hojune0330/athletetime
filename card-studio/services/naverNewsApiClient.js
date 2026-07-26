const https = require('node:https');
const { EditorialNewsBudget } = require('./editorialNewsBudget');
const { resolveEditorialNewsQuery } = require('./editorialNewsQueryProfile');

const API_ENDPOINT = 'https://naverapihub.apigw.ntruss.com/search/v1/news';
const MAX_RESPONSE_BYTES = 1024 * 1024;

class NaverNewsApiError extends Error {
  constructor(code) {
    super(code);
    this.name = 'NaverNewsApiError';
    this.code = code;
  }
}

function withApiCallCount(error, apiCallCount) {
  const safeError = error instanceof NaverNewsApiError
    ? error
    : new NaverNewsApiError('TRANSPORT_FAILURE');
  safeError.apiCallCount = apiCallCount;
  return safeError;
}

function defaultTransport({ url, headers, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: 'GET', headers }, (response) => {
      const chunks = [];
      let length = 0;
      response.on('data', (chunk) => {
        length += chunk.length;
        if (length > MAX_RESPONSE_BYTES) {
          request.destroy();
          reject(new NaverNewsApiError('RESPONSE_TOO_LARGE'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.setTimeout(timeoutMs, () => request.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    request.on('error', reject);
    request.end();
  });
}

function parseResponse(body) {
  if (typeof body !== 'string') throw new NaverNewsApiError('MALFORMED_RESPONSE');
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) throw new NaverNewsApiError('RESPONSE_TOO_LARGE');
  let parsed;
  try { parsed = JSON.parse(body); } catch { throw new NaverNewsApiError('MALFORMED_RESPONSE'); }
  if (!parsed || !Number.isInteger(parsed.total) || !Number.isInteger(parsed.start) || !Number.isInteger(parsed.display) || !Array.isArray(parsed.items)) {
    throw new NaverNewsApiError('MALFORMED_RESPONSE');
  }
  const items = parsed.items.map((item) => {
    if (!item || ['title', 'link', 'pubDate'].some((key) => typeof item[key] !== 'string')) throw new NaverNewsApiError('MALFORMED_RESPONSE');
    return { title: item.title, originallink: typeof item.originallink === 'string' ? item.originallink : '', link: item.link, pubDate: item.pubDate };
  });
  return { total: parsed.total, start: parsed.start, display: parsed.display, items };
}

class NaverNewsApiClient {
  constructor({ env = process.env, transport = defaultTransport, budget = new EditorialNewsBudget(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), jitter = () => 0, timeoutMs = 5000 } = {}) {
    this.env = env;
    this.transport = transport;
    this.budget = budget;
    this.sleep = sleep;
    this.jitter = jitter;
    this.timeoutMs = timeoutMs;
  }

  async search({ profile, start = 1, reserveCall } = {}) {
    const requestProfile = resolveEditorialNewsQuery(profile, start);
    if (this.env.NAVER_NEWS_COLLECTOR_ENABLED !== 'true') {
      throw withApiCallCount(new NaverNewsApiError('COLLECTOR_DISABLED'), 0);
    }
    const keyId = this.env.NAVER_API_HUB_KEY_ID;
    const key = this.env.NAVER_API_HUB_KEY;
    if (typeof keyId !== 'string' || !keyId || typeof key !== 'string' || !key) {
      throw withApiCallCount(new NaverNewsApiError('CREDENTIALS_MISSING'), 0);
    }
    if (reserveCall !== undefined && typeof reserveCall !== 'function') {
      throw new TypeError('reserveCall must be a function');
    }
    const reserve = reserveCall || (() => this.budget.reserve());
    const url = new URL(API_ENDPOINT);
    url.search = new URLSearchParams({ query: requestProfile.query, sort: 'date', display: '100', start: String(requestProfile.start) }).toString();
    const request = { url: url.toString(), headers: { 'X-NCP-APIGW-API-KEY-ID': keyId, 'X-NCP-APIGW-API-KEY': key }, timeoutMs: this.timeoutMs };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await reserve();
      } catch (error) {
        error.apiCallCount = 0;
        throw error;
      }
      try {
        const response = await this.callWithTimeout(request);
        if (!response || !Number.isInteger(response.statusCode)) throw new NaverNewsApiError('MALFORMED_RESPONSE');
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return { ...parseResponse(response.body), apiCallCount: attempt + 1 };
        }
        const error = new NaverNewsApiError(`HTTP_${response.statusCode}`);
        if (response.statusCode < 500 || attempt === 1) throw error;
      } catch (error) {
        const retryable = error && (error.code === 'ETIMEDOUT' || error.code === 'TIMEOUT' || /^HTTP_5\d\d$/.test(error.code));
        if (!retryable || attempt === 1) throw withApiCallCount(error, attempt + 1);
      }
      await this.sleep(200 + this.jitter());
    }
    throw new NaverNewsApiError('TRANSPORT_FAILURE');
  }

  async callWithTimeout(request) {
    let timer;
    try {
      return await Promise.race([
        this.transport(request),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new NaverNewsApiError('TIMEOUT')), this.timeoutMs); }),
      ]);
    } finally { clearTimeout(timer); }
  }
}

module.exports = { API_ENDPOINT, MAX_RESPONSE_BYTES, NaverNewsApiClient, NaverNewsApiError, defaultTransport, parseResponse };
