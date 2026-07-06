/**
 * API 클라이언트
 * 서버 REST API와 통신합니다.
 */

const api = {
  baseUrl: '',

  async request(method, path, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (error) {
      console.error(`API 오류 [${method} ${path}]:`, error);
      throw error;
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  del(path) { return this.request('DELETE', path); },

  // 시스템
  getStatus() { return this.get('/api/status'); },

  // 갤러리
  getGallery(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/api/gallery${qs ? '?' + qs : ''}`);
  },
  deleteImage(filename) { return this.del(`/api/gallery/${encodeURIComponent(filename)}`); },

  // 파이프라인
  getPipelineStatus() { return this.get('/api/pipeline/status'); },
  getPipelineHistory(limit = 20) { return this.get(`/api/pipeline/history?limit=${limit}`); },
  runPipeline(options) { return this.post('/api/pipeline/run', options); },

  // 감시
  getWatcherStatus() { return this.get('/api/watcher/status'); },
  getWatcherLogs(limit = 50) { return this.get(`/api/watcher/logs?limit=${limit}`); },
  startWatcher(options) { return this.post('/api/watcher/start', options); },
  stopWatcher() { return this.post('/api/watcher/stop'); },
  scanOnce() { return this.post('/api/watcher/scan'); },
  resetWatcher() { return this.post('/api/watcher/reset'); },
};
