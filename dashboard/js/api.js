/**
 * API 클라이언트
 * 서버 REST API와 통신합니다.
 */

const api = {
  // This is an authenticated operator surface, not a public API client.
  baseUrl: '/api/card-studio/admin',
  publicBaseUrl: '/api/card-studio',
  csrfCookieName: 'athletetime_csrf',

  readCookie(name) {
    const prefix = `${name}=`;
    const entry = document.cookie.split('; ').find((value) => value.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  },

  async request(method, path, body = null, options = {}) {
    const { baseUrl = this.baseUrl, authenticated = true } = options;
    const requestOptions = {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    };
    if (authenticated && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = this.readCookie(this.csrfCookieName);
      if (csrfToken) requestOptions.headers['X-CSRF-Token'] = csrfToken;
    }
    if (body) requestOptions.body = JSON.stringify(body);

    try {
      const res = await fetch(`${baseUrl}${path}`, requestOptions);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (error) {
      console.error(`API 오류 [${method} ${path}]:`, error);
      throw error;
    }
  },

  get(path) { return this.request('GET', path); },
  getPublic(path) {
    return this.request('GET', path, null, {
      baseUrl: this.publicBaseUrl,
      authenticated: false,
    });
  },
  post(path, body) { return this.request('POST', path, body); },
  del(path) { return this.request('DELETE', path); },

  // 시스템
  getStatus() { return this.get('/status'); },

  // 갤러리
  getGallery(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/gallery${qs ? '?' + qs : ''}`);
  },
  deleteImage(filename) { return this.del(`/gallery/${encodeURIComponent(filename)}`); },

  // 파이프라인
  getPipelineStatus() { return this.get('/pipeline/status'); },
  getPipelineHistory(limit = 20) { return this.get(`/pipeline/history?limit=${limit}`); },
  runPipeline(options) { return this.post('/pipeline/run', options); },

  // 감시
  getWatcherStatus() { return this.get('/watcher/status'); },
  getWatcherLogs(limit = 50) { return this.get(`/watcher/logs?limit=${limit}`); },
  startWatcher(options) { return this.post('/watcher/start', options); },
  stopWatcher() { return this.post('/watcher/stop'); },
  scanOnce() { return this.post('/watcher/scan'); },
  resetWatcher() { return this.post('/watcher/reset'); },
};
