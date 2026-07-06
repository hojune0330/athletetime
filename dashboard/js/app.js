/**
 * 대시보드 메인 앱
 *
 * WebSocket 연결, 주기적 상태 갱신, UI 이벤트를 관리합니다.
 */

const app = {
  ws: null,
  wsReconnectTimer: null,
  statusTimer: null,

  // ============================================
  // 초기화
  // ============================================

  init() {
    controlPanel.init();
    search.init();
    this.connectWebSocket();
    this.refreshStatus();
    this.loadGallery();

    // 30초마다 상태 갱신
    this.statusTimer = setInterval(() => this.refreshStatus(), 30000);

    activityLog.add('info', '대시보드가 초기화되었습니다.');
  },

  // ============================================
  // 탭 전환
  // ============================================

  switchTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-nav__btn').forEach(btn => {
      btn.classList.toggle('tab-nav__btn--active', btn.dataset.tab === tabName);
    });

    // 탭 콘텐츠 전환
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('tab-content--active', content.id === `tab-${tabName}`);
    });

    // 검색 탭 열릴 때 입력 포커스
    if (tabName === 'search') {
      const input = document.getElementById('search-input');
      if (input) setTimeout(() => input.focus(), 100);
    }
  },

  // ============================================
  // WebSocket
  // ============================================

  connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const badge = document.getElementById('ws-status');
        if (badge) {
          badge.textContent = '온라인';
          badge.className = 'badge badge--online';
        }
        activityLog.add('success', 'WebSocket 연결 성공');
      };

      this.ws.onclose = () => {
        const badge = document.getElementById('ws-status');
        if (badge) {
          badge.textContent = '오프라인';
          badge.className = 'badge badge--offline';
        }
        activityLog.add('warning', 'WebSocket 연결 끊김 — 5초 후 재연결');
        this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
      };

      this.ws.onerror = () => {
        activityLog.add('error', 'WebSocket 오류 발생');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleWSMessage(msg);
        } catch (e) {
          console.error('WS 메시지 파싱 실패:', e);
        }
      };
    } catch (error) {
      activityLog.add('error', 'WebSocket 연결 실패: ' + error.message);
    }
  },

  handleWSMessage(msg) {
    switch (msg.type) {
      case 'connected':
        activityLog.add('info', msg.payload.message);
        break;

      case 'pipelineStatus':
        if (msg.payload.status === 'running') {
          controlPanel.setRunning(true);
          activityLog.add('info', '파이프라인 실행 시작');
        } else if (msg.payload.status === 'completed') {
          controlPanel.setRunning(false);
          activityLog.add('success', '파이프라인 실행 완료');
          this.loadGallery();
          this.refreshStatus();
        } else if (msg.payload.status === 'failed') {
          controlPanel.setRunning(false);
          activityLog.add('error', '파이프라인 실행 실패: ' + (msg.payload.error || ''));
        }
        break;

      case 'pipelineLog':
        activityLog.add('info', msg.payload.message);
        break;

      case 'watcherLog':
        activityLog.add('info', '[감시] ' + msg.payload.message);
        break;

      case 'newResult':
        activityLog.add('new', `[${msg.payload.type === 'new' ? '신규' : '업데이트'}] ${msg.payload.event}`);
        this.refreshStatus();
        break;

      case 'watcherStatus':
        activityLog.add('info', `[감시 상태] ${msg.payload.status}: ${msg.payload.message}`);
        this.refreshStatus();
        break;

      case 'watcherError':
        activityLog.add('error', '[감시 오류] ' + msg.payload.message);
        break;

      case 'galleryUpdate':
        this.loadGallery();
        break;

      default:
        break;
    }
  },

  // ============================================
  // 상태 갱신
  // ============================================

  async refreshStatus() {
    try {
      const result = await api.getStatus();
      if (result.success) {
        statusPanel.update(result.data);
      }
    } catch (error) {
      console.error('상태 갱신 실패:', error);
    }
  },

  // ============================================
  // 파이프라인
  // ============================================

  async runPipeline() {
    try {
      const options = controlPanel.getPipelineOptions();
      if (options.mode === 'url' && !options.url) {
        activityLog.add('warning', 'URL을 입력해주세요.');
        return;
      }
      if (options.mode === 'input' && !options.input) {
        activityLog.add('warning', '실제 JSON 파일 또는 디렉토리를 입력해주세요.');
        return;
      }
      controlPanel.setRunning(true);
      activityLog.add('info', `파이프라인 실행 요청 (모드: ${options.mode})`);
      await api.runPipeline(options);
    } catch (error) {
      controlPanel.setRunning(false);
      activityLog.add('error', '파이프라인 실행 요청 실패: ' + error.message);
    }
  },

  // ============================================
  // 감시
  // ============================================

  async startWatcher() {
    try {
      const options = controlPanel.getWatcherOptions();
      if (!options.url) {
        activityLog.add('warning', '감시 URL을 입력해주세요.');
        return;
      }
      activityLog.add('info', `감시 시작 요청 (주기: ${options.interval}초)`);
      await api.startWatcher(options);
      activityLog.add('success', '감시가 시작되었습니다.');
      this.refreshStatus();
    } catch (error) {
      activityLog.add('error', '감시 시작 실패: ' + error.message);
    }
  },

  async stopWatcher() {
    try {
      await api.stopWatcher();
      activityLog.add('info', '감시가 중지되었습니다.');
      this.refreshStatus();
    } catch (error) {
      activityLog.add('error', '감시 중지 실패: ' + error.message);
    }
  },

  async scanOnce() {
    try {
      activityLog.add('info', '수동 1회 스캔 요청...');
      const result = await api.scanOnce();
      if (result.success) {
        activityLog.add('success', `스캔 완료 — 신규: ${result.data.newCount}, 업데이트: ${result.data.updatedCount}`);
      }
      this.refreshStatus();
    } catch (error) {
      activityLog.add('error', '스캔 실패: ' + error.message);
    }
  },

  async resetWatcher() {
    if (!confirm('감시 데이터를 초기화하시겠습니까?')) return;
    try {
      await api.resetWatcher();
      activityLog.add('info', '감시 데이터가 초기화되었습니다.');
      this.refreshStatus();
    } catch (error) {
      activityLog.add('error', '초기화 실패: ' + error.message);
    }
  },

  // ============================================
  // 갤러리
  // ============================================

  loadGallery() {
    gallery.load();
  },

  // ============================================
  // 이미지 오버레이
  // ============================================

  openOverlay(imagePath, filename) {
    imageOverlay.open(imagePath, filename);
  },

  closeOverlay(event) {
    imageOverlay.close(event);
  },

  // ============================================
  // 로그
  // ============================================

  clearLogs() {
    activityLog.clear();
  },
};

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
