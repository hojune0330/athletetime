/**
 * 상태 패널 컴포넌트
 */

const statusPanel = {
  update(data) {
    if (!data) return;

    const { system, pipeline, watcher, gallery, wsClients } = data;

    // 서버 상태
    const serverEl = document.getElementById('stat-server');
    if (serverEl && system) {
      serverEl.textContent = system.system?.status === 'running' ? '정상' : '오류';
      serverEl.className = 'stat-card__value ' + (system.system?.status === 'running' ? 'stat--ok' : 'stat--error');
    }

    // 파이프라인
    const pipelineEl = document.getElementById('stat-pipeline');
    if (pipelineEl && pipeline) {
      pipelineEl.textContent = pipeline.isRunning ? '실행 중' : '대기';
      pipelineEl.className = 'stat-card__value ' + (pipeline.isRunning ? 'stat--warn' : '');
    }

    // 감시
    const watcherEl = document.getElementById('stat-watcher');
    if (watcherEl && watcher) {
      const statusMap = {
        'idle': '대기', 'scanning': '스캔 중', 'watching': '감시 중',
        'stopped': '중지', 'error': '오류'
      };
      watcherEl.textContent = statusMap[watcher.status] || watcher.status;
      watcherEl.className = 'stat-card__value ' +
        (watcher.status === 'watching' ? 'stat--ok' :
         watcher.status === 'error' ? 'stat--error' : '');
    }

    // 이미지 수
    const imagesEl = document.getElementById('stat-images');
    if (imagesEl && gallery) {
      imagesEl.textContent = gallery.totalImages || 0;
    }

    // 메모리
    const memoryEl = document.getElementById('stat-memory');
    if (memoryEl && system?.system?.memory) {
      memoryEl.textContent = `${system.system.memory.used}MB`;
    }

    // WS 클라이언트
    const wsEl = document.getElementById('stat-ws');
    if (wsEl) {
      wsEl.textContent = wsClients || 0;
    }

  },
};
